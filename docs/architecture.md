# 系统架构

## 核心模型

推荐引擎是价值交付的出口，但它依赖三个输入：

```
菜谱库（内容）
    +
用户偏好（显式：口味档案 / 隐式：行为反推）
    +
行为记录（接受、拒绝、已吃、跳过）
    ↓
推荐引擎
    ↓
今日推荐 / 周计划
    ↓
用户交互 → 产生新的行为数据 → 反哺推荐
```

三个输入缺任何一个，推荐质量都会大打折扣。
**数据 + 推荐的闭环才是真正的核心。**

---

## 技术架构

```
┌─────────────────────────────────────────────┐
│             Frontend（React SPA）            │
│  首页推荐 | 周计划 | 菜谱详情 | 买菜清单     │
│  口味档案 | 自建菜谱 | 家庭管理              │
└─────────────────┬───────────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────────┐
│          API Layer（Hono / CF Worker）       │
│                                             │
│  /api/recommend   推荐引擎入口              │
│  /api/recipes     菜谱 CRUD                 │
│  /api/plans       周计划管理                │
│  /api/shopping    买菜清单                  │
│  /api/enums       枚举配置                  │
│  /api/families    家庭 & 成员管理           │
│  /api/events      行为事件上报              │
└──────┬──────────────────────┬───────────────┘
       │                      │
┌──────▼──────┐     ┌─────────▼──────────────┐
│  Cloudflare │     │    推荐引擎（Worker）   │
│     D1      │     │                        │
│  （主数据库）│     │  1. Filter  过滤不可用  │
└─────────────┘     │  2. Score   多维度打分  │
                    │  3. Select  组合最优解  │
┌─────────────┐     └────────────────────────┘
│  Cloudflare │
│     R2      │  图片存储（菜谱图 / 步骤图）
└─────────────┘
```

---

## 数据库表设计

### 菜谱相关

```
recipes              主表：基础信息 + 所有标签字段
recipe_ingredients   食材列表（recipe_id, name, amount, category）
recipe_steps         烹饪步骤（recipe_id, order, description, images）
```

### 用户 & 家庭

```
users                用户账号（id, name, avatar, created_at）
families             家庭（id, name, created_by）
family_members       家庭成员（family_id, user_id, role: owner/member）
user_preferences     显式偏好（user_id, type: like/dislike, target_type, target_value）
user_enum_configs    用户自定义枚举值
```

### 计划 & 记录

```
weekly_plans         周计划（id, family_id, week_start_date）
weekly_plan_items    计划明细（plan_id, date, meal_type, recipe_id）
meal_logs            实际饮食记录（family_id, date, meal_type, recipe_id, eaten_at）
```

### 推荐学习

```
recommendation_events  推荐行为事件
  - family_id
  - recipe_id
  - event_type: shown / accepted / rejected / swapped / cooked
  - context: meal_type, date
  - created_at
```

### 其他

```
shopping_lists       买菜清单（plan_id, family_id）
shopping_list_items  清单明细（list_id, ingredient_name, amount, category, checked）
system_enum_configs  系统枚举配置
```

---

## 推荐引擎设计

### 输入
- 家庭口味档案（显式偏好）
- 近 30 天 meal_logs（避免重复）
- recommendation_events（行为权重）
- 当前日期（季节、星期）

### 三步流程

**Step 1 — Filter（硬过滤，不可推荐）**
- 含有用户标注「不吃」的食材
- 近 7 天已吃过的菜（完全排除）
- 当季不合适的菜（夏天不推重口火锅类）

**Step 2 — Score（软评分，0-100）**

| 维度 | 权重 | 说明 |
|------|------|------|
| 口味匹配度 | 30% | 菜的标签与用户喜好标签重合度 |
| 近期多样性 | 25% | 近 14 天同菜系 / 同食材出现频率越高越低分 |
| 行为历史 | 20% | 历史上接受率高的菜加权 |
| 季节适配 | 15% | 当前季节与菜的适合季节匹配 |
| 新鲜度 | 10% | 菜谱库中较新的菜轻微加权（防止永远推老菜） |

**Step 3 — Select（组合优化）**
- 一天三餐要荤素搭配，不能全是同一菜系
- 优先选分数高的，但引入少量随机性（避免每次推一样的）
- 周计划：保证 7 天内主要蛋白质来源不重复

---

## 模块依赖关系

```
菜谱库 ──────────────────────────┐
                                  ↓
用户偏好 ──────────────────→ 推荐引擎 ──→ 今日推荐
                                  ↑          │
行为记录 ←────────────────────────────────── ┘
    │
    ↓
学习模块（定期更新用户偏好权重）

周计划 ──→ 买菜清单（食材聚合）
```

---

## Bot 页面技术设计

### API 端点

```
POST /api/bot/message
  body: { family_id, message: string, context?: { meal_type, date } }
  → { reply: string, cards: RecipeCard[], intent: string, actions: Action[] }
```

### LLM 意图识别

```
System Prompt 固定结构：
1. 限定可识别的 intent 类型
2. 返回严格 JSON：{ intent, params, normalized_input }
3. params 中枚举值必须来自 system_enum_configs + user_enum_configs
```

```
意图类型：
- recommend        → params: { meal_type, constraints[] }
- ingredient_query → params: { ingredients[] }
- preference_update→ params: { action: like/dislike/allergy, target_type, target_value }
- weekly_plan      → params: { week_start_date }
- unknown          → 兜底，返回引导文本
```

### 消息存储

Bot 对话不做长期存储，只保留当次会话上下文（前端维护，不落库）。
用户操作（接受/拒绝/换一个）写入 `recommendation_events`，这是唯一落库的数据。

### 与推荐引擎的关系

```
Bot（自然语言层）
        ↓  意图 + 参数（已归一化）
推荐引擎（结构化计算层）
        ↓  推荐结果
Bot（组装回复 + 卡片）
```

Bot 是推荐引擎的调用方，不替代推荐计算逻辑。

---



菜谱图片和步骤图片存 Cloudflare R2：
- 路径规范：`recipes/{recipe_id}/{index}.jpg`，`recipes/{recipe_id}/steps/{step_order}/{index}.jpg`
- D1 里只存 R2 的 key 或完整 URL
- 上传通过 Worker 生成预签名 URL，前端直传 R2

---

## 技术选型总结

| 层 | 技术 | 原因 |
|----|------|------|
| 前端 | React + Vite | 已有，轻量 |
| API | Hono + CF Worker | Edge 低延迟，D1 同区域 |
| 主数据库 | Cloudflare D1 | 与 Worker 同平台，免运维 |
| 图片存储 | Cloudflare R2 | 与 Worker 同平台，便宜 |
| 推荐计算 | Worker 内计算 | 数据量早期够用，后期可拆出 |
| LLM | Google Gemini Flash | 免费额度充足，中文理解好 |

---

## LLM 层设计

用 Gemini Flash 作为自然语言与结构化数据之间的翻译层，**不参与推荐计算**，只做语义映射。

### 使用场景

| 场景 | 输入 | 输出 |
|------|------|------|
| Onboarding 偏好提取 | "不吃香菜，喜欢川菜那种麻辣的" | `allergies: ['香菜'], liked_cuisines: ['川菜'], liked_flavors: ['麻辣','辣']` |
| 用户菜谱自动打标 | 菜谱标题 + 描述 + 食材 | 完整 enum 标签集合 |
| 忌口语义识别 | "家里有小孩，不能太油腻" | `disliked_flavors: ['香浓'], spicy_max: 0` |
| 食材名称归一化 | "猪五花 / 腩肉 / 五花肉" | 统一为 `五花肉` |

### 调用原则

- **异步处理**：不阻塞主流程，LLM 结果作为建议，用户可以手动修正
- **结果缓存**：相同输入缓存结果，减少重复调用
- **降级兜底**：LLM 不可用时，退回手动选择界面，不影响核心功能
- **Prompt 结构化**：要求 LLM 返回 JSON，字段严格限定在已有 enum 值范围内

### LLM 作为中间件

LLM 不只是一次性的标签提取工具，而是用户输入与推荐引擎之间的**常驻中间件**：

```
用户输入（自然语言）
        ↓
┌───────────────────────────────┐
│         LLM 中间件            │
│                               │
│  1. 归一化                    │
│     "猪五花" → "五花肉"       │
│     "麻麻辣辣" → [麻辣, 辣]  │
│                               │
│  2. 映射到已有 enum 值         │
│     匹配 system_enum_configs   │
│     + user_enum_configs       │
│                               │
│  3. 检测未知值                 │
│     "苗家酸汤" → 不在枚举表   │
│     → 触发 new_enum 事件      │
└──────────┬────────────────────┘
           │
     ┌─────┴──────┐
     ↓            ↓
推荐引擎      user_enum_configs
（使用归一     （写入用户专属
 化后的标签）   新枚举值）
```

### 新枚举值生命周期

```
用户产生新值（如「苗家酸汤」）
    ↓
LLM 识别为未知 → 写入 user_enum_configs
    ↓
推荐引擎用该值做该用户的个性化匹配
    ↓
（运营定期审核）多用户共现的新值 → 晋升 system_enum_configs
```

### 中间件职责边界

| 职责 | 是否属于 LLM 中间件 |
|------|-------------------|
| 自然语言归一化 | ✅ |
| 映射到 enum 标签 | ✅ |
| 发现并上报新 enum 值 | ✅ |
| 推荐计算 / 打分 | ❌（推荐引擎负责） |
| 存储用户偏好 | ❌（API 层负责） |

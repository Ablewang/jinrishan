# 今日膳 PRD

> 版本：v0.1 | 状态：设计阶段

---

## 一、产品概述

### 定位

今日膳是**家庭膳食决策助手**——在你家人喜欢的菜里帮你做选择，顺带解决买菜和做法的问题。

核心差异：**主动推荐（push）而非被动搜索（pull）**。

- 下厨房 / 美食天下解决的是：我知道想吃什么，但不知道怎么做
- 今日膳解决的是更前一步：**我不知道该吃什么**

### 核心价值主张

1. **帮你做决定**，不是给你更多选项
2. 越用越懂你——行为数据驱动推荐质量自我迭代
3. 家庭共用，多成员偏好合理聚合

---

## 二、目标用户

### 主要用户：家庭膳食决策者

负责每天做饭的那个人。核心痛点：

| 痛点 | 频率 | 严重程度 |
|------|------|---------|
| 每天不知道吃什么 | 每日 | 高 |
| 老是重复那几道菜 | 每周 | 中 |
| 不知道家人喜不喜欢 | 每次 | 中 |
| 买菜没计划、容易浪费或缺货 | 每周 | 中 |

画像特征：
- 知道家人口味和忌口
- 会做的菜有限（20-30 道），容易陷入循环
- 没时间研究复杂食谱，但也不想将就
- 每天下午就开始焦虑"今晚吃什么"

### 次要用户：家庭其他成员

消费推荐结果（查看本周菜单、表达意见），不是主要操作者。

---

## 三、功能范围

### P0 — MVP（验证核心价值）

**目标：首次打开 30 秒内看到推荐，不强制注册**

| 功能 | 描述 | 验收标准 |
|------|------|---------|
| 游客模式 | 选几个口味标签 → 立刻看到推荐，无需注册 | 从打开到看到推荐 < 60 秒 |
| 注册转化引导 | 推荐后提示「注册可建立家庭档案，越用越准」 | 转化入口自然，不打断体验 |
| 用户注册登录 | 手机号 + OTP，注册时带入游客偏好 | 注册全程 < 30 秒，偏好不丢失 |
| 家庭创建与加入 | 创建家庭、邀请码加入 | 6 位邀请码，即时生效 |
| Onboarding 偏好建立 | 卡片滑动（喜欢/不吃/跳过）+ 过敏禁忌设置 | 注册后可选完善，不强制 |
| 今日推荐 | 基于档案推三餐，可换一换 | 每次换一换给出不同的菜 |
| 菜谱详情 | 食材列表 + 分步骤图文 | 步骤清晰，食材用量明确 |
| 行为记录 | 接受 / 拒绝 / 已吃 事件上报 | 事件落库，影响下次推荐 |

**游客与登录用户的功能差异：**

| 功能 | 游客 | 登录用户 |
|------|------|---------|
| 今日推荐 | ✅（基于临时标签，质量有限） | ✅（基于完整档案） |
| 菜谱详情 | ✅ | ✅ |
| 换一换 | ✅（有次数限制，用完引导注册） | ✅ 无限制 |
| 行为记录 | 仅本地缓存 | 落库，长期学习 |
| 家庭管理 | ❌ | ✅ |
| 周计划 | ❌ | ✅ |
| 买菜清单 | ❌ | ✅ |
| Bot 页面 | ❌ | ✅ |

### P1 — 习惯养成

| 功能 | 描述 |
|------|------|
| 周计划 | 系统预填七天菜单，支持手动调整 |
| 买菜清单 | 从周计划自动生成，按品类分组，可勾选 |
| 快捷模式 | "今天懒了"（过滤 >20 分钟的菜）/ "今天有客人"（提升菜品档次权重） |
| Bot 页面 | 自然语言对话入口，调用推荐引擎，操作反哺偏好 |

### P2 — 差异化与留存

| 功能 | 描述 |
|------|------|
| 以食材找菜谱 | 输入冰箱现有食材，推能做的菜 |
| 家庭协作 | 成员可对推荐点赞 / 反对，影响当周计划 |
| 历史记录 | 查看过去 30 天吃了什么 |
| 季节感知 | 自动推应季菜，夏季降权重口热菜 |
| 用户自建菜谱 | 录入私房菜，优先进入家庭推荐池 |

### P3 — 商业化探索

| 功能 | 描述 |
|------|------|
| 一键购物 | 买菜清单对接美团买菜 / 叮咚买菜 |
| 高级版 | 多家庭管理、无限历史、详细统计 |

### 明确不做

- 卡路里精确计算（用户不需要精确数字）
- UGC 菜谱社区（不是内容平台）
- 餐厅 / 外卖推荐（先聚焦家庭做饭场景）

---

## 四、用户流程

### 4.1 首次打开流程（目标：60 秒内看到推荐）

```
打开 App
  ↓
快速口味选择（无需注册）

  Step 1：有没有绝对不吃的？
    → 常见过敏原快速多选：花生 / 海鲜 / 香菜 / 羊肉 / 乳制品...
    → 可跳过（跳过 = 无禁忌）

  Step 2：喜欢什么口味？
    → 标签多选：咸鲜 / 清淡 / 麻辣 / 酸甜 / 香浓...（约 10 秒）

  ↓
立刻看到推荐（游客模式）

  [推荐卡片展示]
  底部提示：「注册后建立家庭档案，推荐越用越准 →」
  
  用户可以：
  - 换一换（前 3 次无限制，之后引导注册）
  - 查看菜谱详情
  - 点击注册引导进入注册流程
```

### 4.2 注册 & 偏好迁移（目标：30 秒完成）

```
手机号 → OTP 验证 → 填写昵称（可跳过）
  ↓
系统自动带入游客选择的标签作为初始偏好
  ↓
可选：完善偏好档案（卡片滑动，约 20 张）
  可全部跳过，之后在设置里补充
  ↓
创建或加入家庭（可跳过，后补）
  ↓
进入完整版推荐
```

**关键原则：**
- 首次流程的 Step 1（禁忌）可跳过——游客模式下不是安全问题，注册后再强调
- 标签选择不超过 2 步，不滑卡片，只选标签（游客耐心有限）
- 注册引导不打断推荐体验，以底部 banner 或第一次「换一换」触达为主
- 游客标签在注册时静默迁移，用户无感知

### 4.3 每日使用（目标：30 秒决策）

```
17:00 推送通知：「今晚吃什么？」
  → 打开看到今日推荐（默认展示晚餐）
  → 不喜欢 → 换一个（系统给备选，旧的标记 rejected）
  → 满意 → 进入菜谱详情
  → 做完 → 标记已吃（记录 meal_log，影响下次多样性）
```

### 4.3 周计划流程（目标：5 分钟，每周一次）

```
周末打开周计划页
  → 系统已根据家庭偏好预填 7 天菜单
  → 拖拽替换不满意的菜
  → 点击确认 → 生成买菜清单
  → 清单按品类分组（肉类 / 蔬菜 / 调料），去超市对照勾选
```

### 4.4 Bot 对话流程

```
打开 Bot 页
  → 输入：「今晚有点累，想吃清淡的」
  → Bot：LLM 识别意图（recommend，constraint: 清淡）
       → 调用推荐引擎（增加清淡权重）
       → 返回 3 道菜的交互卡片
  → 点击「加入今晚」→ 写入 recommendation_events(accepted)
  → 点击「换一个」→ 写入 recommendation_events(rejected)，返回新推荐
```

---

## 五、数据模型

### 5.1 菜谱（Recipe）

```ts
type Recipe = {
  id: number
  name: string                  // 红烧肉
  description: string
  images: string[]              // R2 存储的 key 列表，多张

  // 分类维度
  cuisine: string               // 枚举：家常 / 川菜 / 粤菜 / ...
  category: string              // 枚举：主菜 / 素菜 / 汤羹 / 主食 / 小吃 / 早餐点心
  meal_types: string[]          // 枚举：早餐 / 午餐 / 晚餐

  // 食材维度
  ingredients: Ingredient[]
  main_ingredient: string       // 猪肉 / 鸡肉 / 豆腐 / 时蔬
  protein_type: string          // 枚举：猪肉 / 鱼类 / 蛋奶 / 纯素 / ...

  // 口味维度
  flavors: string[]             // 枚举：咸鲜 / 麻辣 / 清淡 / 酸甜 / ...
  spicy_level: 0 | 1 | 2 | 3   // 不辣 / 微辣 / 中辣 / 重辣

  // 烹饪维度
  cooking_method: string        // 枚举：爆炒 / 红烧 / 清蒸 / 炖煮 / ...
  prep_time: number             // 备料时间（分钟）
  cook_time: number             // 烹饪时间（分钟）
  difficulty: 'easy' | 'medium' | 'hard'

  // 步骤
  steps: Step[]

  // 营养 & 季节
  nutrition_tags: string[]      // 枚举：高蛋白 / 低脂 / 补钙 / 粗粮 / 少油少盐
  season: string[]              // 枚举：春 / 夏 / 秋 / 冬 / 全年

  // 来源
  source: 'system' | 'user'
  created_by?: number           // user_id，用户自建菜谱时有值
  created_at: string
}

type Ingredient = {
  name: string      // 五花肉（LLM 归一化后的标准名）
  amount: string    // 500g
  category: string  // 肉类 / 蔬菜 / 调料 / 主食
}

type Step = {
  order: number
  description: string
  images: string[]  // 步骤配图，多张，R2 key 列表
  duration?: number // 这一步耗时（分钟）
}
```

### 5.2 用户与家庭

```ts
type User = {
  id: number
  phone: string
  name: string
  avatar?: string
  created_at: string
}

type Family = {
  id: number
  name: string          // 「王家厨房」
  invite_code: string   // 6 位邀请码
  created_by: number
  created_at: string
}

type FamilyMember = {
  id: number
  family_id: number
  user_id: number
  nickname: string      // 在家庭里的称呼：「妈妈」「老公」
  role: 'owner' | 'member'
  joined_at: string
}
```

### 5.3 偏好档案

```ts
type MemberPreference = {
  member_id: number
  // 喜好（正向加权）
  liked_cuisines: string[]
  liked_flavors: string[]
  liked_ingredients: string[]
  // 忌口（软排除，降权偶尔推）
  disliked_cuisines: string[]
  disliked_flavors: string[]
  disliked_ingredients: string[]
  // 过敏/禁忌（硬排除，永不出现）
  allergies: string[]
}
```

### 5.4 计划与记录

```ts
type WeeklyPlan = {
  id: number
  family_id: number
  week_start_date: string   // ISO date，周一
  status: 'draft' | 'confirmed'
  created_at: string
}

type WeeklyPlanItem = {
  id: number
  plan_id: number
  date: string              // ISO date
  meal_type: 'breakfast' | 'lunch' | 'dinner'
  recipe_id: number
}

type MealLog = {
  id: number
  family_id: number
  date: string
  meal_type: string
  recipe_id: number
  eaten_at: string
}
```

### 5.5 推荐事件

```ts
type RecommendationEvent = {
  id: number
  family_id: number
  recipe_id: number
  event_type: 'shown' | 'accepted' | 'rejected' | 'swapped' | 'cooked'
  context: {
    meal_type: string
    date: string
    source: 'daily' | 'weekly_plan' | 'bot'  // 来源
  }
  created_at: string
}
```

### 5.6 枚举配置

```ts
type SystemEnumConfig = {
  id: number
  type: EnumType   // cuisine / category / meal_type / protein_type / flavor / cooking_method / nutrition_tag / season
  value: string
  sort_order: number
  is_active: boolean
}

type UserEnumConfig = {
  id: number
  user_id: number
  type: EnumType
  value: string    // 用户自定义值，如「云南菜」
}
```

### 5.7 购物清单

```ts
type ShoppingList = {
  id: number
  plan_id: number
  family_id: number
  created_at: string
}

type ShoppingListItem = {
  id: number
  list_id: number
  ingredient_name: string
  amount: string
  category: string   // 肉类 / 蔬菜 / 调料 / 主食
  checked: boolean
}
```

---

## 六、数据库表结构（Cloudflare D1 / SQLite）

```sql
-- 菜谱
CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  images TEXT,               -- JSON array of R2 keys
  cuisine TEXT,
  category TEXT,
  meal_types TEXT,           -- JSON array
  main_ingredient TEXT,
  protein_type TEXT,
  flavors TEXT,              -- JSON array
  spicy_level INTEGER DEFAULT 0,
  cooking_method TEXT,
  prep_time INTEGER,
  cook_time INTEGER,
  difficulty TEXT DEFAULT 'easy',
  nutrition_tags TEXT,       -- JSON array
  season TEXT,               -- JSON array
  source TEXT DEFAULT 'system',
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE recipe_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  amount TEXT,
  category TEXT,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE TABLE recipe_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL,
  step_order INTEGER NOT NULL,
  description TEXT NOT NULL,
  images TEXT,               -- JSON array of R2 keys
  duration INTEGER,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- 用户 & 家庭
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE families (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  nickname TEXT,
  role TEXT DEFAULT 'member',
  joined_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (family_id, user_id)
);

-- 偏好
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  pref_type TEXT NOT NULL,   -- liked / disliked / allergy
  target_type TEXT NOT NULL, -- cuisine / flavor / ingredient
  target_value TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES family_members(id)
);

-- 计划 & 记录
CREATE TABLE weekly_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  week_start_date TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id)
);

CREATE TABLE weekly_plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  recipe_id INTEGER NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

CREATE TABLE meal_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL,
  recipe_id INTEGER NOT NULL,
  eaten_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- 推荐事件
CREATE TABLE recommendation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  recipe_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,  -- shown / accepted / rejected / swapped / cooked
  meal_type TEXT,
  event_date TEXT,
  source TEXT DEFAULT 'daily', -- daily / weekly_plan / bot
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (family_id) REFERENCES families(id),
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- 购物清单
CREATE TABLE shopping_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER,
  family_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES weekly_plans(id),
  FOREIGN KEY (family_id) REFERENCES families(id)
);

CREATE TABLE shopping_list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  list_id INTEGER NOT NULL,
  ingredient_name TEXT NOT NULL,
  amount TEXT,
  category TEXT,
  checked INTEGER DEFAULT 0,
  FOREIGN KEY (list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
);

-- 枚举配置
CREATE TABLE system_enum_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  UNIQUE (type, value)
);

CREATE TABLE user_enum_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (user_id, type, value)
);
```

---

## 七、API 设计

### 基础约定

- Base URL: `https://api.jinrishan.95sang.cn`（生产）/ `http://localhost:8787`（本地）
- 鉴权：`Authorization: Bearer <token>`（JWT，登录后颁发）
- 响应格式：`{ data, error? }`

### 认证

```
POST /api/auth/send-otp        { phone }
POST /api/auth/verify-otp      { phone, code } → { token, user }
POST /api/auth/refresh         { refresh_token } → { token }
```

### 家庭管理

```
POST   /api/families                    创建家庭
GET    /api/families/:id                获取家庭信息
POST   /api/families/join               { invite_code } 加入家庭
GET    /api/families/:id/members        成员列表
DELETE /api/families/:id/members/:uid   移除成员
```

### 偏好管理

```
GET    /api/families/:fid/members/:mid/preferences    获取成员偏好
PUT    /api/families/:fid/members/:mid/preferences    更新成员偏好（全量覆盖）
PATCH  /api/families/:fid/members/:mid/preferences    增量更新（单条）
```

### 推荐

```
GET  /api/recommend
  query: family_id, date, meal_type?
  → { recommendations: Recipe[] }

POST /api/recommend/refresh
  body: { family_id, date, meal_type, exclude_ids[] }
  → { recipe: Recipe }  换一个
```

### 菜谱

```
GET    /api/recipes               列表（支持过滤：cuisine, category, keyword）
GET    /api/recipes/:id           详情（含食材、步骤）
POST   /api/recipes               创建（用户自建菜谱）
PUT    /api/recipes/:id           更新
DELETE /api/recipes/:id           删除（仅自建）

POST   /api/recipes/search-by-ingredients
  body: { ingredients: string[] }
  → { recipes: Recipe[] }
```

### 周计划

```
GET    /api/plans?family_id=&week=    获取指定周计划
POST   /api/plans                     生成新周计划（草稿）
PUT    /api/plans/:id/items/:itemId   替换某餐
POST   /api/plans/:id/confirm         确认周计划
```

### 买菜清单

```
POST /api/shopping           { plan_id } 从周计划生成清单
GET  /api/shopping/:id       获取清单
PUT  /api/shopping/:id/items/:itemId   { checked: bool } 勾选
```

### 行为事件

```
POST /api/events
  body: { family_id, recipe_id, event_type, meal_type, date, source }
```

### 枚举

```
GET /api/enums/:type          合并系统值 + 用户自定义值
POST /api/enums/user          新增用户自定义枚举值
```

### Bot

```
POST /api/bot/message
  body: { family_id, message: string, context?: { meal_type, date } }
  → { reply: string, intent: string, cards: RecipeCard[], actions: Action[] }
```

### 图片上传

```
POST /api/upload/presign
  body: { recipe_id, type: 'cover' | 'step', step_order? }
  → { upload_url: string, key: string }
  （前端拿到预签名 URL 后直传 R2）
```

---

## 八、推荐引擎设计

### 输入

- 家庭所有成员的偏好档案（过敏 / 忌口 / 喜好）
- 近 30 天 `meal_logs`（避免重复）
- `recommendation_events`（行为权重）
- 当前日期（季节、星期几）

### 三步流程

**Step 1 — Filter（硬过滤）**

以下菜直接排除，不参与打分：
- 含有任意成员 `allergies` 中食材的菜
- 近 7 天已在 `meal_logs` 中出现的菜
- 家庭有儿童成员时：`spicy_level > 1` 的菜

**Step 2 — Score（0-100 分）**

| 维度 | 权重 | 计算逻辑 |
|------|------|---------|
| 口味匹配度 | 30% | 菜的标签（cuisine/flavor/protein_type）与家庭成员喜好标签的重合比例，多成员加权平均 |
| 近期多样性 | 25% | 近 14 天同菜系 / 同主食材出现次数越多，得分越低 |
| 行为历史 | 20% | 历史 accepted 事件权重 +，rejected 事件权重 -，衰减因子随时间降低影响 |
| 季节适配 | 15% | 当前季节与菜谱 `season` 字段匹配则满分，不匹配按差距给分 |
| 新鲜度 | 10% | 菜谱入库时间越近，轻微加分（防止老菜独占）|

忌口惩罚（非过滤）：含有任意成员 `disliked_*` 的菜，分数乘以 0.5 系数。

**Step 3 — Select（组合优化）**

- 单日三餐：荤素搭配（不能全是肉菜），不能全是同一菜系
- 分数最高的菜优先，但引入 10-15% 随机扰动（避免永远推同几道）
- 周计划：7 天内主要蛋白质来源（protein_type）不重复

### 多成员偏好聚合规则

| 规则类型 | 场景 | 处理 |
|----------|------|------|
| 硬规则 | 任意成员有过敏 | 含该食材的菜永远过滤 |
| 硬规则 | 成员含儿童 | spicy_level > 1 的菜过滤 |
| 软规则 | 多人都喜欢某标签 | 该标签在口味匹配维度高权重 |
| 软规则 | 成员偏好冲突 | 加权平均，任何人都不完全满足也不完全排斥 |

---

## 九、LLM 中间件设计

### 定位

Gemini Flash 作为自然语言与结构化数据之间的**翻译层**，不参与推荐计算，只做语义映射和归一化。

### 使用场景

| 场景 | 输入 | 输出 |
|------|------|------|
| Onboarding 偏好提取 | "不吃香菜，喜欢麻麻辣辣的" | `{ allergies: ['香菜'], liked_flavors: ['麻辣','辣'] }` |
| 菜谱自动打标 | 菜谱标题 + 描述 + 食材 | 完整 enum 标签集合 |
| 食材名称归一化 | "猪五花 / 腩肉 / 五花肉" | `五花肉` |
| Bot 意图识别 | "今晚想吃清淡的" | `{ intent: 'recommend', params: { flavors: ['清淡'] } }` |

### 调用原则

- **异步处理**：LLM 不阻塞主流程，结果作为建议，用户可手动修正
- **结果缓存**：相同输入（哈希匹配）缓存 24h，减少重复调用
- **降级兜底**：LLM 不可用时退回手动选择界面，核心功能不受影响
- **Prompt 结构化**：要求返回 JSON，字段严格限定在已有 enum 值范围内

### 新枚举值生命周期

```
用户产生新值（如「苗家酸汤」）
    ↓
LLM 识别为未知值 → 写入 user_enum_configs
    ↓
推荐引擎用该值做该用户的个性化匹配
    ↓
（运营定期审核）多用户共现的新值 → 晋升 system_enum_configs
```

---

## 十、Bot 页面设计

### 定位

Bot 不是聊天机器人，是推荐引擎的**自然语言入口**。LLM 理解用户意图并归一化参数，推荐引擎完成计算，结果以对话 + 交互卡片形式呈现。

### 支持的意图类型

| intent | 触发示例 | 处理 |
|--------|----------|------|
| `recommend` | "今晚吃什么" / "帮我推几个清淡的" | 带约束条件调推荐引擎 |
| `ingredient_query` | "家里有土豆和排骨" | 食材匹配 |
| `preference_update` | "最近不想吃川菜了" | 更新 user_preferences |
| `weekly_plan` | "帮我排一下这周的菜" | 生成 weekly_plan 草稿 |
| `unknown` | 其他 | LLM 兜底回复 + 引导 |

### 数据流

```
用户输入
    ↓
LLM 意图识别 → { intent, params（已归一化到 enum 值）}
    ↓
API 路由到对应处理器
    ├─ recommend → 推荐引擎
    ├─ ingredient_query → 食材搜索
    ├─ preference_update → 偏好更新 API
    └─ weekly_plan → 周计划生成
    ↓
组装消息（文本 + 菜谱卡片）
    ↓
用户操作（接受 / 拒绝 / 换一个 / 加入计划）
    ↓
写入 recommendation_events（source: 'bot'）
```

### 菜谱交互卡片字段

```ts
type RecipeCard = {
  recipe_id: number
  name: string
  image: string
  tags: string[]          // cuisine, flavor, cook_time 等摘要
  actions: ('accept' | 'reject' | 'swap' | 'view_detail' | 'add_to_plan')[]
}
```

### 关键原则

- Bot 是补充入口，不替代首页推荐
- 操作优先于文字：卡片操作替代打字
- 每次操作都是训练数据，写入 recommendation_events

---

## 十一、图片存储策略

存储：Cloudflare R2

路径规范：
- 菜谱封面：`recipes/{recipe_id}/cover/{index}.jpg`
- 步骤图：`recipes/{recipe_id}/steps/{step_order}/{index}.jpg`

D1 存储：R2 的 key（不存完整 URL，CDN 域名可变）

上传流程：
```
前端请求 POST /api/upload/presign → 获取预签名 URL
    ↓
前端直传 R2（不经过 Worker，节省流量）
    ↓
上传成功后前端把 key 提交给 API 保存到 D1
```

---

## 十二、技术栈

| 层 | 技术 | 原因 |
|----|------|------|
| 前端 | React + Vite + TypeScript | SPA，Cloudflare Pages 托管 |
| API | Hono + Cloudflare Worker | Edge 低延迟，与 D1 同平台 |
| 主数据库 | Cloudflare D1（SQLite） | 与 Worker 同平台，免运维 |
| 图片存储 | Cloudflare R2 | 与 Worker 同平台，便宜 |
| LLM | Google Gemini Flash | 免费额度充足，中文理解好 |
| 推荐计算 | Worker 内计算 | 早期数据量够，后期可拆出 |
| Monorepo | pnpm workspaces | apps/web + apps/api |
| CI/CD | Cloudflare Pages（web）+ GitHub Actions（api）| 推送 main 自动部署 |

### 本地开发

```bash
pnpm dev          # 同时启动 api(8787) + web(5173，代理 /api 到 8787)
pnpm build        # 构建 web
pnpm run deploy   # 部署 api Worker
```

---

## 十三、系统自我升级路径

| 阶段 | 机制 | 效果 |
|------|------|------|
| 早期 | 记录 accepted/rejected 事件，规则加权 | 个人维度初步学习 |
| 中期 | 协同过滤（相似家庭喜好互相参考） | 冷启动更快 |
| 后期 | AI 理解自然语言反馈、自动打标签 | 用户几乎不需要手动维护 |

**飞轮效应：** 用户越多 → 行为数据越丰富 → 推荐越准 → 更多用户留存

---

## 十四、风险与对策

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| 推荐质量差 → 用户流失 | 高 | 高 | 早期减少菜谱数量，精选质量高的入库；先保证过滤逻辑正确 |
| 习惯养成失败 | 中 | 高 | 每天 17:00 推送通知，降低打开成本 |
| LLM 调用失败 | 低 | 中 | 降级兜底，退回手动选择，核心功能不依赖 LLM |
| 菜谱库太小 | 高（早期） | 中 | 先用脚本生成 100-200 道结构化菜谱，覆盖主要菜系 |
| D1 性能瓶颈 | 低（早期） | 低 | D1 支持 10M 行，早期数据量不到 1%，后期可拆分 |

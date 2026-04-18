# 后端开发指南

技术栈：Hono + Cloudflare Worker + D1（SQLite） + R2

## 项目结构（目标）

```
apps/api/
├── src/
│   ├── index.ts              # 路由注册入口
│   ├── middleware/
│   │   └── auth.ts           # JWT 验证中间件
│   ├── routes/
│   │   ├── auth.ts           # 登录/注册
│   │   ├── enums.ts          # 枚举配置
│   │   ├── recipes.ts        # 菜谱 CRUD
│   │   ├── families.ts       # 家庭管理
│   │   ├── preferences.ts    # 偏好档案
│   │   ├── recommend.ts      # 推荐入口
│   │   ├── events.ts         # 行为事件
│   │   ├── plans.ts          # 周计划
│   │   ├── shopping.ts       # 购物清单
│   │   ├── bot.ts            # Bot 对话
│   │   └── upload.ts         # 图片上传预签名
│   └── lib/
│       ├── recommender.ts    # 推荐引擎核心
│       ├── jwt.ts            # JWT 工具
│       └── llm.ts            # Gemini Flash 调用
├── migrations/
│   ├── 0001_create_todos.sql
│   ├── 0002_create_core_tables.sql
│   ├── 0003_create_recipes.sql
│   └── 0004_create_plans_and_logs.sql
└── wrangler.toml
```

---

## Phase 1 实现细节

### 1.1-1.3 数据库迁移

执行顺序：0002 → 0003 → 0004

本地应用：
```bash
cd apps/api
pnpm db:migrate:local
```

远端应用：
```bash
pnpm db:migrate:remote
```

**0002_create_core_tables.sql** 关键点：
- `families.invite_code` 唯一索引
- `user_preferences` 用 `(member_id, pref_type, target_type, target_value)` 联合唯一约束
- `system_enum_configs` 在此文件末尾 INSERT 初始数据（8 种枚举类型，见 docs/enum-config.md）

**0003_create_recipes.sql** 关键点：
- `recipes` 表中 JSON 数组字段（images/meal_types/flavors/nutrition_tags/season）存为 TEXT
- `recipe_steps.images` 同样存 TEXT（R2 key 数组的 JSON 字符串）

### 1.4 Auth API

开发阶段 OTP 简化处理：
- `send-otp`：将验证码存入 D1 临时表 `otp_codes(phone, code, expires_at)`，**同时在响应里返回 code**（仅 dev 环境）
- `verify-otp`：校验 code + 有效期，通过则颁发 JWT

JWT：
- 使用 Web Crypto API（Worker 原生支持），不需要额外依赖
- payload：`{ sub: user_id, exp: now + 7days }`
- secret 存 wrangler secret：`wrangler secret put JWT_SECRET`

Bindings 更新（wrangler.toml）：
```toml
[vars]
ENV = "development"
```

### 1.5 Auth 中间件

```ts
// src/middleware/auth.ts
export const authMiddleware = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  // 验证 JWT，将 user_id 存入 c.var.userId
  await next()
}
```

### 1.6 枚举 API

`GET /api/enums/:type`：
- 先查 `system_enum_configs WHERE type = ? AND is_active = 1`
- 若请求带 token，追加查 `user_enum_configs WHERE user_id = ? AND type = ?`
- 合并返回，系统值在前

---

## Phase 2 实现细节

### 2.4 推荐引擎 v1

文件：`src/lib/recommender.ts`

```ts
interface RecommendInput {
  familyId: number
  date: string         // YYYY-MM-DD
  mealType: string     // breakfast/lunch/dinner
  excludeIds?: number[]
  db: D1Database
}

export async function recommend(input: RecommendInput): Promise<Recipe[]>
```

**Step 1 Filter**（SQL 层过滤，减少内存压力）：
```sql
-- 过敏食材通过 recipe_ingredients 关联排除
-- 近 7 天 meal_logs 排除
-- 儿童成员时排除 spicy_level > 1
```

**Step 2 Score**（JS 内存计算）：
- 口味匹配（30%）：取家庭所有成员 liked_* 偏好，计算与菜谱标签的 Jaccard 相似度，加权平均
- 近期多样性（25%）：近 14 天同 cuisine/protein_type 出现次数 → 线性惩罚
- 行为历史（20%）：过去 accepted/rejected 事件，按时间衰减（e^(-0.1 * days_ago)）
- 季节（15%）：JSON_EACH 查 season 字段，精确匹配满分
- 新鲜度（10%）：按 recipe.created_at 距今天数线性加权

**Step 3 Select**：
- 按 score 降序排列，引入 ±15% 随机扰动
- 多餐场景：荤素搭配约束（至少 1 道素菜/汤）

### 2.7 图片上传

R2 预签名 URL，需在 wrangler.toml 添加 R2 bucket binding：
```toml
[[r2_buckets]]
binding = "R2"
bucket_name = "jinrishan-media"
```

---

## Phase 3 实现细节

### 3.3 Bot API

依赖：`@google/generative-ai` 或直接用 fetch 调 Gemini REST API

Prompt 结构：
```
System: 你是今日膳的饮食助手。用户输入自然语言，你需要识别意图并返回 JSON。
意图类型：recommend / ingredient_query / preference_update / weekly_plan / unknown
返回格式：{ "intent": "...", "params": { ... } }
params 中的枚举值必须来自以下范围：[动态注入系统枚举值]
```

降级处理：Gemini 不可用时，`intent` 默认为 `recommend`，params 为空，调用基础推荐引擎。

---

## 开发 & 部署命令

```bash
# 本地开发（在 apps/api 目录）
pnpm dev

# 应用本地迁移
pnpm db:migrate:local

# 类型检查
npx tsc --noEmit

# 部署到 Cloudflare
pnpm deploy
```

## Wrangler Bindings 完整清单（最终状态）

```toml
[[d1_databases]]
binding = "DB"
database_name = "jinrishan"
database_id = "522c66b3-b556-418c-9e2b-e8b88ac1905c"

[[r2_buckets]]
binding = "R2"
bucket_name = "jinrishan-media"

[vars]
ENV = "development"

# Secrets（通过 wrangler secret put 设置，不写 toml）
# JWT_SECRET
# GEMINI_API_KEY
```

# 今日膳开发计划

## 当前状态

- monorepo 基础设施已就绪（apps/web + apps/api）
- TodoList PoC 验证了全链路（Cloudflare Pages + Worker + D1）
- PRD / 数据模型 / API 设计 / 推荐引擎设计已完成（见 docs/）

## 开发策略

**前后端并行，以 API contract 为边界。**
- 后端先写 DB migrations，再实现 API
- 前端先 mock 数据开发 UI，后端就绪后联调

详细开发指南：
- [后端开发指南](./backend.md)
- [前端开发指南](./frontend.md)

---

## Phase 1 — 基础设施（约 1 周）

### 后端任务

| # | 任务 | 文件 |
|---|------|------|
| 1.1 | DB 迁移：核心用户表 | `apps/api/migrations/0002_create_core_tables.sql` |
| 1.2 | DB 迁移：菜谱表 | `apps/api/migrations/0003_create_recipes.sql` |
| 1.3 | DB 迁移：计划/记录表 | `apps/api/migrations/0004_create_plans_and_logs.sql` |
| 1.4 | Auth API（OTP + JWT） | `apps/api/src/routes/auth.ts` |
| 1.5 | Auth 中间件 | `apps/api/src/middleware/auth.ts` |
| 1.6 | 枚举 API + seed 数据 | `apps/api/src/routes/enums.ts` |

### 前端任务

| # | 任务 | 文件 |
|---|------|------|
| 1.7 | 清空 TodoList，配置路由骨架 | `apps/web/src/main.tsx` |
| 1.8 | 全局 TypeScript 类型定义 | `apps/web/src/types/index.ts` |
| 1.9 | API client 工具（自动带 token） | `apps/web/src/api/client.ts` |

**验收：** `pnpm dev` 启动，枚举 API `GET /api/enums/cuisine` 返回数据

---

## Phase 2 — P0 核心功能（约 2 周）

### 后端任务

| # | 任务 | 文件 |
|---|------|------|
| 2.1 | 菜谱 CRUD API | `apps/api/src/routes/recipes.ts` |
| 2.2 | 家庭管理 API | `apps/api/src/routes/families.ts` |
| 2.3 | 偏好档案 API | `apps/api/src/routes/preferences.ts` |
| 2.4 | 推荐引擎 v1（Filter→Score→Select） | `apps/api/src/lib/recommender.ts` |
| 2.5 | 推荐 API | `apps/api/src/routes/recommend.ts` |
| 2.6 | 行为事件 API | `apps/api/src/routes/events.ts` |
| 2.7 | 图片上传预签名 API | `apps/api/src/routes/upload.ts` |

### 前端任务

| # | 任务 | 文件 |
|---|------|------|
| 2.8 | 游客口味选择页 | `apps/web/src/pages/Onboarding/GuestSetup.tsx` |
| 2.9 | 推荐首页（卡片 + 换一换） | `apps/web/src/pages/Home/` |
| 2.10 | 菜谱详情页 | `apps/web/src/pages/Recipe/RecipeDetail.tsx` |
| 2.11 | 注册 / 登录页 | `apps/web/src/pages/Auth/` |
| 2.12 | 家庭创建 / 加入页 | `apps/web/src/pages/Family/` |

**验收：**
- 游客路径：选口味 → 看推荐 → 换一换 → 菜谱详情
- 注册路径：OTP 注册 → 家庭创建 → 推荐首页

---

## Phase 3 — P1 习惯养成（约 2 周）

### 后端任务

| # | 任务 | 文件 |
|---|------|------|
| 3.1 | 周计划 API | `apps/api/src/routes/plans.ts` |
| 3.2 | 购物清单 API | `apps/api/src/routes/shopping.ts` |
| 3.3 | Bot API（Gemini Flash） | `apps/api/src/routes/bot.ts` |

### 前端任务

| # | 任务 | 文件 |
|---|------|------|
| 3.4 | 周计划页 | `apps/web/src/pages/WeeklyPlan/` |
| 3.5 | 购物清单页 | `apps/web/src/pages/Shopping/` |
| 3.6 | Bot 对话页 | `apps/web/src/pages/Bot/` |
| 3.7 | 用户设置 / 偏好档案页 | `apps/web/src/pages/Settings/` |

**验收：**
- 周计划生成 → 确认 → 购物清单 → 勾选
- Bot：「今晚吃什么」→ 菜谱卡片 → 接受/拒绝

---

## Phase 4 — P2 差异化（后续排期）

- 以食材找菜谱
- 家庭成员协作（点赞/反对）
- 历史记录页
- 季节感知强化

---

## Phase 5 — 后台管理系统（待规划）

独立的管理后台（可单独部署或集成在 apps/admin）：

- 菜谱管理：新增/编辑/删除菜谱，管理食材和步骤
- 枚举管理：新增/下线系统枚举值，用户自定义枚举审核晋升
- 数据分析：推荐接受率趋势、热门菜谱、用户活跃度
- 用户管理：查看家庭、屏蔽/封禁

技术选型建议：同 monorepo 下 `apps/admin`，React + Vite，通过 API 后端鉴权（管理员角色）

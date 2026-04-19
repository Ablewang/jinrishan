# 今日膳

家庭膳食决策助手——在你喜欢的菜里帮你做选择，顺带解决买菜和做法的问题。

## 项目结构

```
jinrishan/
├── apps/
│   ├── api/       # Cloudflare Workers + Hono，后端 API
│   ├── web/       # React 主应用（用户端）
│   └── admin/     # React 管理后台
```

## 快速启动

### 前置条件

- Node.js 18+
- pnpm 8+
- Wrangler CLI（`pnpm add -g wrangler`）

### 安装依赖

```bash
pnpm install
```

### 初始化本地数据库

```bash
pnpm db:migrate:local
```

### 启动开发服务

**启动主应用（API + Web）：**

```bash
pnpm dev
```

**启动全部服务（API + Web + Admin）：**

```bash
pnpm dev:all
```

| 服务 | 地址 |
|------|------|
| API | http://localhost:8787 |
| Web（用户端） | http://localhost:5173 |
| Admin（管理后台） | http://localhost:5174 |

## 常用命令

```bash
# 开发
pnpm dev              # 启动 API + Web
pnpm dev:all          # 启动 API + Web + Admin

# 构建
pnpm build            # 构建 Web
pnpm build:admin      # 构建 Admin

# 数据库迁移
pnpm db:migrate:local   # 应用本地 D1 迁移
pnpm db:migrate:remote  # 应用远程 D1 迁移

# 部署
pnpm deploy           # 部署 API 到 Cloudflare Workers
```

## 技术栈

- **前端**：React 19 + TypeScript + Vite + React Router v7
- **后端**：Cloudflare Workers + Hono + Cloudflare D1（SQLite）
- **Monorepo**：pnpm workspace

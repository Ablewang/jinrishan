# 前端开发指南

技术栈：React 19 + Vite + TypeScript + react-router-dom

## 双端支持策略

产品需要同时支持 **PC 端** 和 **移动端**，两套布局独立：

- **移动端**：底部导航栏、卡片滑动手势、全屏视图、最大宽度 480px
- **PC 端**：侧边导航栏、双栏布局（左侧导航+右侧内容）、信息密度更高

**实现方式：** 同一套路由，`<Layout>` 组件根据窗口宽度（< 768px 为移动端）渲染不同布局壳子。业务页面代码共用，布局外壳分开。

```
<Layout>               ← 根据屏幕宽度选择布局
  ├── MobileLayout    ← < 768px：底部导航 + 全屏内容
  └── DesktopLayout   ← ≥ 768px：左侧边栏 + 右侧内容
        └── <Outlet>  ← 业务页面（共用同一套）
```

---

## 目标项目结构

```
apps/web/src/
├── main.tsx                        # 路由入口
├── types/
│   └── index.ts                    # 全局类型定义
├── api/
│   ├── client.ts                   # fetch 封装（自动带 token）
│   ├── auth.ts
│   ├── recipes.ts
│   ├── families.ts
│   ├── recommend.ts
│   ├── events.ts
│   ├── plans.ts
│   └── bot.ts
├── store/
│   └── auth.ts                     # 用户状态（localStorage + Context）
├── layouts/
│   ├── Layout.tsx                  # 根布局，路由分发
│   ├── MobileLayout.tsx            # 移动端布局（底部导航）
│   └── DesktopLayout.tsx           # PC 端布局（左侧边栏）
├── pages/
│   ├── Onboarding/
│   │   └── GuestSetup.tsx          # 游客口味选择（首次打开）
│   ├── Auth/
│   │   └── Login.tsx               # 手机号 + OTP 登录/注册
│   ├── Family/
│   │   ├── Create.tsx
│   │   └── Join.tsx
│   ├── Home/
│   │   └── index.tsx               # 今日推荐（主入口）
│   ├── Recipe/
│   │   └── RecipeDetail.tsx
│   ├── WeeklyPlan/
│   │   └── index.tsx
│   ├── Shopping/
│   │   └── index.tsx
│   ├── Bot/
│   │   └── index.tsx
│   └── Settings/
│       └── index.tsx
└── components/
    ├── RecipeCard.tsx               # 菜谱卡片（首页/Bot 共用）
    ├── TagPicker.tsx                # 枚举标签多选（游客设置/偏好档案复用）
    └── GuestBanner.tsx             # 游客注册引导 banner
```

---

## Phase 1 实现细节

### 路由配置（main.tsx）

```tsx
<BrowserRouter>
  <AuthProvider>
    <Routes>
      {/* 首次进入 */}
      <Route path="/onboarding" element={<GuestSetup />} />
      <Route path="/auth/login" element={<Login />} />

      {/* 主应用（游客可访问） */}
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/home" />} />
        <Route path="/home" element={<Home />} />
        <Route path="/recipe/:id" element={<RecipeDetail />} />

        {/* 需要登录 */}
        <Route path="/plan" element={<RequireAuth><WeeklyPlan /></RequireAuth>} />
        <Route path="/shopping/:id" element={<RequireAuth><Shopping /></RequireAuth>} />
        <Route path="/bot" element={<RequireAuth><Bot /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/family/create" element={<RequireAuth><FamilyCreate /></RequireAuth>} />
        <Route path="/family/join" element={<RequireAuth><FamilyJoin /></RequireAuth>} />
      </Route>
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

### 布局切换逻辑（layouts/Layout.tsx）

```tsx
const MOBILE_BREAKPOINT = 768

export default function Layout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile ? <MobileLayout /> : <DesktopLayout />
}
```

### 全局类型（types/index.ts）

与 PRD 数据模型保持一致，关键类型：`Recipe`、`Ingredient`、`Step`、`User`、`Family`、`FamilyMember`、`MemberPreference`、`RecommendationEvent`、`RecipeCard`

### API Client（api/client.ts）

```ts
const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'API Error')
  return data.data ?? data
}
```

---

## Phase 2 实现细节

### 游客状态管理

游客偏好存 `localStorage`：
```ts
interface GuestPrefs {
  allergies: string[]
  liked_flavors: string[]
  swap_count: number   // >= 3 时触发注册引导
}
```

注册成功后，读取偏好调 API 迁移，然后清除本地缓存。

### 双端交互差异

| 功能 | 移动端 | PC 端 |
|------|--------|--------|
| 菜谱卡片布局 | 垂直列表，全宽 | Grid 3列 |
| 换一换 | 卡片右下角按钮 | 卡片 hover 显示 |
| 周计划 | 横向滑动（按天） | 表格视图（7列） |
| Bot 对话 | 全屏对话 | 右侧面板浮层 |

---

## 开发命令

```bash
pnpm dev          # 根目录，同时启动 api(8787) + web(5173)
pnpm build        # 构建 web
```

## 环境变量

`.env.local`：本地开发不需要设置（Vite 代理已转发）

Cloudflare Pages 生产：
```
VITE_API_BASE=https://jinrishan-api.95sang.cn
```

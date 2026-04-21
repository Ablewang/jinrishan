import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ConfigProvider, App as AntApp, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { AdminAuthProvider, useAdminAuth } from './store/auth'
import AdminLayout from './components/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RecipeList from './pages/Recipes/RecipeList'
import EnumManager from './pages/Enums'
import UserList from './pages/Users/UserList'
import FamilyList from './pages/Users/FamilyList'
import Analytics from './pages/Analytics'

function RequireAdmin({ children }: { children: ReactNode }) {
  const { admin, isLoading } = useAdminAuth()
  const location = useLocation()
  if (isLoading) return null
  if (!admin) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/recipes" element={<RecipeList />} />
        <Route path="/enums" element={<EnumManager />} />
        <Route path="/users" element={<UserList />} />
        <Route path="/families" element={<FamilyList />} />
        <Route path="/analytics" element={<Analytics />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#e67e22',
          borderRadius: 6,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <AdminAuthProvider>
            <AppRoutes />
          </AdminAuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './store/auth'
import Layout from './layouts/Layout'
import GuestSetup from './pages/Onboarding/GuestSetup'
import Login from './pages/Auth/Login'
import Home from './pages/Home'
import RecipeDetail from './pages/Recipe/RecipeDetail'
import WeeklyPlan from './pages/WeeklyPlan'
import Shopping from './pages/Shopping'
import Bot from './pages/Bot'
import Settings from './pages/Settings'
import FamilyCreate from './pages/Family/Create'
import FamilyJoin from './pages/Family/Join'
import TodayMeal from './pages/TodayMeal'
import TodayOverview from './pages/TodayMeal/TodayOverview'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  if (isLoading) return null
  if (!user) return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/onboarding" element={<GuestSetup />} />
          <Route path="/auth/login" element={<Login />} />

          <Route element={<Layout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/recipe/:id" element={<RecipeDetail />} />
            <Route path="/today" element={<TodayOverview />} />
            <Route path="/today/:mealType" element={<TodayMeal />} />
            <Route path="/plan" element={<WeeklyPlan />} />
            <Route path="/shopping/:id" element={<RequireAuth><Shopping /></RequireAuth>} />
            <Route path="/bot" element={<Bot />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/family/create" element={<RequireAuth><FamilyCreate /></RequireAuth>} />
            <Route path="/family/join" element={<RequireAuth><FamilyJoin /></RequireAuth>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

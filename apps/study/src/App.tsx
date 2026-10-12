import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import PoemDetail from './pages/PoemDetail'
import ProgressPage from './pages/ProgressPage'
import AchievementsPage from './pages/AchievementsPage'
import QueueScreen from './pages/QueueScreen'
import PoemsScreen from './pages/PoemsScreen'
import ProfilePage from './pages/ProfilePage'
import Onboarding from './pages/Onboarding'
import ShareCardPage from './pages/ShareCardPage'

function isOnboardingDone(): boolean {
  try { return localStorage.getItem('poem_onboarding_done') === '1' } catch { return true }
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  if (!isOnboardingDone()) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<Layout />}>
        <Route path="/" element={<OnboardingGate><Home /></OnboardingGate>} />
        <Route path="/poems" element={<PoemsScreen />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/queue" element={<QueueScreen />} />
        <Route path="/share-card" element={<ShareCardPage />} />
      </Route>
      <Route path="/poem/:id" element={<PoemDetail />} />
    </Routes>
  )
}

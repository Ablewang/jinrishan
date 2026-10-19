import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Home from './pages/Home'
import PoemDetail from './pages/PoemDetail'
import ProgressPage from './pages/ProgressPage'
import AchievementsPage from './pages/AchievementsPage'
import QueueScreen from './pages/QueueScreen'
import PoemsScreen from './pages/PoemsScreen'
import ProfilePage from './pages/ProfilePage'
import Onboarding from './pages/Onboarding'
import WeeklyReportPage from './pages/WeeklyReportPage'
import { ShareCardProvider } from './contexts/ShareCardContext'
import { StorageProvider } from './contexts/StorageContext'
import ShareCardModal from './components/ShareCardModal'
import { storage } from './lib/storage'

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState<boolean | null>(null)

  useEffect(() => {
    storage.get('poem_onboarding_done').then(v => setDone(v === '1'))
  }, [])

  if (done === null) return null
  if (!done) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <StorageProvider>
      <ShareCardProvider>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<Layout />}>
            <Route path="/" element={<OnboardingGate><Home /></OnboardingGate>} />
            <Route path="/poems" element={<PoemsScreen />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/queue" element={<QueueScreen />} />
          </Route>
          <Route path="/poem/:id" element={<PoemDetail />} />
          <Route path="/weekly-report" element={<WeeklyReportPage />} />
        </Routes>
        <ShareCardModal />
      </ShareCardProvider>
    </StorageProvider>
  )
}

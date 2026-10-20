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
import { StorageProvider, useStorage, FADE_DURATION } from './contexts/StorageContext'
import { ProgressProvider, useProgress } from './contexts/ProgressContext'
import ShareCardModal from './components/ShareCardModal'
import SplashScreen from './components/SplashScreen'
import { storage } from './lib/storage'
import { migrateSystemBToA, migrateStreak, migrateToV2 } from './lib/migration'

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState<boolean | null>(null)

  useEffect(() => {
    storage.get('poem_onboarding_done').then(v => setDone(v === '1'))
  }, [])

  if (done === null) return null
  if (!done) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { ready } = useStorage()
  const { initialized } = useProgress()
  const [fadingOut, setFadingOut] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const allReady = ready && initialized

  useEffect(() => {
    if (!allReady) return
    setFadingOut(true)
    const t = setTimeout(() => setShowSplash(false), FADE_DURATION)
    return () => clearTimeout(t)
  }, [allReady])

  return (
    <>
      {allReady && children}
      {showSplash && <SplashScreen fadingOut={fadingOut} />}
    </>
  )
}

export default function App() {
  useEffect(() => {
    migrateSystemBToA()
    migrateStreak()
    migrateToV2()
  }, [])

  return (
    <StorageProvider>
      <ProgressProvider>
        <ShareCardProvider>
          <AppShell>
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
          </AppShell>
        </ShareCardProvider>
      </ProgressProvider>
    </StorageProvider>
  )
}

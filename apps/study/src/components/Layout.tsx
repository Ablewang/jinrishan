import { useRef, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TabBar from '../components/TabBar'
import ProfileSheet, { type ProfileSheetActions } from '../components/ProfileSheet'
import AchievementBanner from '../components/AchievementBanner'
import { checkAndPruneSessions } from '../lib/storageMonitor'
import { migrateSystemBToA } from '../lib/migration'

export default function Layout() {
  const { pathname } = useLocation()
  const showTab = !pathname.startsWith('/poem/')
  const profileRef = useRef<ProfileSheetActions>(null)

  useEffect(() => {
    checkAndPruneSessions(200, 90)
    migrateSystemBToA()
  }, [])

  return (
    <>
      <AchievementBanner />
      <Outlet />
      {showTab && <TabBar onProfileClick={() => profileRef.current?.open()} />}
      <ProfileSheet ref={profileRef} />
    </>
  )
}

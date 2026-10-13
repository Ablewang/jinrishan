import { useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TabBar from '../components/TabBar'
import ProfileSheet, { type ProfileSheetActions } from '../components/ProfileSheet'
import AchievementBanner from '../components/AchievementBanner'

export default function Layout() {
  const { pathname } = useLocation()
  const showTab = !pathname.startsWith('/poem/')
  const profileRef = useRef<ProfileSheetActions>(null)

  return (
    <>
      <div className="ios-status-bar" aria-hidden="true" />
      <AchievementBanner />
      <Outlet />
      {showTab && <TabBar onProfileClick={() => profileRef.current?.open()} />}
      <ProfileSheet ref={profileRef} />
    </>
  )
}

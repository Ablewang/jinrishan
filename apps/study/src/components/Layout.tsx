import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TabBar from '../components/TabBar'
import ProfileSheet from '../components/ProfileSheet'

export default function Layout() {
  const { pathname } = useLocation()
  const showTab = !pathname.startsWith('/poem/')
  const [showProfile, setShowProfile] = useState(false)

  return (
    <>
      <Outlet />
      {showTab && <TabBar onProfileClick={() => setShowProfile(true)} />}
      {showProfile && <ProfileSheet onClose={() => setShowProfile(false)} />}
    </>
  )
}

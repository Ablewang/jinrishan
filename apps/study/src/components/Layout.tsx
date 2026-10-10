import { useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TabBar from '../components/TabBar'
import ProfileSheet, { type ProfileSheetActions } from '../components/ProfileSheet'

export default function Layout() {
  const { pathname } = useLocation()
  const showTab = !pathname.startsWith('/poem/')
  const profileRef = useRef<ProfileSheetActions>(null)

  return (
    <>
      <Outlet />
      {showTab && <TabBar onProfileClick={() => profileRef.current?.open()} />}
      <ProfileSheet ref={profileRef} />
    </>
  )
}

import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import MobileLayout from './MobileLayout'
import DesktopLayout from './DesktopLayout'

const MOBILE_BREAKPOINT = 768

export default function Layout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return isMobile ? <MobileLayout><Outlet /></MobileLayout> : <DesktopLayout><Outlet /></DesktopLayout>
}

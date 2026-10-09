import { Outlet, useLocation } from 'react-router-dom'
import TabBar from '../components/TabBar'

export default function Layout() {
  const { pathname } = useLocation()
  const showTab = !pathname.startsWith('/poem/')

  return (
    <>
      <Outlet />
      {showTab && <TabBar />}
    </>
  )
}

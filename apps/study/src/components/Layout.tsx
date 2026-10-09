import { Outlet, useLocation } from 'react-router-dom'
import TabBar from '../components/TabBar'

const TAB_ROUTES = ['/', '/poems', '/achievements', '/profile']

export default function Layout() {
  const { pathname } = useLocation()
  const showTab = TAB_ROUTES.includes(pathname)

  return (
    <>
      <Outlet />
      {showTab && <TabBar />}
    </>
  )
}

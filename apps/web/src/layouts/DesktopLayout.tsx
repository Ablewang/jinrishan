import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { UtensilsCrossed, CalendarDays, MessageSquareText, Settings } from 'lucide-react'
import { useAuth } from '../store/auth'
import styles from './DesktopLayout.module.css'

interface Props { children: ReactNode }

const NAV_ITEMS = [
  { to: '/home', label: '今日推荐', icon: <UtensilsCrossed size={18} strokeWidth={2} /> },
  { to: '/plan', label: '周计划', icon: <CalendarDays size={18} strokeWidth={2} /> },
  { to: '/bot', label: 'Bot 助手', icon: <MessageSquareText size={18} strokeWidth={2} /> },
  { to: '/settings', label: '我的设置', icon: <Settings size={18} strokeWidth={2} /> },
]

export default function DesktopLayout({ children }: Props) {
  const { user } = useAuth()
  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>今日膳</div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        {!user && (
          <NavLink to="/auth/login" className={styles.loginBtn}>
            登录 / 注册
          </NavLink>
        )}
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  )
}

import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../store/auth'
import styles from './MobileLayout.module.css'

interface Props { children: ReactNode }

const NAV_ITEMS = [
  { to: '/home', label: '推荐', icon: '🍽️' },
  { to: '/plan', label: '周计划', icon: '📅', requireAuth: true },
  { to: '/bot', label: 'Bot', icon: '💬', requireAuth: true },
  { to: '/settings', label: '我的', icon: '👤' },
]

export default function MobileLayout({ children }: Props) {
  const { user } = useAuth()

  return (
    <div className={styles.root}>
      <main className={styles.main}>{children}</main>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => (
          (!item.requireAuth || user) && (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </NavLink>
          )
        ))}
        {!user && (
          <NavLink to="/auth/login" className={styles.navItem}>
            <span className={styles.navIcon}>👤</span>
            <span className={styles.navLabel}>登录</span>
          </NavLink>
        )}
      </nav>
    </div>
  )
}

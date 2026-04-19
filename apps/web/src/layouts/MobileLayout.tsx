import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { UtensilsCrossed, CalendarDays, MessageSquareText, User, BookOpenText } from 'lucide-react'
import styles from './MobileLayout.module.css'

interface Props { children: ReactNode }

const NAV_ITEMS = [
  { to: '/home', label: '推荐', icon: <UtensilsCrossed size={22} strokeWidth={2} /> },
  { to: '/today', label: '今日', icon: <BookOpenText size={22} strokeWidth={2} /> },
  { to: '/plan', label: '周计划', icon: <CalendarDays size={22} strokeWidth={2} /> },
  { to: '/bot', label: 'Bot', icon: <MessageSquareText size={22} strokeWidth={2} /> },
  { to: '/settings', label: '我的', icon: <User size={22} strokeWidth={2} /> },
]

export default function MobileLayout({ children }: Props) {
  return (
    <div className={styles.root}>
      <main className={styles.main}>{children}</main>
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
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

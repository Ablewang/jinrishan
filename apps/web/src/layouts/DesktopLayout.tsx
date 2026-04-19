import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { UtensilsCrossed, CalendarDays, MessageSquareText, BookOpenText } from 'lucide-react'
import { useAuth } from '../store/auth'
import Logo from '../components/Logo'
import styles from './DesktopLayout.module.css'

interface Props { children: ReactNode }

const NAV_ITEMS = [
  { to: '/home', label: '今日推荐', icon: <UtensilsCrossed size={18} strokeWidth={2} /> },
  { to: '/today', label: '今日菜单', icon: <BookOpenText size={18} strokeWidth={2} /> },
  { to: '/plan', label: '周计划', icon: <CalendarDays size={18} strokeWidth={2} /> },
  { to: '/bot', label: 'Bot 助手', icon: <MessageSquareText size={18} strokeWidth={2} /> },
]

export default function DesktopLayout({ children }: Props) {
  const { user } = useAuth()
  const displayName = user?.name ?? '未设置昵称'
  const avatarChar = user?.name ? user.name[0] : '?'

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.logoWrap}>
          <Logo className={styles.logo} />
        </div>
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
        {user ? (
          <NavLink to="/settings" className={styles.userCard}>
            <div className={styles.avatar}>
              {user.avatar
                ? <img src={user.avatar} alt={displayName} className={styles.avatarImg} />
                : avatarChar}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName}</span>
              {!user.name && <span className={styles.userHint}>点击完善资料</span>}
            </div>
          </NavLink>
        ) : (
          <NavLink to="/auth/login" className={styles.loginBtn}>
            登录 / 注册
          </NavLink>
        )}
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  )
}

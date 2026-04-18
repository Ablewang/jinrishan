import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../store/auth'
import styles from './AdminLayout.module.css'

const NAV_ITEMS = [
  { to: '/dashboard', icon: '📊', label: '仪表盘' },
  { to: '/recipes', icon: '🍳', label: '菜谱管理' },
  { to: '/enums', icon: '🏷️', label: '枚举管理' },
  { to: '/users', icon: '👥', label: '用户列表' },
  { to: '/families', icon: '🏠', label: '家庭列表' },
  { to: '/analytics', icon: '📈', label: '推荐分析' },
]

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>今日膳管理</div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.user}>
          <span className={styles.userName}>{admin?.username}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>退出</button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

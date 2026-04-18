import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAuthApi } from '../../api/auth'
import { useAdminAuth } from '../../store/auth'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAdminAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    setError('')
    setLoading(true)
    try {
      const res = await adminAuthApi.login(username, password)
      login(res.token, res.admin)
      navigate('/dashboard', { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>今日膳 管理后台</h1>
        <p className={styles.sub}>请使用管理员账号登录</p>

        <div className={styles.form}>
          <input
            className={styles.input}
            type="text"
            placeholder="用户名"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            className={styles.input}
            type="password"
            placeholder="密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoComplete="current-password"
          />
          {error && <p className={styles.error}>{error}</p>}
          <button
            className="btn-primary"
            style={{ width: '100%', padding: '11px' }}
            onClick={handleLogin}
            disabled={!username || !password || loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>
      </div>
    </div>
  )
}

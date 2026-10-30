import { useState } from 'react'
import { useAuth } from '@jinrishan/auth-context'
import { AuthApiError } from '@jinrishan/auth-context'
import styles from './AuthModal.module.css'

type Mode = 'login' | 'register'

export function AuthModal() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(phone, password)
      } else {
        if (password !== confirm) {
          setError('两次密码不一致')
          setLoading(false)
          return
        }
        await register(phone, password, name || undefined)
      }
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : '网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setConfirm('')
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <img src="/pwa-192x192.png" alt="拼豆图鉴" className={styles.logoImg} />
          <div className={styles.logoTitle}>拼豆图鉴</div>
          <div className={styles.logoSub}>登录后数据多端同步</div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
            onClick={() => switchMode('login')}
          >登录</button>
          <button
            className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
            onClick={() => switchMode('register')}
          >注册</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input
              className={styles.input}
              type="text"
              placeholder="昵称（可选）"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
            />
          )}
          <input
            className={styles.input}
            type="tel"
            placeholder="手机号"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            maxLength={11}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="密码（至少 6 位）"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={6}
            required
          />
          {mode === 'register' && (
            <input
              className={styles.input}
              type="password"
              placeholder="确认密码"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              minLength={6}
              required
            />
          )}
          {error && <div className={styles.error}>{error}</div>}
          <button className={styles.submit} type="submit" disabled={loading}>
            {loading ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
          </button>
          {mode === 'login' && (
            <div className={styles.forgot}>忘记密码？请联系微信：<strong>s_peech</strong></div>
          )}
        </form>
      </div>
    </div>
  )
}

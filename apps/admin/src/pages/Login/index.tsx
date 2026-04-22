import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAuthApi } from '../../api/auth'
import { useAdminAuth } from '../../store/auth'
import styles from './Login.module.css'

function Logo({ className = '', inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={`${styles.logo} ${inverted ? styles.logoInverted : ''} ${className}`}>
      <div className={styles.logoHanzi}>膳</div>
      <div className={styles.logoDivider} />
      <div className={styles.logoMeta}>
        <div className={styles.logoPinyin}>/ shàn /</div>
        <div className={styles.logoBrand}>JINRI</div>
      </div>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAdminAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const username = (form.elements.namedItem('username') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    setError('')
    setLoading(true)
    try {
      const res = await adminAuthApi.login(username, password)
      login(res.token, res.admin)
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.brandPanel}>
        <div className={styles.brandWatermark}>膳</div>
        <div className={styles.brandContent}>
          <Logo className={styles.brandLogo} inverted />
          <div className={styles.brandText}>
            <h1 className={styles.brandTitle}>今日膳<br />管理后台</h1>
            <p className={styles.brandDesc}>四方食事，不过一碗人间烟火。</p>
          </div>
        </div>
        <div className={styles.brandFooter}>
          <span>© {new Date().getFullYear()} JINRISHAN</span>
          <span>ADMIN CONSOLE</span>
        </div>
      </div>

      <div className={styles.formPanel}>
        <div className={styles.formDeco}>
          <div className={styles.formDecoLine} />
          <div className={styles.formDecoText}>管理系统</div>
        </div>

        <div className={styles.formWrap}>
          <Logo className={styles.formLogo} />
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>管理员登录</h2>
            <p className={styles.formSubtitle}>请使用管理员账号登录</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit} autoComplete="off">
            <div className={styles.field}>
              <input
                className={styles.input}
                type="text"
                name="username"
                placeholder="用户名"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div className={styles.field}>
              <input
                className={styles.input}
                type="password"
                name="password"
                placeholder="密码"
                autoComplete="current-password"
                required
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <button
              className={styles.btn}
              type="submit"
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

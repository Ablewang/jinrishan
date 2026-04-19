import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuth } from '../../store/auth'
import styles from './Login.module.css'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [devCode, setDevCode] = useState('')

  const from = (location.state as { from?: string })?.from ?? '/home'

  async function sendOtp() {
    setError('')
    setLoading(true)
    try {
      const res = await authApi.sendOtp(phone)
      if (res.code) setDevCode(res.code) // dev only
      setStep('code')
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    setError('')
    setLoading(true)
    try {
      const res = await authApi.verifyOtp(phone, code)
      login(res.token, res.user)

      // 游客偏好迁移（Phase 2 实现完整逻辑，现在先清除缓存）
      localStorage.removeItem('guestPrefs')

      navigate(from, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : '验证失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>登录 / 注册</h1>
          <p className={styles.subtitle}>手机号验证，安全便捷</p>
        </div>

        {step === 'phone' ? (
          <div className={styles.form}>
            <div className={styles.inputGroup}>
              <span className={styles.prefix}>+86</span>
              <input
                className={styles.input}
                type="tel"
                placeholder="手机号"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                maxLength={11}
              />
            </div>
            
            {error && <p className={styles.error}>{error}</p>}
            
            <button
              className={styles.btn}
              onClick={sendOtp}
              disabled={phone.length !== 11 || loading}
            >
              {loading ? '发送中...' : '获取验证码'}
            </button>
          </div>
        ) : (
          <div className={styles.form}>
            <div className={styles.inputGroup}>
              <input
                className={`${styles.input} ${styles.codeInput}`}
                type="text"
                placeholder="6 位验证码"
                value={code}
                onChange={e => setCode(e.target.value)}
                maxLength={6}
              />
            </div>
            
            {error && <p className={styles.error}>{error}</p>}
            
            <button
              className={styles.btn}
              onClick={verifyOtp}
              disabled={code.length !== 6 || loading}
            >
              {loading ? '验证中...' : '登录'}
            </button>

            <div className={styles.actionRow}>
              <span className={styles.hint}>验证码已发送至 {phone}</span>
              <button className={styles.resendBtn} onClick={() => setStep('phone')}>
                修改手机号
              </button>
            </div>

            {devCode && (
              <p className={styles.devHint}>开发模式验证码：<strong>{devCode}</strong></p>
            )}
          </div>
        )}

        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          返回
        </button>
      </div>
    </div>
  )
}
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { authApi } from '../../api/auth'
import { useAuth } from '../../store/auth'
import Logo from '../../components/Logo'
import styles from './Login.module.css'

function OtpInput({ value, onChange, onComplete }: {
  value: string
  onChange: (v: string) => void
  onComplete: () => void
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '')

  function focus(i: number) {
    inputs.current[i]?.focus()
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\D/g, '')
    if (!val) return
    const next = digits.slice()
    next[i] = val[val.length - 1]
    const joined = next.join('')
    onChange(joined)
    if (i < 5) focus(i + 1)
    if (joined.length === 6) onComplete()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = digits.slice()
        next[i] = ''
        onChange(next.join(''))
      } else if (i > 0) {
        focus(i - 1)
        const next = digits.slice()
        next[i - 1] = ''
        onChange(next.join(''))
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focus(i - 1)
    } else if (e.key === 'ArrowRight' && i < 5) {
      focus(i + 1)
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    const nextFocus = Math.min(pasted.length, 5)
    focus(nextFocus)
    if (pasted.length === 6) onComplete()
  }

  useEffect(() => { focus(0) }, [])

  return (
    <div className={styles.otpRow}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el }}
          className={styles.otpBox}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  )
}

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
  const [agreed, setAgreed] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [shaking, setShaking] = useState(false)

  const from = (location.state as { from?: string })?.from ?? '/home'

  async function sendOtp() {
    if (phone.length !== 11 || loading) return
    if (!agreed) {
      setShowTermsModal(true)
      setShaking(true)
      setTimeout(() => setShaking(false), 600)
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await authApi.sendOtp(phone)
      if (res.code) setDevCode(res.code)
      setStep('code')
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败')
    } finally {
      setLoading(false)
    }
  }

  async function agreeAndSend() {
    setAgreed(true)
    setShowTermsModal(false)
    setError('')
    setLoading(true)
    try {
      const res = await authApi.sendOtp(phone)
      if (res.code) setDevCode(res.code)
      setStep('code')
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败')
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp() {
    if (code.length !== 6 || loading) return
    setError('')
    setLoading(true)
    try {
      const res = await authApi.verifyOtp(phone, code)
      login(res.token, res.user)
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
      <div className={styles.mobileWatermark}>
        三餐<br />四季<br />今日。
      </div>
      <div className={styles.brandingPanel}>
        <div className={styles.brandingContent}>
          <Logo className={styles.hugeLogo} />
          <h1 className={styles.brandingTitle}>
            三餐<br />四季<br />今日。
          </h1>
          <p className={styles.brandingDesc}>
            四方食事，不过一碗人间烟火。
          </p>
        </div>
        <div className={styles.brandingFooter}>
          <span>© {new Date().getFullYear()} JINRISHAN</span>
          <span>EST. 2026</span>
        </div>
      </div>

      <div className={styles.formPanel}>
        {/* Right side decorative vertical axis for PC */}
        <div className={styles.rightDeco}>
          <div className={styles.rightDecoLine} />
          <div className={styles.rightDecoText}>家人闲坐 灯火可亲</div>
        </div>
        
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.logoWrap}>
              <Logo className={styles.logo} />
            </div>
            <div className={styles.headerText}>
              <h2 className={styles.formTitle}>欢迎归来</h2>
              <p className={styles.subtitle}>晚来天欲雪，能饮一杯无？</p>
            </div>
          </div>

          {step === 'phone' ? (
          <div className={styles.form}>
            <div className={styles.inputGroup}>
              <span className={styles.prefix}>+86</span>
              <input
                className={styles.input}
                type="tel"
                placeholder="手机号码"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendOtp()}
                maxLength={11}
                autoFocus
              />
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.submitRow}>
              <button className={styles.backIconBtn} onClick={() => navigate(-1)} aria-label="返回" type="button">
                <ArrowLeft size={20} strokeWidth={1.5} className={styles.arrowIcon} />
              </button>
              <button
                className={`${styles.btn} ${shaking ? styles.shake : ''}`}
                onClick={sendOtp}
                disabled={phone.length !== 11 || loading}
              >
                {loading ? '发送中...' : '获取验证码'}
              </button>
            </div>

            <div className={styles.termsHint}>
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  className={styles.checkbox} 
                  checked={agreed} 
                  onChange={e => setAgreed(e.target.checked)} 
                />
                <span className={styles.checkboxMark}></span>
                <span className={styles.termsText}>
                  未注册号码验证后将自动创建新账号。继续即视为您已阅读并同意
                  {' '}<a href="#">服务条款</a> 与 <a href="#">隐私政策</a>
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className={styles.form}>
            <OtpInput value={code} onChange={setCode} onComplete={verifyOtp} />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.submitRow}>
              <button className={styles.backIconBtn} onClick={() => { setStep('phone'); setCode('') }} aria-label="返回" type="button">
                <ArrowLeft size={20} strokeWidth={1.5} className={styles.arrowIcon} />
              </button>
              <button
                className={styles.btn}
                onClick={verifyOtp}
                disabled={code.length !== 6 || loading}
              >
                {loading ? '验证中...' : '登录'}
              </button>
            </div>

            <div className={styles.actionRow}>
              <span className={styles.hint}>验证码已发送至 {phone}</span>
              <button className={styles.resendBtn} onClick={() => { setStep('phone'); setCode('') }}>
                修改手机号
              </button>
            </div>

            {devCode && (
              <p className={styles.devHint}>开发模式验证码：<strong>{devCode}</strong></p>
            )}

            <div className={styles.termsHint}>
              <label className={styles.checkboxLabel}>
                <input 
                  type="checkbox" 
                  className={styles.checkbox} 
                  checked={agreed} 
                  onChange={e => setAgreed(e.target.checked)} 
                />
                <span className={styles.checkboxMark}></span>
                <span className={styles.termsText}>
                  未注册号码验证后将自动创建新账号。继续即视为您已阅读并同意
                  {' '}<a href="#">服务条款</a> 与 <a href="#">隐私政策</a>
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
      </div>

      {showTermsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowTermsModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>请阅读并同意协议</h3>
            <p className={styles.modalBody}>
              未注册号码验证后将自动创建新账号。
              继续即视为您已阅读并同意今日膳的{' '}
              <a href="#">服务条款</a> 与 <a href="#">隐私政策</a>。
            </p>
            <button className={styles.modalBtn} onClick={agreeAndSend}>
              同意并继续
            </button>
            <button className={styles.modalCancel} onClick={() => setShowTermsModal(false)}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

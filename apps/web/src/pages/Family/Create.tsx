import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { familiesApi } from '../../api/families'
import styles from './Family.module.css'

export default function FamilyCreate() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ id: number; name: string; invite_code: string } | null>(null)

  async function handleCreate() {
    if (!name.trim()) { setError('请输入家庭名称'); return }
    setLoading(true)
    setError('')
    try {
      const family = await familiesApi.create(name.trim())
      localStorage.setItem('familyId', String(family.id))
      setResult(family)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className={styles.page}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>🎉</div>
          <h2 className={styles.successTitle}>家庭创建成功！</h2>
          <p className={styles.successName}>{result.name}</p>
          <div className={styles.inviteBlock}>
            <p className={styles.inviteLabel}>邀请码（分享给家人）</p>
            <div className={styles.inviteCode}>{result.invite_code}</div>
          </div>
          <button className={styles.btnPrimary} onClick={() => navigate('/settings')}>
            去设置偏好
          </button>
          <button className={styles.btnSecondary} onClick={() => navigate('/home')}>
            先去首页看看
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate(-1)}>← 返回</button>
      <h1 className={styles.title}>创建家庭</h1>
      <p className={styles.subtitle}>创建后，可邀请家人加入，共同享受专属推荐</p>

      <div className={styles.form}>
        <label className={styles.label}>家庭名称</label>
        <input
          className={styles.input}
          type="text"
          placeholder="例如：王家厨房"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.btnPrimary} onClick={handleCreate} disabled={loading}>
          {loading ? '创建中...' : '创建家庭'}
        </button>
      </div>
    </div>
  )
}

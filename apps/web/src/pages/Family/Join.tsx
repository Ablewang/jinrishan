import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { familiesApi } from '../../api/families'
import styles from './Family.module.css'

export default function FamilyJoin() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    if (!code.trim()) { setError('请输入邀请码'); return }
    setLoading(true)
    setError('')
    try {
      const res = await familiesApi.join(code.trim().toUpperCase(), nickname.trim() || undefined)
      localStorage.setItem('familyId', String(res.family_id))
      navigate('/home', { replace: true })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加入失败，请检查邀请码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate(-1)}>← 返回</button>
      <h1 className={styles.title}>加入家庭</h1>
      <p className={styles.subtitle}>输入家人分享的邀请码，加入后共享推荐和周计划</p>

      <div className={styles.form}>
        <label className={styles.label}>邀请码</label>
        <input
          className={`${styles.input} ${styles.inputUpper}`}
          type="text"
          placeholder="6 位邀请码"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          maxLength={8}
        />

        <label className={styles.label}>我的昵称（可选）</label>
        <input
          className={styles.input}
          type="text"
          placeholder="例如：爸爸、妈妈、宝宝"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          maxLength={10}
        />

        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.btnPrimary} onClick={handleJoin} disabled={loading}>
          {loading ? '加入中...' : '加入家庭'}
        </button>
      </div>
    </div>
  )
}

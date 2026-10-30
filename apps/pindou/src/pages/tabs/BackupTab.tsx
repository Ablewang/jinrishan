import { useState } from 'react'
import { useAuth } from '@jinrishan/auth-context'
import avatarSvg from '../../assets/avatar.svg'
import editSvg from '../../assets/edit.svg'
import styles from './BackupTab.module.css'

export function BackupTab() {
  const { user, logout, updateName } = useAuth()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      await updateName(name.trim())
      setEditing(false)
    } catch {
      setError('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setName(user?.name ?? '')
    setEditing(false)
    setError('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.avatarWrap}>
        <img src={avatarSvg} className={styles.avatar} alt="头像" />
      </div>

      {editing ? (
        <div className={styles.editRow}>
          <input
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? '…' : '保存'}
          </button>
          <button className={styles.cancelBtn} onClick={handleCancel} disabled={saving}>取消</button>
        </div>
      ) : (
        <div className={styles.nameRow}>
          <span className={styles.name}>{user?.name}</span>
          <button className={styles.editBtn} onClick={() => { setName(user?.name ?? ''); setEditing(true) }}>
            <img src={editSvg} className={styles.editIcon} alt="编辑" />
          </button>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}
      <span className={styles.phone}>{user?.phone}</span>

      <button className={styles.logoutBtn} onClick={logout}>退出登录</button>
    </div>
  )
}

import { useState } from 'react'
import styles from './RolesDrawer.module.css'

interface Member {
  id: number
  user_id: number | null
  display_name: string | null
  nickname: string | null
  user_name: string | null
  phone?: string
  avatar?: string
}

interface Props {
  open: boolean
  members: Member[]
  currentUserId: number
  onRoleChange: (userId: number, role: string) => Promise<void>
  onAddVirtual: (displayName: string) => Promise<void>
  onDeleteVirtual: (memberId: number) => Promise<void>
  onEditPrefs: (memberId: number, memberName: string) => void
  onClose: () => void
}

const ROLE_OPTIONS = ['爸爸', '妈妈', '爷爷', '奶奶', '姥爷', '姥姥', '哥哥', '姐姐', '弟弟', '妹妹', '孩子', '其他']

export default function RolesDrawer({
  open, members, currentUserId,
  onRoleChange, onAddVirtual, onDeleteVirtual, onEditPrefs, onClose
}: Props) {
  const [addName, setAddName] = useState('')
  const [adding, setAdding] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  async function handleAdd() {
    if (!addName.trim()) return
    setAdding(true)
    try {
      await onAddVirtual(addName.trim())
      setAddName('')
      setShowAdd(false)
    } finally {
      setAdding(false)
    }
  }

  function getMemberName(m: Member) {
    return m.display_name || m.user_name || m.phone || '未知'
  }

  return (
    <div className={`${styles.overlay} ${open ? styles.open : ''}`} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>管理成员</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <p className={styles.hint}>为每位家庭成员设置角色，有助于系统做出更贴心的推荐</p>

          {members.map(m => (
            <div key={m.id} className={styles.memberRow}>
              <div className={styles.memberTop}>
                <div className={styles.avatar}>
                  {m.avatar
                    ? <img src={m.avatar} alt="" className={styles.avatarImg} />
                    : (getMemberName(m)[0])}
                </div>
                <span className={styles.name}>
                  {getMemberName(m)}
                  {m.user_id === currentUserId && <span className={styles.meTag}>自己</span>}
                  {m.user_id === null && <span className={styles.virtualTag}>虚拟</span>}
                </span>
                <div className={styles.memberActions}>
                  <button
                    className={styles.prefsBtn}
                    onClick={() => onEditPrefs(m.id, getMemberName(m))}
                    title="口味偏好"
                  >
                    口味
                  </button>
                  {m.user_id === null && (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => onDeleteVirtual(m.id)}
                      title="删除"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>

              {m.user_id !== null && (
                <div className={styles.roleOptions}>
                  {ROLE_OPTIONS.map(r => (
                    <button
                      key={r}
                      className={`${styles.roleChip} ${m.nickname === r ? styles.roleChipActive : ''}`}
                      onClick={() => onRoleChange(m.user_id!, m.nickname === r ? '' : r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}

              {m.user_id === null && (
                <div className={styles.roleOptions}>
                  {ROLE_OPTIONS.map(r => (
                    <button
                      key={r}
                      className={`${styles.roleChip} ${m.nickname === r ? styles.roleChipActive : ''}`}
                      onClick={async () => {
                        // virtual member role change — noop for now (need updateVirtual API)
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {showAdd ? (
            <div className={styles.addForm}>
              <input
                className={styles.addInput}
                placeholder="成员名称（如：爷爷、孩子）"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                autoFocus
              />
              <div className={styles.addFormActions}>
                <button className={styles.cancelAddBtn} onClick={() => { setShowAdd(false); setAddName('') }}>
                  取消
                </button>
                <button className={styles.confirmAddBtn} onClick={handleAdd} disabled={adding || !addName.trim()}>
                  {adding ? '添加中...' : '添加'}
                </button>
              </div>
            </div>
          ) : (
            <button className={styles.addMemberBtn} onClick={() => setShowAdd(true)}>
              + 添加家庭成员
            </button>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.doneBtn} onClick={onClose}>完成</button>
        </div>
      </div>
    </div>
  )
}

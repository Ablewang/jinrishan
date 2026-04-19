import styles from './RolesDrawer.module.css'

interface Member {
  id: number
  user_id: number
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
  onClose: () => void
}

const ROLE_OPTIONS = ['爸爸', '妈妈', '爷爷', '奶奶', '姥爷', '姥姥', '哥哥', '姐姐', '弟弟', '妹妹', '孩子', '其他']

export default function RolesDrawer({ open, members, currentUserId, onRoleChange, onClose }: Props) {
  return (
    <div className={`${styles.overlay} ${open ? styles.open : ''}`} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>管理角色</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <p className={styles.hint}>为每位家庭成员设置角色，有助于系统做出更贴心的推荐</p>
          {members.map(m => (
            <div key={m.user_id} className={styles.memberRow}>
              <div className={styles.memberTop}>
                <div className={styles.avatar}>
                  {m.avatar
                    ? <img src={m.avatar} alt="" className={styles.avatarImg} />
                    : (m.user_name?.[0] || '用')}
                </div>
                <span className={styles.name}>
                  {m.user_name || m.phone}
                  {m.user_id === currentUserId && <span className={styles.meTag}>自己</span>}
                </span>
              </div>
              <div className={styles.roleOptions}>
                {ROLE_OPTIONS.map(r => (
                  <button
                    key={r}
                    className={`${styles.roleChip} ${m.nickname === r ? styles.roleChipActive : ''}`}
                    onClick={() => onRoleChange(m.user_id, m.nickname === r ? '' : r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <button className={styles.doneBtn} onClick={onClose}>完成</button>
        </div>
      </div>
    </div>
  )
}

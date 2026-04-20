import { useState, useEffect } from 'react'
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

type Prefs = {
  liked_cuisines: string[]; liked_flavors: string[]; liked_ingredients: string[]
  disliked_cuisines: string[]; disliked_flavors: string[]; disliked_ingredients: string[]
  allergies: string[]
}

interface Props {
  open: boolean
  members: Member[]
  currentUserId: number
  onRoleChange: (userId: number, role: string) => Promise<void>
  onVirtualRoleChange: (memberId: number, role: string) => Promise<void>
  onAddVirtual: (displayName: string, role?: string) => Promise<void>
  onDeleteVirtual: (memberId: number) => Promise<void>
  onLoadPrefs: (memberId: number) => Promise<Prefs>
  onSavePrefs: (memberId: number, prefs: Prefs) => Promise<void>
  onClose: () => void
}

const ROLE_OPTIONS = ['', '爸爸', '妈妈', '爷爷', '奶奶', '姥爷', '姥姥', '哥哥', '姐姐', '弟弟', '妹妹', '孩子', '其他']
const FLAVOR_OPTIONS = ['清淡', '香辣', '酸甜', '鲜香', '咸鲜', '浓郁', '麻辣', '家常']
const CUISINE_OPTIONS = ['川菜', '粤菜', '湘菜', '东北菜', '闽菜', '徽菜', '苏菜', '浙菜', '家常菜']
const ALLERGY_OPTIONS = ['花生', '海鲜', '牛奶', '鸡蛋', '大豆', '小麦', '坚果', '芝麻']

const EMPTY_PREFS: Prefs = {
  liked_cuisines: [], liked_flavors: [], liked_ingredients: [],
  disliked_cuisines: [], disliked_flavors: [], disliked_ingredients: [],
  allergies: [],
}

function toggle(arr: string[], val: string) {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

export default function RolesDrawer({
  open, members, currentUserId,
  onRoleChange, onVirtualRoleChange, onAddVirtual, onDeleteVirtual,
  onLoadPrefs, onSavePrefs, onClose
}: Props) {
  const [addName, setAddName] = useState('')
  const [addRole, setAddRole] = useState('')
  const [adding, setAdding] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  // per-member prefs cache: id -> Prefs
  const [prefsCache, setPrefsCache] = useState<Record<number, Prefs>>({})
  const [editingPrefsId, setEditingPrefsId] = useState<number | null>(null)
  const [editingPrefs, setEditingPrefs] = useState<Prefs>(EMPTY_PREFS)
  const [prefsLoading, setPrefsLoading] = useState(false)
  const [prefsSaving, setPrefsSaving] = useState(false)

  const [saveError, setSaveError] = useState<string | null>(null)

  // 打开时预加载所有成员口味
  useEffect(() => {
    if (!open || members.length === 0) return
    members.forEach(m => {
      onLoadPrefs(m.id)
        .then(p => setPrefsCache(c => ({ ...c, [m.id]: p })))
        .catch(() => {})
    })
  }, [open, members])

  async function handleAdd() {
    if (!addName.trim()) return
    setAdding(true)
    try {
      await onAddVirtual(addName.trim(), addRole || undefined)
      setAddName('')
      setAddRole('')
      setShowAdd(false)
    } finally {
      setAdding(false)
    }
  }

  async function handleEditPrefs(memberId: number) {
    if (editingPrefsId === memberId) {
      setEditingPrefsId(null)
      return
    }
    const cached = prefsCache[memberId]
    if (cached) {
      setEditingPrefs(cached)
      setEditingPrefsId(memberId)
      return
    }
    setPrefsLoading(true)
    setEditingPrefsId(memberId)
    try {
      const p = await onLoadPrefs(memberId)
      setPrefsCache(c => ({ ...c, [memberId]: p }))
      setEditingPrefs(p ?? EMPTY_PREFS)
    } catch {
      setEditingPrefs(EMPTY_PREFS)
    } finally {
      setPrefsLoading(false)
    }
  }

  async function handleSavePrefs(memberId: number) {
    setSaveError(null)
    setPrefsSaving(true)
    try {
      await onSavePrefs(memberId, editingPrefs)
      setPrefsCache(c => ({ ...c, [memberId]: editingPrefs }))
      setEditingPrefsId(null)
    } catch (e: any) {
      setSaveError(e?.message || '保存失败，请重试')
    } finally {
      setPrefsSaving(false)
    }
  }

  function setP(key: keyof Prefs, val: string) {
    setEditingPrefs(p => ({ ...p, [key]: toggle(p[key], val) }))
  }

  function getMemberName(m: Member) {
    return m.display_name || m.user_name || m.phone || '未知'
  }

  function getMemberPrefs(memberId: number): Prefs {
    return prefsCache[memberId] ?? EMPTY_PREFS
  }

  function getDisplayTags(prefs: Prefs): string[] {
    return [
      ...prefs.liked_flavors,
      ...prefs.liked_cuisines,
      ...prefs.disliked_flavors.map(v => `忌${v}`),
      ...prefs.allergies.map(a => `忌${a}`),
    ]
  }

  return (
    <div className={`${styles.overlay} ${open ? styles.open : ''}`} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>管理成员</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          {members.map(m => {
            const prefs = getMemberPrefs(m.id)
            const displayTags = getDisplayTags(prefs)
            const isEditing = editingPrefsId === m.id

            return (
              <div key={m.id} className={styles.memberRow}>
                {/* Top: avatar + name + role select + delete */}
                <div className={styles.memberTop}>
                  <div className={styles.avatar}>
                    {m.avatar
                      ? <img src={m.avatar} alt="" className={styles.avatarImg} />
                      : getMemberName(m)[0]}
                  </div>
                  <span className={styles.name}>
                    {getMemberName(m)}
                    {m.user_id === currentUserId && <span className={styles.meTag}>自己</span>}
                    {m.user_id === null && <span className={styles.virtualTag}>虚拟</span>}
                  </span>
                  <div className={styles.memberActions}>
                    <div className={styles.roleSelectWrap}>
                      <select
                        className={styles.roleSelect}
                        value={m.nickname ?? ''}
                        onChange={e => {
                          const val = e.target.value
                          if (m.user_id !== null) onRoleChange(m.user_id, val)
                          else onVirtualRoleChange(m.id, val)
                        }}
                      >
                        {ROLE_OPTIONS.map(r => (
                          <option key={r} value={r}>{r || '角色'}</option>
                        ))}
                      </select>
                    </div>
                    {m.user_id === null && (
                      <button className={styles.deleteBtn} onClick={() => onDeleteVirtual(m.id)}>删除</button>
                    )}
                  </div>
                </div>

                {/* Prefs display row */}
                <div className={styles.prefsRow}>
                  <div className={styles.prefsTagsDisplay}>
                    {displayTags.length > 0
                      ? displayTags.map(t => <span key={t} className={styles.prefsTagDisplay}>{t}</span>)
                      : <span className={styles.prefsEmpty}>未设置口味</span>
                    }
                  </div>
                  <button
                    className={`${styles.editPrefsBtn} ${isEditing ? styles.editPrefsBtnActive : ''}`}
                    onClick={() => handleEditPrefs(m.id)}
                  >
                    {isEditing ? '收起' : '编辑'}
                  </button>
                </div>

                {/* Inline prefs editor */}
                {isEditing && (
                  <div className={styles.prefsPanel}>
                    {prefsLoading ? (
                      <div className={styles.prefsLoading}>加载中…</div>
                    ) : (
                      <>
                        <div className={styles.prefsGroup}>
                          <div className={styles.prefsGroupLabel}>喜欢的口味</div>
                          <div className={styles.prefsTags}>
                            {FLAVOR_OPTIONS.map(v => (
                              <button key={v} className={`${styles.prefsTag} ${editingPrefs.liked_flavors.includes(v) ? styles.prefsTagActive : ''}`} onClick={() => setP('liked_flavors', v)}>{v}</button>
                            ))}
                          </div>
                        </div>
                        <div className={styles.prefsGroup}>
                          <div className={styles.prefsGroupLabel}>偏好菜系</div>
                          <div className={styles.prefsTags}>
                            {CUISINE_OPTIONS.map(v => (
                              <button key={v} className={`${styles.prefsTag} ${editingPrefs.liked_cuisines.includes(v) ? styles.prefsTagActive : ''}`} onClick={() => setP('liked_cuisines', v)}>{v}</button>
                            ))}
                          </div>
                        </div>
                        <div className={styles.prefsGroup}>
                          <div className={styles.prefsGroupLabel}>忌口口味</div>
                          <div className={styles.prefsTags}>
                            {FLAVOR_OPTIONS.map(v => (
                              <button key={v} className={`${styles.prefsTag} ${editingPrefs.disliked_flavors.includes(v) ? styles.prefsTagActive : ''}`} onClick={() => setP('disliked_flavors', v)}>{v}</button>
                            ))}
                          </div>
                        </div>
                        <div className={styles.prefsGroup}>
                          <div className={styles.prefsGroupLabel}>过敏食材</div>
                          <div className={styles.prefsTags}>
                            {ALLERGY_OPTIONS.map(v => (
                              <button key={v} className={`${styles.prefsTag} ${editingPrefs.allergies.includes(v) ? styles.prefsTagActive : ''}`} onClick={() => setP('allergies', v)}>{v}</button>
                            ))}
                          </div>
                        </div>
                        <div className={styles.prefsSaveRow}>
                        {saveError && <span className={styles.saveError}>{saveError}</span>}
                        <button className={styles.prefsDoneBtn} onClick={() => handleSavePrefs(m.id)} disabled={prefsSaving}>
                          {prefsSaving ? '保存中…' : '保存'}
                        </button>
                      </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {showAdd ? (
            <div className={styles.addForm}>
              <div className={styles.addFormRow}>
                <input
                  className={styles.addInput}
                  placeholder="成员名称（如：爷爷）"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                  autoFocus
                />
                <div className={styles.roleSelectWrap}>
                  <select
                    className={styles.roleSelect}
                    value={addRole}
                    onChange={e => setAddRole(e.target.value)}
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r} value={r}>{r || '角色'}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.addFormActions}>
                <button className={styles.cancelAddBtn} onClick={() => { setShowAdd(false); setAddName(''); setAddRole('') }}>取消</button>
                <button className={styles.confirmAddBtn} onClick={handleAdd} disabled={adding || !addName.trim()}>
                  {adding ? '添加中…' : '添加'}
                </button>
              </div>
            </div>
          ) : (
            <button className={styles.addMemberBtn} onClick={() => setShowAdd(true)}>
              + 添加家庭成员
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User as UserIcon, Camera, Copy, Check } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { apiFetch } from '../../api/client'
import { uploadWithProgress } from '../../api/upload'
import { familiesApi } from '../../api/families'
import LoginPrompt from '../../components/LoginPrompt'
import InlineEdit from '../../components/InlineEdit'
import PrefsDrawer from '../../components/PrefsDrawer/PrefsDrawer'
import RolesDrawer from '../../components/RolesDrawer/RolesDrawer'
import styles from './Settings.module.css'

interface Prefs {
  [key: string]: any
  liked_cuisines: string[]
  liked_flavors: string[]
  liked_ingredients: string[]
  disliked_cuisines: string[]
  disliked_flavors: string[]
  disliked_ingredients: string[]
  allergies: string[]
}

interface Member {
  id: number
  user_id: number
  nickname: string | null
  role: string
  user_name: string | null
  avatar?: string
  phone?: string
}

const DEFAULT_PREFS: Prefs = {
  liked_cuisines: [], liked_flavors: [], liked_ingredients: [],
  disliked_cuisines: [], disliked_flavors: [], disliked_ingredients: [],
  allergies: [],
}

const FLAVOR_OPTIONS = ['清淡', '香辣', '酸甜', '鲜香', '咸鲜', '浓郁', '麻辣', '家常']
const CUISINE_OPTIONS = ['川菜', '粤菜', '湘菜', '东北菜', '闽菜', '徽菜', '苏菜', '浙菜', '家常菜']
const ALLERGY_OPTIONS = ['花生', '海鲜', '牛奶', '鸡蛋', '大豆', '小麦', '坚果', '芝麻']

function TagPicker({
  label, options, selected, onChange, disabled
}: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  if (disabled) {
    if (selected.length === 0) {
      return (
        <div className={styles.prefGroup}>
          <label className={styles.prefLabel}>{label}</label>
          <div className={styles.emptyTagText}>未设置</div>
        </div>
      )
    }
    return (
      <div className={styles.prefGroup}>
        <label className={styles.prefLabel}>{label}</label>
        <div className={styles.tagPicker}>
          {selected.map(opt => (
            <span key={opt} className={`${styles.tag} ${styles.tagActive} ${styles.tagDisabled}`}>
              {opt}
            </span>
          ))}
        </div>
      </div>
    )
  }

  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt])
  }
  return (
    <div className={styles.prefGroup}>
      <label className={styles.prefLabel}>{label}</label>
      <div className={styles.tagPicker}>
        {options.map(opt => (
          <button
            key={opt}
            className={`${styles.tag} ${selected.includes(opt) ? styles.tagActive : ''}`}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Settings() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const [familyInfo, setFamilyInfo] = useState<{ id: number; name: string; invite_code: string } | null>(null)
  const [memberId, setMemberId] = useState<number | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [rolesDrawerOpen, setRolesDrawerOpen] = useState(false)
  const [prefsDrawerOpen, setPrefsDrawerOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const [avatarPreviewFile, setAvatarPreviewFile] = useState<File | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarProgress, setAvatarProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const familyId = Number(localStorage.getItem('familyId') ?? '0')

  useEffect(() => {
    if (!familyId || !user) return
    familiesApi.get(familyId).then(setFamilyInfo).catch(() => {})
    familiesApi.members(familyId).then(m => {
      setMembers(m)
      const me = m.find(x => x.user_id === user.id)
      if (!me) return
      setMemberId(me.id)
      return familiesApi.getPreferences(familyId, me.id)
    }).then(p => {
      if (p) setPrefs(p)
    }).catch(() => {})
  }, [familyId, user])

  async function handleSave(updated: Prefs) {
    if (!memberId || !familyId) return
    setSaving(true)
    try {
      await familiesApi.updatePreferences(familyId, memberId, updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 1000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/home')
  }

  async function handleNameSave() {
    setIsEditingProfile(false)
    const trimmed = editName.trim()
    if (!trimmed) return
    try {
      const res = await apiFetch<{ id: number; phone: string; name: string | null }>('/api/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name: trimmed }),
      })
      updateUser({ name: res.name })
    } catch {
      updateUser({ name: trimmed })
    }
  }

  function handleNameCancel() {
    setIsEditingProfile(false)
    setEditName(user?.name ?? '')
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreviewFile(file)
    setAvatarPreviewUrl(URL.createObjectURL(file))
    e.target.value = ''
  }

  function handleAvatarCancel() {
    URL.revokeObjectURL(avatarPreviewUrl)
    setAvatarPreviewUrl('')
    setAvatarPreviewFile(null)
    setAvatarProgress(0)
  }

  async function handleAvatarConfirm() {
    if (!avatarPreviewFile) return
    setAvatarUploading(true)
    setAvatarProgress(0)
    try {
      const url = await uploadWithProgress(avatarPreviewFile, 'avatars', pct => setAvatarProgress(pct))
      updateUser({ avatar: url })
      URL.revokeObjectURL(avatarPreviewUrl)
      setAvatarPreviewUrl('')
      setAvatarPreviewFile(null)
      setAvatarProgress(0)
    } catch (e) {
      console.error(e)
    } finally {
      setAvatarUploading(false)
    }
  }

  function handleCopy() {
    if (familyInfo) {
      navigator.clipboard.writeText(familyInfo.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!user) return <LoginPrompt title="建立你的口味档案" desc="告诉我你喜欢什么、不吃什么，每一次推荐才能真正懂你" />

  return (
    <div className={styles.page}>
      
      {/* High-End Editorial Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.profileLeft}>
          <div
            className={`${styles.avatarWrap} ${!isEditingProfile ? styles.avatarReadonly : ''}`}
            onMouseDown={e => { if (isEditingProfile) e.preventDefault() }}
            onClick={() => isEditingProfile && fileInputRef.current?.click()}
          >
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" className={styles.avatar} />
            ) : (
              <div className={styles.avatar}>{user.name ? user.name[0] : <UserIcon size={32} strokeWidth={1} />}</div>
            )}
            {isEditingProfile && (
              <div className={styles.avatarEditOverlay}>
                <Camera size={20} strokeWidth={1.5} />
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </div>
          
          <div className={styles.userInfo}>
            {user.name || isEditingProfile ? (
              <InlineEdit
                value={isEditingProfile ? editName : (user.name ?? '')}
                editing={isEditingProfile}
                placeholder="请输入姓名"
                className={styles.nameInput}
                editingClassName={styles.nameInputActive}
                onChange={setEditName}
                onCommit={handleNameSave}
                onCancel={() => setIsEditingProfile(false)}
                onClick={() => {
                  setEditName(user.name ?? '')
                  setIsEditingProfile(true)
                }}
              />
            ) : (
              <div className={styles.emptyName} onClick={() => {
                setEditName('')
                setIsEditingProfile(true)
              }}>
                <span className={styles.emptyNameTitle}>未设置昵称 <span className={styles.emptyNameSub}>完善资料</span></span>
              </div>
            )}
            <p className={styles.userPhone}>{user.phone}</p>
          </div>
        </div>

        {!isEditingProfile ? (
          <button className={styles.editProfileBtn} onClick={() => {
            setEditName(user.name ?? '')
            setIsEditingProfile(true)
          }}>
            编辑
          </button>
        ) : (
          <div className={styles.profileActions}>
            <button className={styles.cancelProfileBtn} onClick={handleNameCancel}>
              取消
            </button>
            <button className={styles.saveProfileBtn} onClick={handleNameSave}>
              保存
            </button>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>家庭档案</h2>
          <div className={styles.sectionActions}>
            {familyInfo && (
              <>
                <button className={styles.sectionAction} onClick={() => setRolesDrawerOpen(true)}>
                  管理角色
                </button>
                <Link to="/family/create" className={styles.sectionAction}>切换家庭</Link>
              </>
            )}
            {familyInfo ? null : <Link to="/family/create" className={styles.sectionAction}>创建家庭</Link>}
          </div>
        </div>
        
        {familyInfo ? (
          <>
            <div className={styles.familyInfo}>
              <h3 className={styles.familyName}>{familyInfo.name}</h3>
              <div className={styles.familyCodeWrap} onClick={handleCopy} title="复制邀请码">
                <span className={styles.familyCodeLabel}>邀请码 / </span>
                <span className={styles.familyCode}>{familyInfo.invite_code}</span>
                {copied ? <Check size={12} className={styles.copyIcon} /> : <Copy size={12} className={styles.copyIcon} />}
              </div>
            </div>

            <div className={styles.memberList}>
              {members.map(m => (
                <div key={m.id} className={styles.memberItem}>
                  <div className={styles.memberAvatar}>
                    {m.avatar ? <img src={m.avatar} alt="avatar" /> : (m.user_name?.[0] || '用')}
                  </div>
                  <div className={styles.memberInfo}>
                    <div className={styles.memberName}>
                      {m.user_name || m.phone}
                      {m.user_id === user?.id && <span className={styles.meTag}>自己</span>}
                    </div>
                    <span className={styles.memberRole}>
                      {m.nickname || '未设置角色'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <p>您还没有加入任何家庭。加入后，系统可以为您全家定制菜谱。</p>
            <Link to="/family/join" className={styles.linkText}>输入邀请码加入</Link>
          </div>
        )}
      </div>

      {memberId && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>口味偏好</h2>
            <div className={styles.sectionActions}>
              <button className={styles.sectionAction} onClick={() => setPrefsDrawerOpen(true)}>
                编辑
              </button>
            </div>
          </div>

          <TagPicker label="喜爱口味" options={FLAVOR_OPTIONS} selected={prefs.liked_flavors} onChange={() => {}} disabled />
          <TagPicker label="偏好菜系" options={CUISINE_OPTIONS} selected={prefs.liked_cuisines} onChange={() => {}} disabled />
          <TagPicker label="忌口口味" options={FLAVOR_OPTIONS} selected={prefs.disliked_flavors} onChange={() => {}} disabled />
          <TagPicker label="过敏食材" options={ALLERGY_OPTIONS} selected={prefs.allergies} onChange={() => {}} disabled />
        </div>
      )}

      <button className={styles.logoutBtn} onClick={handleLogout}>退出登录</button>

      <PrefsDrawer
        open={prefsDrawerOpen}
        prefs={prefs}
        onSave={async (updated) => {
          await handleSave(updated)
          setPrefs(updated)
        }}
        onClose={() => setPrefsDrawerOpen(false)}
      />

      <RolesDrawer
        open={rolesDrawerOpen}
        members={members}
        currentUserId={user.id}
        onRoleChange={async (userId, role) => {
          await familiesApi.updateMember(familyId, userId, { nickname: role })
          setMembers(members.map(m => m.user_id === userId ? { ...m, nickname: role } : m))
        }}
        onClose={() => setRolesDrawerOpen(false)}
      />

      {avatarPreviewUrl && (
        <div className={styles.avatarModalOverlay} onClick={!avatarUploading ? handleAvatarCancel : undefined}>
          <div className={styles.avatarModal} onClick={e => e.stopPropagation()}>
            <div className={styles.avatarImgWrap}>
              <img src={avatarPreviewUrl} alt="头像预览" className={styles.avatarModalImg} />
              {avatarUploading && (
                <div className={styles.avatarUploadOverlay}>
                  <span className={styles.avatarUploadPct}>{avatarProgress}%</span>
                </div>
              )}
            </div>
            <div className={styles.avatarModalActions}>
              <button className={styles.cancelProfileBtn} onClick={handleAvatarCancel} disabled={avatarUploading}>
                取消
              </button>
              <button className={styles.saveProfileBtn} onClick={handleAvatarConfirm} disabled={avatarUploading}>
                {avatarUploading ? '上传中...' : '使用此头像'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
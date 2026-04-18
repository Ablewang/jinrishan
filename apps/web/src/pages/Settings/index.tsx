import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { familiesApi } from '../../api/families'
import styles from './Settings.module.css'

interface Prefs {
  liked_cuisines: string[]
  liked_flavors: string[]
  liked_ingredients: string[]
  disliked_cuisines: string[]
  disliked_flavors: string[]
  disliked_ingredients: string[]
  allergies: string[]
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
  label, options, selected, onChange
}: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt])
  }
  return (
    <div className={styles.prefGroup}>
      <label className={styles.prefLabel}>{label}</label>
      <div className={styles.tagRow}>
        {options.map(opt => (
          <button
            key={opt}
            className={`${styles.tagBtn} ${selected.includes(opt) ? styles.tagBtnActive : ''}`}
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
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [familyInfo, setFamilyInfo] = useState<{ id: number; name: string; invite_code: string } | null>(null)
  const [memberId, setMemberId] = useState<number | null>(null)
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const familyId = Number(localStorage.getItem('familyId') ?? '0')

  useEffect(() => {
    if (!familyId || !user) return
    familiesApi.get(familyId).then(setFamilyInfo).catch(() => {})
    familiesApi.members(familyId).then(members => {
      const me = members.find(m => m.user_id === user.id)
      if (!me) return
      setMemberId(me.id)
      return familiesApi.getPreferences(familyId, me.id)
    }).then(p => {
      if (p) setPrefs(p)
    }).catch(() => {})
  }, [familyId, user])

  async function handleSave() {
    if (!memberId || !familyId) return
    setSaving(true)
    try {
      await familiesApi.updatePreferences(familyId, memberId, prefs)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
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

  if (!user) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>我的</h1>
        <div className={styles.guestBox}>
          <div className={styles.guestIcon}>👤</div>
          <p className={styles.guestText}>登录后可设置家庭偏好，获得更精准的推荐</p>
          <Link to="/auth/login" className={styles.btnPrimary}>登录 / 注册</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>我的</h1>

      <div className={styles.userCard}>
        <div className={styles.avatar}>👤</div>
        <div className={styles.userInfo}>
          <p className={styles.userName}>{user.name ?? '用户'}</p>
          <p className={styles.userPhone}>{user.phone}</p>
        </div>
      </div>

      {familyInfo ? (
        <div className={styles.familyCard}>
          <div className={styles.familyInfo}>
            <span className={styles.familyName}>🏠 {familyInfo.name}</span>
            <span className={styles.familyCode}>邀请码：{familyInfo.invite_code}</span>
          </div>
        </div>
      ) : (
        <div className={styles.familyActions}>
          <Link to="/family/create" className={styles.btnOutline}>创建家庭</Link>
          <Link to="/family/join" className={styles.btnOutline}>加入家庭</Link>
        </div>
      )}

      {memberId && (
        <div className={styles.prefsSection}>
          <h2 className={styles.sectionTitle}>我的口味偏好</h2>

          <TagPicker
            label="喜欢的口味"
            options={FLAVOR_OPTIONS}
            selected={prefs.liked_flavors}
            onChange={v => setPrefs(p => ({ ...p, liked_flavors: v }))}
          />
          <TagPicker
            label="喜欢的菜系"
            options={CUISINE_OPTIONS}
            selected={prefs.liked_cuisines}
            onChange={v => setPrefs(p => ({ ...p, liked_cuisines: v }))}
          />
          <TagPicker
            label="不喜欢的口味"
            options={FLAVOR_OPTIONS}
            selected={prefs.disliked_flavors}
            onChange={v => setPrefs(p => ({ ...p, disliked_flavors: v }))}
          />
          <TagPicker
            label="过敏食材"
            options={ALLERGY_OPTIONS}
            selected={prefs.allergies}
            onChange={v => setPrefs(p => ({ ...p, allergies: v }))}
          />

          <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
            {saved ? '✓ 已保存' : saving ? '保存中...' : '保存偏好'}
          </button>
        </div>
      )}

      <div className={styles.logoutArea}>
        <button className={styles.btnLogout} onClick={handleLogout}>退出登录</button>
      </div>
    </div>
  )
}

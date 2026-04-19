import { useState, useEffect } from 'react'
import styles from './PrefsDrawer.module.css'

interface Prefs {
  liked_cuisines: string[]
  liked_flavors: string[]
  disliked_flavors: string[]
  allergies: string[]
  [key: string]: string[]
}

interface Props {
  open: boolean
  prefs: Prefs
  title?: string
  onSave: (prefs: Prefs) => Promise<void>
  onClose: () => void
}

const FLAVOR_OPTIONS = ['清淡', '香辣', '酸甜', '鲜香', '咸鲜', '浓郁', '麻辣', '家常']
const CUISINE_OPTIONS = ['川菜', '粤菜', '湘菜', '东北菜', '闽菜', '徽菜', '苏菜', '浙菜', '家常菜']
const ALLERGY_OPTIONS = ['花生', '海鲜', '牛奶', '鸡蛋', '大豆', '小麦', '坚果', '芝麻']

function TagGroup({ label, options, selected, onChange }: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt])
  }
  return (
    <div className={styles.group}>
      <div className={styles.groupLabel}>{label}</div>
      <div className={styles.tags}>
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

export default function PrefsDrawer({ open, prefs, title, onSave, onClose }: Props) {
  const [local, setLocal] = useState<Prefs>(prefs)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setLocal(prefs) }, [open])

  function set(key: keyof Prefs, val: string[]) {
    setLocal(p => ({ ...p, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(local)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`${styles.overlay} ${open ? styles.open : ''}`} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title || '口味偏好'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <TagGroup label="喜欢的口味" options={FLAVOR_OPTIONS} selected={local.liked_flavors} onChange={v => set('liked_flavors', v)} />
          <TagGroup label="偏好菜系" options={CUISINE_OPTIONS} selected={local.liked_cuisines} onChange={v => set('liked_cuisines', v)} />
          <TagGroup label="不喜欢的口味" options={FLAVOR_OPTIONS} selected={local.disliked_flavors} onChange={v => set('disliked_flavors', v)} />
          <TagGroup label="过敏食材" options={ALLERGY_OPTIONS} selected={local.allergies} onChange={v => set('allergies', v)} />
        </div>

        <div className={styles.footer}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

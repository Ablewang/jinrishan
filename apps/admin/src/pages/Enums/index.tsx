import { useEffect, useState } from 'react'
import { adminEnumsApi } from '../../api/enums'
import type { EnumValue } from '../../types'
import styles from './Enums.module.css'

const ENUM_TYPE_LABELS: Record<string, string> = {
  cuisine: '菜系',
  category: '菜品分类',
  cooking_method: '烹饪方式',
  flavor: '口味',
  protein_type: '蛋白质类型',
  nutrition_tag: '营养标签',
  season: '季节',
  allergy: '过敏原',
}

export default function EnumManager() {
  const [allEnums, setAllEnums] = useState<Record<string, EnumValue[]>>({})
  const [activeType, setActiveType] = useState('')
  const [editing, setEditing] = useState<EnumValue[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminEnumsApi.list().then(data => {
      setAllEnums(data)
      const firstType = Object.keys(data)[0] ?? ''
      setActiveType(firstType)
      setEditing(data[firstType] ? [...data[firstType]] : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function selectType(type: string) {
    setActiveType(type)
    setEditing(allEnums[type] ? [...allEnums[type]] : [])
    setSaved(false)
  }

  function updateValue(index: number, field: 'value' | 'label', val: string) {
    setEditing(prev => prev.map((e, i) => i === index ? { ...e, [field]: val } : e))
  }

  function addValue() {
    setEditing(prev => [...prev, { id: 0, enum_type: activeType, value: '', label: '', sort_order: prev.length + 1 }])
  }

  function removeValue(index: number) {
    setEditing(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const values = editing.filter(e => e.value.trim()).map((e, i) => ({ value: e.value, label: e.label || e.value, sort_order: i + 1 }))
      await adminEnumsApi.update(activeType, values)
      const updated = { ...allEnums, [activeType]: editing }
      setAllEnums(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className={styles.loading}>加载中...</div>

  const types = Object.keys(allEnums)

  return (
    <div>
      <h1 className={styles.title}>枚举管理</h1>
      <div className={styles.layout}>
        <aside className={styles.typeList}>
          {types.map(type => (
            <button
              key={type}
              className={`${styles.typeItem} ${type === activeType ? styles.typeItemActive : ''}`}
              onClick={() => selectType(type)}
            >
              {ENUM_TYPE_LABELS[type] ?? type}
              <span className={styles.typeCount}>{allEnums[type]?.length ?? 0}</span>
            </button>
          ))}
        </aside>
        <div className={styles.editor}>
          <div className={styles.editorHeader}>
            <h2 className={styles.editorTitle}>{ENUM_TYPE_LABELS[activeType] ?? activeType}</h2>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saved ? '✓ 已保存' : saving ? '保存中...' : '保存'}
            </button>
          </div>
          <div className={styles.valueList}>
            {editing.map((e, i) => (
              <div key={i} className={styles.valueRow}>
                <input
                  className={styles.valueInput}
                  placeholder="值 (value)"
                  value={e.value}
                  onChange={ev => updateValue(i, 'value', ev.target.value)}
                />
                <input
                  className={styles.labelInput}
                  placeholder="显示名 (label, 可与值相同)"
                  value={e.label}
                  onChange={ev => updateValue(i, 'label', ev.target.value)}
                />
                <button className={styles.removeBtn} onClick={() => removeValue(i)}>×</button>
              </div>
            ))}
          </div>
          <button className={styles.addBtn} onClick={addValue}>+ 添加值</button>
        </div>
      </div>
    </div>
  )
}

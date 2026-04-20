import { useState } from 'react'
import RecipePicker from '../RecipePicker'
import type { Recipe } from '../../types'
import styles from './DayDrawer.module.css'

interface Props {
  date: string
  dateLabel: string
  familyId: number
  existingRecipeIds: number[]
  onAdd: (mealType: string, recipes: { id: number; name: string }[]) => Promise<void>
  onClose: () => void
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
const MEAL_LABELS: Record<string, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }

export default function DayDrawer({ date: _date, dateLabel, familyId, existingRecipeIds, onAdd, onClose }: Props) {
  const [activeMeal, setActiveMeal] = useState(0)
  const [selectedByMeal, setSelectedByMeal] = useState<Record<string, Map<number, Recipe>>>({})
  const [confirming, setConfirming] = useState(false)

  const mealType = MEAL_TYPES[activeMeal]

  function handleToggle(recipe: Recipe) {
    setSelectedByMeal(prev => {
      const map = new Map(prev[mealType] ?? [])
      map.has(recipe.id) ? map.delete(recipe.id) : map.set(recipe.id, recipe)
      return { ...prev, [mealType]: map }
    })
  }

  const selectedIds = new Set((selectedByMeal[mealType] ?? new Map()).keys())
  const totalSelected = Object.values(selectedByMeal).reduce((sum, m) => sum + m.size, 0)

  async function handleConfirm() {
    setConfirming(true)
    try {
      for (const mt of MEAL_TYPES) {
        const map = selectedByMeal[mt]
        if (!map?.size) continue
        await onAdd(mt, [...map.values()].map(r => ({ id: r.id, name: r.name })))
      }
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerMeta}>
            <span className={styles.drawerDate}>{dateLabel}</span>
            <h2 className={styles.drawerTitle}>选菜</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.tabs}>
          {MEAL_TYPES.map((mt, i) => {
            const count = (selectedByMeal[mt] ?? new Map()).size
            return (
              <button
                key={mt}
                className={`${styles.tab} ${activeMeal === i ? styles.tabActive : ''}`}
                onClick={() => setActiveMeal(i)}
              >
                {MEAL_LABELS[mt]}
                {count > 0 && <span className={styles.tabBadge}>({count})</span>}
              </button>
            )
          })}
        </div>

        <div className={styles.pickerWrap}>
          <RecipePicker
            key={mealType}
            mealType={mealType}
            familyId={familyId}
            excludeIds={existingRecipeIds}
            mode="multi"
            selectedIds={selectedIds}
            onToggle={handleToggle}
          />
        </div>

        {totalSelected > 0 && (
          <div className={styles.confirmBar}>
            <span className={styles.confirmText}>已选 {totalSelected} 道菜</span>
            <button className={styles.confirmBtn} onClick={handleConfirm} disabled={confirming}>
              {confirming ? '添加中...' : '加入计划'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

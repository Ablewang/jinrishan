import { useEffect, useState, useCallback } from 'react'
import { recommendApi } from '../../api/recommend'
import RecipeImages from '../RecipeImages'
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

export default function DayDrawer({ date, dateLabel, familyId, existingRecipeIds, onAdd, onClose }: Props) {
  const [activeMeal, setActiveMeal] = useState(0)
  const [recipesByMeal, setRecipesByMeal] = useState<Record<string, Recipe[]>>({})
  const [selectedByMeal, setSelectedByMeal] = useState<Record<string, Set<number>>>({})
  const [loadingMeal, setLoadingMeal] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const mealType = MEAL_TYPES[activeMeal]

  const load = useCallback(async (mt: string) => {
    if (recipesByMeal[mt]) return
    setLoadingMeal(mt)
    try {
      const results = await recommendApi.get({ family_id: familyId, meal_type: mt })
      setRecipesByMeal(prev => ({ ...prev, [mt]: results.filter(r => !existingRecipeIds.includes(r.id)) }))
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMeal(null)
    }
  }, [familyId, existingRecipeIds, recipesByMeal])

  useEffect(() => { load(mealType) }, [mealType]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSelect(mt: string, id: number) {
    setSelectedByMeal(prev => {
      const set = new Set(prev[mt] ?? [])
      set.has(id) ? set.delete(id) : set.add(id)
      return { ...prev, [mt]: set }
    })
  }

  const totalSelected = Object.values(selectedByMeal).reduce((sum, s) => sum + s.size, 0)

  async function handleConfirm() {
    setConfirming(true)
    try {
      for (const mt of MEAL_TYPES) {
        const ids = [...(selectedByMeal[mt] ?? [])]
        if (ids.length === 0) continue
        const recipes = (recipesByMeal[mt] ?? []).filter(r => ids.includes(r.id))
        await onAdd(mt, recipes.map(r => ({ id: r.id, name: r.name })))
      }
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setConfirming(false)
    }
  }

  const recipes = recipesByMeal[mealType] ?? []
  const selected = selectedByMeal[mealType] ?? new Set<number>()

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
            const count = (selectedByMeal[mt] ?? new Set()).size
            return (
              <button
                key={mt}
                className={`${styles.tab} ${activeMeal === i ? styles.tabActive : ''}`}
                onClick={() => setActiveMeal(i)}
              >
                {MEAL_LABELS[mt]}
                {count > 0 && <span className={styles.tabBadge}>{count}</span>}
              </button>
            )
          })}
        </div>

        <div className={styles.recipeList}>
          {loadingMeal === mealType ? (
            <div className={styles.loading}><div className={styles.loadingIcon} /></div>
          ) : recipes.length === 0 ? (
            <div className={styles.empty}>暂无推荐</div>
          ) : recipes.map(recipe => {
            const isSelected = selected.has(recipe.id)
            const diffLabel = { easy: '简单', medium: '中等', hard: '复杂' }[recipe.difficulty] ?? recipe.difficulty
            return (
              <article key={recipe.id} className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}>
                <div className={styles.cardImage}>
                  <RecipeImages images={recipe.images} alt={recipe.name} />
                  {isSelected && <div className={styles.selectedBadge}>✓</div>}
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardName}>{recipe.name}</h3>
                  <p className={styles.cardDesc}>{recipe.description}</p>
                  <div className={styles.cardMeta}>
                    <span>{recipe.cook_time} 分钟</span>
                    <span>·</span>
                    <span>{diffLabel}</span>
                    {recipe.cuisine && <><span>·</span><span>{recipe.cuisine}</span></>}
                  </div>
                </div>
                <div className={styles.cardSelectArea}>
                  <button
                    className={`${styles.selectBtn} ${isSelected ? styles.selectBtnActive : ''}`}
                    onClick={() => toggleSelect(mealType, recipe.id)}
                  >
                    ✓
                  </button>
                </div>
              </article>
            )
          })}
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

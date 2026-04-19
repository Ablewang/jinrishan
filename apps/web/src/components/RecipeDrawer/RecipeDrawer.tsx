import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Clock, Flame, Utensils } from 'lucide-react'
import { recipesApi } from '../../api/recipes'
import { eventsApi } from '../../api/events'
import RecipeImages from '../RecipeImages'
import type { Recipe } from '../../types'
import styles from './RecipeDrawer.module.css'

interface Props {
  id: number | null
  onClose: () => void
  familyId?: number
  onSwap?: () => void
  showSwapLimit?: boolean
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function RecipeDrawer({ id, onClose, familyId = 0, onSwap, showSwapLimit }: Props) {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooked, setCooked] = useState(false)

  useEffect(() => {
    if (!id) {
      // Do not clear recipe immediately so it stays visible during the slide-down animation
      return
    }
    setLoading(true)
    recipesApi.get(id).then(r => {
      setRecipe(r)
      setLoading(false)
      eventsApi.post({
        family_id: familyId,
        recipe_id: r.id,
        event_type: 'accepted',
        event_date: todayStr(),
        source: 'drawer',
      }).catch(() => {})
    }).catch(() => setLoading(false))
  }, [id, familyId])

  function handleCooked() {
    if (!recipe) return
    eventsApi.post({
      family_id: familyId,
      recipe_id: recipe.id,
      event_type: 'cooked',
      event_date: todayStr(),
      source: 'drawer',
    }).catch(() => {})
    setCooked(true)
  }

  return (
    <div className={`${styles.overlay} ${id ? styles.open : ''}`} onClick={onClose}>
      <div className={styles.drawer} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={24} strokeWidth={1.5} />
        </button>

        {loading ? (
          <div className={styles.loading}>加载中...</div>
        ) : recipe ? (
          <>
          <div className={styles.content}>
            <div className={styles.hero}>
              <RecipeImages images={recipe.images} alt={recipe.name} className={styles.heroImg} />
            </div>

            <div className={styles.body}>
              <h1 className={styles.name}>{recipe.name}</h1>
              <p className={styles.desc}>{recipe.description}</p>

              <div className={styles.metaRow}>
                <span className={styles.metaItem}>
                  <Clock size={16} /> {recipe.cook_time} 分钟
                </span>
                <span className={styles.metaItem}>
                  <Flame size={16} /> {recipe.difficulty === 'easy' ? '简单' : recipe.difficulty === 'medium' ? '中等' : '复杂'}
                </span>
                {recipe.cuisine && (
                  <span className={styles.metaItem}>
                    <Utensils size={16} /> {recipe.cuisine}
                  </span>
                )}
              </div>

              <div className={styles.tagRow}>
                {recipe.flavors?.map(f => <span key={f} className={styles.tag}>{f}</span>)}
                {recipe.nutrition_tags?.map(t => <span key={t} className={styles.tag}>{t}</span>)}
              </div>

              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>食材</h2>
                  <div className={styles.ingredientGrid}>
                    {recipe.ingredients.map((ing, i) => (
                      <div key={i} className={styles.ingredient}>
                        <span className={styles.ingName}>{ing.name}</span>
                        <span className={styles.ingAmount}>{ing.amount}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {recipe.steps && recipe.steps.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.sectionTitle}>做法步骤</h2>
                  {recipe.steps.map(step => (
                    <div key={step.step_order} className={styles.step}>
                      <div className={styles.stepNum}>{step.step_order}</div>
                      <div className={styles.stepContent}>
                        <p className={styles.stepDesc}>{step.description}</p>
                        {step.duration && (
                          <span className={styles.stepTime}>约 {step.duration} 分钟</span>
                        )}
                      </div>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </div>
          <div className={styles.cookedArea}>
            {cooked ? (
              <div className={styles.cookedDone}>✓ 已做完</div>
            ) : (
              <div className={styles.actionRow}>
                <button className={styles.cookedBtn} onClick={handleCooked}>
                  已完成这道菜
                </button>
                {onSwap && (
                  showSwapLimit ? (
                    <Link to="/auth/login" className={styles.btnSwapLock}>
                      登录解锁换一换
                    </Link>
                  ) : (
                    <button className={styles.btnSwap} onClick={onSwap}>
                      换一换
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </>
        ) : (
          <div className={styles.error}>获取菜谱失败</div>
        )}
      </div>
    </div>
  )
}
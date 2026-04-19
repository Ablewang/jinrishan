import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { recipesApi } from '../../api/recipes'
import { eventsApi } from '../../api/events'
import RecipeImages from '../../components/RecipeImages'
import type { Recipe } from '../../types'
import styles from './RecipeDetail.module.css'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [cooked, setCooked] = useState(false)

  const familyId = user ? (Number(localStorage.getItem('familyId')) || 0) : 0

  useEffect(() => {
    if (!id) return
    recipesApi.get(Number(id)).then(r => {
      setRecipe(r)
      setLoading(false)
      eventsApi.post({
        family_id: familyId,
        recipe_id: r.id,
        event_type: 'accepted',
        event_date: todayStr(),
        source: 'daily',
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
      source: 'daily',
    }).catch(() => {})
    setCooked(true)
  }

  if (loading) return <div className={styles.loading}>加载中...</div>
  if (!recipe) return (
    <div className={styles.error}>
      <p>菜谱不存在</p>
      <button onClick={() => navigate(-1)} className={styles.backBtn}>返回</button>
    </div>
  )

  const difficultyLabel = { easy: '简单', medium: '中等', hard: '复杂' }[recipe.difficulty] ?? recipe.difficulty

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← 返回</button>

        <div className={styles.hero}>
          <RecipeImages images={recipe.images} alt={recipe.name} className={styles.heroImg} />
        </div>

        <div className={styles.content}>
        <h1 className={styles.name}>{recipe.name}</h1>
        <p className={styles.desc}>{recipe.description}</p>

        <div className={styles.meta}>
          <span className={styles.metaItem}>🕐 {recipe.cook_time} 分钟</span>
          <span className={styles.metaItem}>📊 {difficultyLabel}</span>
          {recipe.cuisine && <span className={styles.metaItem}>🍜 {recipe.cuisine}</span>}
          {recipe.spicy_level > 0 && (
            <span className={styles.metaItem}>🌶️ {'辣'.repeat(recipe.spicy_level)}</span>
          )}
        </div>

        <div className={styles.tagRow}>
          {recipe.flavors?.map(f => <span key={f} className={styles.tag}>{f}</span>)}
          {recipe.nutrition_tags?.map(t => <span key={t} className={`${styles.tag} ${styles.tagGreen}`}>{t}</span>)}
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
            <h2 className={styles.sectionTitle}>步骤</h2>
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

        <div className={styles.cookedArea}>
          {cooked ? (
            <div className={styles.cookedDone}>✓ 已记录，吃得开心！</div>
          ) : (
            <button className={styles.cookedBtn} onClick={handleCooked}>
              ✓ 已做完，记录一下
            </button>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

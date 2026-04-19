import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import { recipesApi } from '../../api/recipes'
import RecipeImages from '../../components/RecipeImages'
import type { Recipe } from '../../types'
import styles from './index.module.css'

const MEAL_LABELS: Record<string, string> = {
  breakfast: '早餐', lunch: '午餐', dinner: '晚餐',
}

export default function TodayMeal() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { mealType } = useParams()
  const recipeIds = (searchParams.get('ids') ?? '').split(',').map(Number).filter(Boolean)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!recipeIds.length) {
      navigate('/today', { replace: true })
      return
    }
    Promise.all(recipeIds.map(id => recipesApi.get(id)))
      .then(results => { setRecipes(results); setLoading(false) })
      .catch(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const mealLabel = MEAL_LABELS[mealType ?? ''] ?? '今日菜单'
  const recipe = recipes[activeIdx]

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingIcon} />
        <span>加载中...</span>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/today')}>← 今日菜单</button>
        <div className={styles.headerInner}>
          <span className={styles.overline}>Today's Menu</span>
          <h1 className={styles.title}>{mealLabel}菜单</h1>
          {recipes.length > 0 && (
            <p className={styles.subtitle}>{recipes.length} 道菜 · 跟着步骤一起来做</p>
          )}
        </div>
      </header>

      {recipes.length > 1 && (
        <div className={styles.tabs}>
          {recipes.map((r, i) => (
            <button
              key={r.id}
              className={`${styles.tab} ${i === activeIdx ? styles.tabActive : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      {recipe && <RecipePanel recipe={recipe} />}
    </div>
  )
}

function RecipePanel({ recipe }: { recipe: Recipe }) {
  const difficultyLabel = { easy: '简单', medium: '中等', hard: '复杂' }[recipe.difficulty] ?? recipe.difficulty

  return (
    <div className={styles.panel}>
      <div className={styles.heroImg}>
        <RecipeImages images={recipe.images} alt={recipe.name} />
      </div>

      <div className={styles.panelBody}>
        <h2 className={styles.recipeName}>{recipe.name}</h2>
        <div className={styles.recipeMeta}>
          <span>{recipe.cook_time} 分钟</span>
          <span className={styles.metaDot}>·</span>
          <span>{difficultyLabel}</span>
          {recipe.cuisine && <><span className={styles.metaDot}>·</span><span>{recipe.cuisine}</span></>}
        </div>

        {recipe.ingredients?.length > 0 && (
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>食材</h3>
            <div className={styles.ingredientGrid}>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className={styles.ingredient}>
                  <span className={styles.ingName}>{ing.name}</span>
                  <span className={styles.ingAmount}>{ing.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recipe.steps?.length > 0 && (
          <div className={styles.block}>
            <h3 className={styles.blockTitle}>步骤</h3>
            {recipe.steps.map(step => (
              <div key={step.step_order} className={styles.step}>
                <div className={styles.stepNum}>{step.step_order}</div>
                <div className={styles.stepContent}>
                  <p className={styles.stepDesc}>{step.description}</p>
                  {step.duration && <span className={styles.stepTime}>约 {step.duration} 分钟</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

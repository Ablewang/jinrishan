import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { recommendApi } from '../../api/recommend'
import { eventsApi } from '../../api/events'
import type { Recipe, GuestPrefs } from '../../types'
import styles from './index.module.css'

const MEAL_TYPES = ['早餐', '午餐', '晚餐']
const MEAL_KEYS = ['breakfast', 'lunch', 'dinner']
const SWAP_LIMIT = 3

function getGuestPrefs(): GuestPrefs | null {
  try { return JSON.parse(localStorage.getItem('guestPrefs') ?? '') } catch { return null }
}

function saveGuestPrefs(p: GuestPrefs) {
  localStorage.setItem('guestPrefs', JSON.stringify(p))
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

interface RecipeCardProps {
  recipe: Recipe
  onSwap: () => void
  onAccept: () => void
  showSwapLimit: boolean
  familyId?: number
}

function RecipeCard({ recipe, onSwap, onAccept, showSwapLimit, familyId }: RecipeCardProps) {
  const navigate = useNavigate()

  const difficultyLabel = { easy: '简单', medium: '中等', hard: '复杂' }[recipe.difficulty] ?? recipe.difficulty

  return (
    <div className={styles.card}>
      <div className={styles.cardImage}>
        {recipe.images?.[0]
          ? <img src={recipe.images[0]} alt={recipe.name} />
          : <div className={styles.imagePlaceholder}>🍳</div>
        }
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardName}>{recipe.name}</h3>
        <p className={styles.cardDesc}>{recipe.description}</p>
        <div className={styles.tags}>
          {recipe.cuisine && <span className={styles.tag}>{recipe.cuisine}</span>}
          {recipe.flavors?.slice(0, 2).map(f => <span key={f} className={styles.tag}>{f}</span>)}
          <span className={styles.tag}>{recipe.cook_time}分钟</span>
          <span className={styles.tag}>{difficultyLabel}</span>
        </div>
        <div className={styles.cardActions}>
          <button className={styles.btnDetail} onClick={() => navigate(`/recipe/${recipe.id}`)}>
            查看做法
          </button>
          <button className={styles.btnAccept} onClick={onAccept}>
            ✓ 就吃这个
          </button>
          {showSwapLimit ? (
            <Link to="/auth/login" className={styles.btnSwapLock}>
              登录解锁换一换
            </Link>
          ) : (
            <button className={styles.btnSwap} onClick={onSwap}>
              换一换
            </button>
          )}
        </div>
        {!familyId && (
          <p className={styles.guestHint}>
            <Link to="/auth/login">登录</Link> 可获得更精准的家庭专属推荐
          </p>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeMeal, setActiveMeal] = useState(2) // 默认晚餐
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(false)
  const [swapCount, setSwapCount] = useState(0)
  const [excludeIds, setExcludeIds] = useState<number[]>([])

  const familyId = user ? (Number(localStorage.getItem('familyId')) || 0) : 0

  const loadRecommendation = useCallback(async (excludes: number[] = []) => {
    setLoading(true)
    try {
      const prefs = getGuestPrefs()
      if (!user && !prefs) {
        navigate('/onboarding', { replace: true })
        return
      }
      const mealType = MEAL_KEYS[activeMeal]
      let results: Recipe[]
      if (familyId) {
        results = await recommendApi.get({ family_id: familyId, date: todayStr(), meal_type: mealType })
      } else {
        results = await recommendApi.get({
          meal_type: mealType,
          allergies: prefs?.allergies ?? [],
          flavors: prefs?.liked_flavors ?? [],
        })
      }
      const filtered = results.filter(r => !excludes.includes(r.id))
      const picked = filtered[0] ?? results[0]
      if (picked) {
        setRecipe(picked)
        eventsApi.post({
          family_id: familyId,
          recipe_id: picked.id,
          event_type: 'shown',
          meal_type: mealType,
          event_date: todayStr(),
          source: 'daily',
        }).catch(() => {})
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user, familyId, activeMeal, navigate])

  useEffect(() => {
    const prefs = getGuestPrefs()
    if (!user && !prefs) {
      navigate('/onboarding', { replace: true })
      return
    }
    const p = prefs
    setSwapCount(p?.swap_count ?? 0)
    setExcludeIds([])
    loadRecommendation([])
  }, [activeMeal, user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSwap() {
    if (!user) {
      const prefs = getGuestPrefs()
      const count = (prefs?.swap_count ?? 0) + 1
      if (prefs) saveGuestPrefs({ ...prefs, swap_count: count })
      setSwapCount(count)
      if (count > SWAP_LIMIT) return
    }
    const newExcludes = recipe ? [...excludeIds, recipe.id] : excludeIds
    setExcludeIds(newExcludes)
    if (recipe) {
      eventsApi.post({
        family_id: familyId,
        recipe_id: recipe.id,
        event_type: 'rejected',
        meal_type: MEAL_KEYS[activeMeal],
        event_date: todayStr(),
        source: 'daily',
      }).catch(() => {})
    }
    await loadRecommendation(newExcludes)
  }

  function handleAccept() {
    if (!recipe) return
    eventsApi.post({
      family_id: familyId,
      recipe_id: recipe.id,
      event_type: 'accepted',
      meal_type: MEAL_KEYS[activeMeal],
      event_date: todayStr(),
      source: 'daily',
    }).catch(() => {})
  }

  const showSwapLimit = !user && swapCount >= SWAP_LIMIT

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>今日推荐</h1>
        <span className={styles.date}>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
      </header>

      <div className={styles.mealTabs}>
        {MEAL_TYPES.map((label, i) => (
          <button
            key={label}
            className={`${styles.mealTab} ${activeMeal === i ? styles.mealTabActive : ''}`}
            onClick={() => setActiveMeal(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : recipe ? (
        <RecipeCard
          recipe={recipe}
          onSwap={handleSwap}
          onAccept={handleAccept}
          showSwapLimit={showSwapLimit}
          familyId={familyId || undefined}
        />
      ) : (
        <div className={styles.empty}>暂无推荐，请稍后重试</div>
      )}
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Utensils, Clock, Flame } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { recommendApi } from '../../api/recommend'
import { eventsApi } from '../../api/events'
import RecipeDrawer from '../../components/RecipeDrawer'
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
  onViewDetail: () => void
  showSwapLimit: boolean
  isLoggedIn: boolean
}

function RecipeCard({ recipe, onSwap, onAccept, onViewDetail, showSwapLimit, isLoggedIn }: RecipeCardProps) {
  const difficultyLabel = { easy: '简单', medium: '中等', hard: '复杂' }[recipe.difficulty] ?? recipe.difficulty

  return (
    <article className={styles.card}>
      <div className={styles.cardImageWrapper}>
        <div className={styles.cardImage}>
          {recipe.images?.[0]
            ? <img src={recipe.images[0]} alt={recipe.name} />
            : <div className={styles.imagePlaceholder}>NO IMAGE</div>
          }
        </div>
      </div>
      
      <div className={styles.cardBody}>
        <header className={styles.cardHeader}>
          <div className={styles.tags}>
            {recipe.flavors?.slice(0, 3).map((f, i) => (
              <span key={f} className={styles.tag}>
                {i > 0 && <span className={styles.tagDot}>·</span>}
                {f}
              </span>
            ))}
          </div>
          <h3 className={styles.cardName}>{recipe.name}</h3>
          <p className={styles.cardDesc}>{recipe.description}</p>
        </header>
        
        <div className={styles.cardMetaGrid}>
          <div className={styles.metaBlock}>
            <span className={styles.metaLabel}>TIME</span>
            <span className={styles.metaValue}>{recipe.cook_time} M</span>
          </div>
          <div className={styles.metaBlock}>
            <span className={styles.metaLabel}>LEVEL</span>
            <span className={styles.metaValue}>{difficultyLabel}</span>
          </div>
          {recipe.cuisine ? (
            <div className={styles.metaBlock}>
              <span className={styles.metaLabel}>CUISINE</span>
              <span className={styles.metaValue}>{recipe.cuisine}</span>
            </div>
          ) : (
            <div className={styles.metaBlock}>
              <span className={styles.metaLabel}>TYPE</span>
              <span className={styles.metaValue}>家常</span>
            </div>
          )}
        </div>
        
        <div className={styles.cardActions}>
          <button className={styles.btnAccept} onClick={onAccept}>
            就吃这个
          </button>
          <div className={styles.actionRow}>
            <button className={styles.btnDetail} onClick={onViewDetail}>
              查看做法
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
        </div>
        {!isLoggedIn && (
          <p className={styles.guestHint}>
            <Link to="/auth/login">登录</Link> 可获得更精准的家庭专属推荐
          </p>
        )}
      </div>
    </article>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeMeal, setActiveMeal] = useState(2) // 默认晚餐
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
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
      const picked = filtered.slice(0, 3)
      if (picked.length > 0) {
        setRecipes(picked)
        eventsApi.post({
          family_id: familyId,
          recipe_id: picked[0].id, // Log the first one for simplicity
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

  async function handleSwap(recipeToSwap: Recipe) {
    if (!user) {
      const prefs = getGuestPrefs()
      const count = (prefs?.swap_count ?? 0) + 1
      if (prefs) saveGuestPrefs({ ...prefs, swap_count: count })
      setSwapCount(count)
      if (count > SWAP_LIMIT) return
    }
    const newExcludes = [...excludeIds, recipeToSwap.id]
    setExcludeIds(newExcludes)
    eventsApi.post({
      family_id: familyId,
      recipe_id: recipeToSwap.id,
      event_type: 'rejected',
      meal_type: MEAL_KEYS[activeMeal],
      event_date: todayStr(),
      source: 'daily',
    }).catch(() => {})
    
    await loadRecommendation(newExcludes)
  }

  function handleAccept(recipeToAccept: Recipe) {
    eventsApi.post({
      family_id: familyId,
      recipe_id: recipeToAccept.id,
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
        <span className={styles.overline}>Daily Inspiration</span>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>今日推荐</h1>
          <span className={styles.date}>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
        </div>
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
        <div className={styles.loading}>
          <div className={styles.loadingIcon} />
          <span>Curating recipes...</span>
        </div>
      ) : recipes.length > 0 ? (
        <div className={styles.recipeList}>
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onSwap={() => handleSwap(recipe)}
              onAccept={() => handleAccept(recipe)}
              onViewDetail={() => setSelectedRecipeId(recipe.id)}
              showSwapLimit={showSwapLimit}
              isLoggedIn={!!user}
            />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <span>暂无推荐内容</span>
        </div>
      )}

      <RecipeDrawer
        id={selectedRecipeId}
        onClose={() => setSelectedRecipeId(null)}
        familyId={familyId || undefined}
      />
    </div>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { useTodayMenu } from '../../store/todayMenu'
import { recommendApi } from '../../api/recommend'
import { eventsApi } from '../../api/events'
import { logsApi } from '../../api/logs'
import RecipeDrawer from '../../components/RecipeDrawer'
import RecipeImages from '../../components/RecipeImages'
import type { Recipe, GuestPrefs } from '../../types'
import { Coffee, Sun, MoonStar } from 'lucide-react'
import Logo from '../../components/Logo'
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
  selected: boolean
  onToggleSelect: () => void
  onSwap: () => void
  onViewDetail: () => void
  showSwapLimit: boolean
  isLoggedIn: boolean
}

function RecipeCard({ recipe, selected, onToggleSelect, onSwap, onViewDetail, showSwapLimit, isLoggedIn }: RecipeCardProps) {
  const difficultyLabel = { easy: '简单', medium: '中等', hard: '复杂' }[recipe.difficulty] ?? recipe.difficulty

  return (
    <article className={`${styles.card} ${selected ? styles.cardSelected : ''}`}>
      <div className={styles.cardImageWrapper}>
        <div className={styles.cardImage}>
          <RecipeImages images={recipe.images} alt={recipe.name} />
        </div>
        {selected && <div className={styles.selectedBadge}>✓</div>}
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
          <button
            className={selected ? styles.btnDeselect : styles.btnAccept}
            onClick={onToggleSelect}
          >
            {selected ? '取消选择' : '选这个'}
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
  const { meals, confirm: confirmMeal, clear: clearMeal } = useTodayMenu()
  const [activeMeal, setActiveMeal] = useState(2) // 默认晚餐
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [swapCount, setSwapCount] = useState(0)
  const [excludeIds, setExcludeIds] = useState<number[]>([])

  const familyId = user ? (Number(localStorage.getItem('familyId')) || 0) : 0
  const mealKey = MEAL_KEYS[activeMeal] as 'breakfast' | 'lunch' | 'dinner'
  const confirmedEntry = meals[mealKey]

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
        results = await recommendApi.get({ family_id: familyId, date: todayStr(), meal_type: mealType, exclude_ids: excludes })
      } else {
        results = await recommendApi.get({
          meal_type: mealType,
          allergies: prefs?.allergies ?? [],
          flavors: prefs?.liked_flavors ?? [],
          exclude_ids: excludes,
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

  // 登录用户：从 DB 同步今日已确认的餐次到 store（跨 session 保持一致）
  useEffect(() => {
    if (!familyId) return
    logsApi.getDay(familyId, todayStr()).then(dbData => {
      const mealKeys = ['breakfast', 'lunch', 'dinner'] as const
      for (const mk of mealKeys) {
        const entries = dbData[mk]
        if (entries?.length && !meals[mk]) {
          confirmMeal(mk, {
            ids: entries.map(e => e.recipe_id),
            names: entries.map(e => e.name),
          })
        }
      }
    }).catch(() => {})
  }, [familyId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const prefs = getGuestPrefs()
    if (!user && !prefs) {
      navigate('/onboarding', { replace: true })
      return
    }
    const p = prefs
    setSwapCount(p?.swap_count ?? 0)
    setExcludeIds([])
    setSelectedIds(new Set())
    if (!confirmedEntry) {
      loadRecommendation([])
    }
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

  const showSwapLimit = !user && swapCount >= SWAP_LIMIT

  function toggleSelect(recipe: Recipe) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(recipe.id)) {
        next.delete(recipe.id)
      } else {
        next.add(recipe.id)
      }
      return next
    })
  }

  async function handleLoadMore() {
    setLoadingMore(true)
    try {
      const prefs = getGuestPrefs()
      const mealType = MEAL_KEYS[activeMeal]
      const currentIds = recipes.map(r => r.id)
      const excludes = [...excludeIds, ...currentIds]
      let results: Recipe[]
      if (familyId) {
        results = await recommendApi.get({ family_id: familyId, date: todayStr(), meal_type: mealType, exclude_ids: excludes })
      } else {
        results = await recommendApi.get({
          meal_type: mealType,
          allergies: prefs?.allergies ?? [],
          flavors: prefs?.liked_flavors ?? [],
          exclude_ids: excludes,
        })
      }
      const fresh = results.filter(r => !currentIds.includes(r.id))
      if (fresh.length > 0) setRecipes(prev => [...prev, ...fresh])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMore(false)
    }
  }

  function handleConfirm() {
    const selected = recipes.filter(r => selectedIds.has(r.id))
    selected.forEach(recipe => {
      eventsApi.post({
        family_id: familyId,
        recipe_id: recipe.id,
        event_type: 'accepted',
        meal_type: mealKey,
        event_date: todayStr(),
        source: 'daily',
      }).catch(() => {})
    })
    confirmMeal(mealKey, { ids: selected.map(r => r.id), names: selected.map(r => r.name) })
    if (familyId) {
      logsApi.save({ family_id: familyId, date: todayStr(), meal_type: mealKey, recipe_ids: selected.map(r => r.id) }).catch(() => {})
    }
    setSelectedIds(new Set())
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.overline}>Daily Inspiration</span>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>今日推荐</h1>
          <span className={styles.date}>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
        </div>
      </header>

      <div className={styles.mealTabsRow}>
        <div className={styles.mealTabs}>
          {MEAL_TYPES.map((label, i) => {
            const key = MEAL_KEYS[i] as 'breakfast' | 'lunch' | 'dinner'
            const done = !!meals[key]
            return (
              <button
                key={label}
                className={`${styles.mealTab} ${activeMeal === i ? styles.mealTabActive : ''}`}
                onClick={() => setActiveMeal(i)}
              >
                {label}
                {done && <span className={styles.mealTabDot}>✓</span>}
              </button>
            )
          })}
        </div>
        {!confirmedEntry && recipes.length > 0 && (
          <button
            className={styles.loadMoreBtn}
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? '...' : '+ 更多'}
          </button>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.loadingIcon} />
          <span>Curating recipes...</span>
        </div>
      ) : confirmedEntry ? (
        <div className={styles.confirmedMenuCard}>
          <Logo className={styles.menuWatermarkLogo} />
          
          <div className={styles.menuHeader}>
            <div className={styles.menuIcon}>
              {activeMeal === 0 && <Coffee size={28} strokeWidth={1.5} />}
              {activeMeal === 1 && <Sun size={28} strokeWidth={1.5} />}
              {activeMeal === 2 && <MoonStar size={28} strokeWidth={1.5} />}
            </div>
            <div className={styles.menuTitleRow}>
              <div className={styles.menuTitleLine} />
              <h3 className={styles.menuTitle}>{MEAL_TYPES[activeMeal]}</h3>
              <div className={styles.menuTitleLine} />
            </div>
            <span className={styles.menuOverline}>{MEAL_KEYS[activeMeal].toUpperCase()}</span>
          </div>
          
          <ul className={styles.menuItemList}>
            {confirmedEntry.names.map((name) => (
              <li key={name} className={styles.menuItem}>
                <span className={styles.menuItemName}>{name}</span>
              </li>
            ))}
          </ul>
          
          <div className={styles.menuActions}>
            <button className={styles.btnViewMenu} onClick={() => navigate('/today')}>
              查看做法
            </button>
            <button className={styles.btnReselect} onClick={() => {
              clearMeal(mealKey)
              setExcludeIds([])
              setSelectedIds(new Set())
              loadRecommendation([])
            }}>
              重新选择
            </button>
          </div>
        </div>
      ) : recipes.length > 0 ? (
        <div className={styles.recipeList}>
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              selected={selectedIds.has(recipe.id)}
              onToggleSelect={() => toggleSelect(recipe)}
              onSwap={() => handleSwap(recipe)}
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

      {selectedIds.size > 0 && (
        <div className={styles.confirmBar}>
          <span className={styles.confirmText}>已选 {selectedIds.size} 道菜</span>
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            确认{MEAL_TYPES[activeMeal]}菜单
          </button>
        </div>
      )}

      <RecipeDrawer
        id={selectedRecipeId}
        onClose={() => setSelectedRecipeId(null)}
        familyId={familyId || undefined}
        onSwap={selectedRecipeId ? () => {
          const recipe = recipes.find(r => r.id === selectedRecipeId)
          if (recipe) handleSwap(recipe)
        } : undefined}
        showSwapLimit={showSwapLimit}
      />
    </div>
  )
}

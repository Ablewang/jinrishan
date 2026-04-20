import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { useTodayMenu } from '../../store/todayMenu'
import { recommendApi } from '../../api/recommend'
import { eventsApi } from '../../api/events'
import { logsApi } from '../../api/logs'
import { useRecipePicker } from '../../hooks/useRecipePicker'
import RecipeDrawer from '../../components/RecipeDrawer'
import RecipeImages from '../../components/RecipeImages'
import { OnboardingSteps } from '../Onboarding/GuestSetup'
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
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface RecipeCardProps {
  recipe: Recipe
  selected: boolean
  swapping: boolean
  onToggleSelect: () => void
  onSwap: () => void
  onViewDetail: () => void
  showSwapLimit: boolean
  isLoggedIn: boolean
}

function RecipeCard({ recipe, selected, swapping, onToggleSelect, onSwap, onViewDetail, showSwapLimit, isLoggedIn }: RecipeCardProps) {
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
              <button className={styles.btnSwap} onClick={onSwap} disabled={swapping}>
                {swapping ? '...' : '换一换'}
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
  const [activeMeal, setActiveMeal] = useState(2)
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [swapCount, setSwapCount] = useState(0)
  const [excludeIds, setExcludeIds] = useState<number[]>([])
  const [swappingId, setSwappingId] = useState<number | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(() => !user && !getGuestPrefs())

  const familyId = user ? (Number(localStorage.getItem('familyId')) || 0) : 0
  const mealKey = MEAL_KEYS[activeMeal] as 'breakfast' | 'lunch' | 'dinner'
  const confirmedEntry = meals[mealKey]

  const { recipes, setRecipes, loading, loadingMore, reload, loadMore } = useRecipePicker({
    mealType: MEAL_KEYS[activeMeal],
    familyId,
    excludeIds,
    guestPrefs: getGuestPrefs(),
    date: todayStr(),
  })

  // 登录用户：从 DB 同步今日已确认的餐次到 store
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

  // 切换餐次或登录状态变化时更新 onboarding 状态
  useEffect(() => {
    const prefs = getGuestPrefs()
    if (!user && !prefs) {
      setShowOnboarding(true)
      return
    }
    setShowOnboarding(false)
    setSwapCount(prefs?.swap_count ?? 0)
    setExcludeIds([])
    setSelectedIds(new Set())
    if (!confirmedEntry) reload([])
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
    // 只替换这一张卡，不刷全部
    setSwappingId(recipeToSwap.id)
    try {
      const allExcludeIds = [...newExcludes, ...recipes.filter(r => r.id !== recipeToSwap.id).map(r => r.id)]
      const prefs = getGuestPrefs()
      const mealType = MEAL_KEYS[activeMeal]
      const results = familyId
        ? await recommendApi.get({ family_id: familyId, date: todayStr(), meal_type: mealType, exclude_ids: allExcludeIds })
        : await recommendApi.get({ meal_type: mealType, allergies: prefs?.allergies ?? [], flavors: prefs?.liked_flavors ?? [], exclude_ids: allExcludeIds })
      const replacement = results[0]
      if (replacement) {
        setRecipes(prev => prev.map(r => r.id === recipeToSwap.id ? replacement : r))
      } else {
        setRecipes(prev => prev.filter(r => r.id !== recipeToSwap.id))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSwappingId(null)
    }
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
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? '...' : '+ 更多'}
          </button>
        )}
      </div>

      {showOnboarding ? (
        <OnboardingSteps onComplete={() => {
          setShowOnboarding(false)
          const prefs = getGuestPrefs()
          setSwapCount(prefs?.swap_count ?? 0)
          reload([])
        }} />
      ) : loading ? (
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
              reload([])
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
              swapping={swappingId === recipe.id}
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

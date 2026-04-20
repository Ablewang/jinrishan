import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { X, ArrowLeft, Clock, Flame, Utensils } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { useTodayMenu } from '../../store/todayMenu'
import { logsApi } from '../../api/logs'
import { recipesApi } from '../../api/recipes'
import { eventsApi } from '../../api/events'
import RecipeImages from '../../components/RecipeImages'
import type { Recipe } from '../../types'
import styles from './TodayOverview.module.css'

const MEAL_KEYS = ['breakfast', 'lunch', 'dinner'] as const
const MEAL_LABELS: Record<string, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' }

interface MealEntry {
  recipe_id?: number
  id?: number
  name: string
  images: string[]
}

type TodayData = Partial<Record<string, MealEntry[]>>

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

interface DrawerProps {
  open: boolean
  data: TodayData
  defaultMeal: string
  familyId?: number
  onClose: () => void
}

function TodayMenuDrawer({ open, data, defaultMeal, familyId, onClose }: DrawerProps) {
  const filledMeals = MEAL_KEYS.filter(k => (data[k]?.length ?? 0) > 0)
  const [activeRecipeId, setActiveRecipeId] = useState<number | null>(null)
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loadingRecipe, setLoadingRecipe] = useState(false)

  const drawerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isDragging = useRef(false)
  const CLOSE_THRESHOLD = 80
  const VELOCITY_THRESHOLD = 0.4 // px/ms
  const touchStartTime = useRef(0)

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    isDragging.current = false
  }

  // touchmove 注册为 non-passive 以便调用 preventDefault
  useEffect(() => {
    const el = drawerRef.current
    if (!el) return
    function handleMove(e: TouchEvent) {
      if (!el) return
      const dx = e.touches[0].clientX - touchStartX.current
      const dy = e.touches[0].clientY - touchStartY.current

      if (!isDragging.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        if (Math.abs(dy) > Math.abs(dx)) return
        isDragging.current = true
      }

      if (dx <= 0) return

      e.preventDefault()
      const ov = overlayRef.current
      el.style.transition = 'none'
      el.style.transform = `translateX(${dx}px)`
      if (ov) {
        const progress = Math.min(dx / (el.offsetWidth * 0.6), 1)
        ov.style.transition = 'none'
        ov.style.opacity = String(1 - progress * 0.8)
      }
    }
    el.addEventListener('touchmove', handleMove, { passive: false })
    return () => el.removeEventListener('touchmove', handleMove)
  }, [])

  function onTouchEnd(e: React.TouchEvent) {
    if (!isDragging.current) return
    isDragging.current = false

    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dt = Date.now() - touchStartTime.current
    const velocity = dx / dt
    const el = drawerRef.current
    const ov = overlayRef.current
    if (!el || !ov) return

    if (dx > CLOSE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      // 滑过阈值：滑出后关闭
      el.style.transition = 'transform 0.28s cubic-bezier(0.4, 0, 1, 1)'
      el.style.transform = `translateX(100%)`
      ov.style.transition = 'opacity 0.28s ease'
      ov.style.opacity = '0'
      setTimeout(onClose, 280)
    } else {
      // 未过阈值：弹回
      el.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      el.style.transform = ''
      ov.style.transition = 'opacity 0.3s ease'
      ov.style.opacity = ''
    }
  }

  useEffect(() => {
    if (!open) {
      setActiveRecipeId(null)
      setRecipe(null)
      // 重置滑动残留的内联样式
      if (drawerRef.current) { drawerRef.current.style.transform = ''; drawerRef.current.style.transition = '' }
      if (overlayRef.current) { overlayRef.current.style.opacity = ''; overlayRef.current.style.transition = '' }
    }
  }, [open])

  useEffect(() => {
    if (open && defaultMeal) {
      const el = document.getElementById(`drawer-meal-${defaultMeal}`)
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 420)
    }
  }, [open, defaultMeal])

  useEffect(() => {
    if (!activeRecipeId) return
    setLoadingRecipe(true)
    setRecipe(null)
    recipesApi.get(activeRecipeId)
      .then(r => { setRecipe(r); setLoadingRecipe(false) })
      .catch(() => setLoadingRecipe(false))
    if (familyId) {
      eventsApi.post({ family_id: familyId, recipe_id: activeRecipeId, event_type: 'accepted', event_date: todayStr(), source: 'drawer' }).catch(() => {})
    }
  }, [activeRecipeId, familyId])

  const showDetail = activeRecipeId !== null

  return (
    <div ref={overlayRef} className={`${styles.drawerOverlay} ${open ? styles.drawerOverlayOpen : ''}`} onClick={onClose}>
      <div
        ref={drawerRef}
        className={`${styles.drawer} ${showDetail ? styles.drawerExpanded : ''}`}
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className={`${styles.drawerTrack} ${showDetail ? styles.drawerTrackPushed : ''}`} aria-expanded={showDetail}>

          {/* Panel 1: 菜单总览 */}
          <div className={styles.drawerPanel}>
            <div className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerOverline}>Today</span>
                <h2 className={styles.drawerTitle}>今日菜单</h2>
              </div>
              <button className={styles.drawerClose} onClick={onClose}><X size={16} /></button>
            </div>

            <div className={styles.drawerBody}>
              {filledMeals.map(mealKey => {
                const entries = data[mealKey] ?? []
                return (
                  <section key={mealKey} id={`drawer-meal-${mealKey}`} className={styles.drawerSection}>
                    <div className={styles.drawerSectionLabel}>{MEAL_LABELS[mealKey]}</div>
                    <div className={styles.drawerRecipeList}>
                      {entries.map((entry, i) => {
                        const rid = entry.recipe_id ?? entry.id
                        return (
                          <button
                            key={i}
                            className={styles.drawerRecipeCard}
                            onClick={() => rid ? setActiveRecipeId(rid) : undefined}
                          >
                            <div className={styles.drawerRecipeImg}>
                              {entry.images?.[0]
                                ? <img src={entry.images[0]} alt={entry.name} />
                                : <span className={styles.drawerRecipeImgEmpty}>🍳</span>
                              }
                            </div>
                            <div className={styles.drawerRecipeInfo}>
                              <span className={styles.drawerRecipeIndex}>{String(i + 1).padStart(2, '0')}</span>
                              <span className={styles.drawerRecipeName}>{entry.name}</span>
                            </div>
                            {rid && <span className={styles.drawerRecipeArrow}>›</span>}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>

          {/* Panel 2: 菜品详情 */}
          <div className={styles.drawerPanel}>
            <div className={styles.drawerHeader}>
              <button className={styles.drawerBackBtn} onClick={() => setActiveRecipeId(null)}>
                <ArrowLeft size={16} />
                <span>返回菜单</span>
              </button>
              <button className={styles.drawerClose} onClick={() => setActiveRecipeId(null)}><X size={16} /></button>
            </div>

            <div className={styles.drawerBody}>
              {loadingRecipe ? (
                <div className={styles.drawerLoading}><div className={styles.drawerLoadingIcon} /></div>
              ) : recipe ? (
                <>
                  <div className={styles.recipeHero}>
                    <RecipeImages images={recipe.images} alt={recipe.name} className={styles.recipeHeroImg} />
                  </div>
                  <div className={styles.recipeBody}>
                    <h1 className={styles.recipeName}>{recipe.name}</h1>
                    <p className={styles.recipeDesc}>{recipe.description}</p>

                    <div className={styles.recipeMeta}>
                      <span className={styles.recipeMetaItem}><Clock size={14} /> {recipe.cook_time} 分钟</span>
                      <span className={styles.recipeMetaItem}>
                        <Flame size={14} />
                        {recipe.difficulty === 'easy' ? '简单' : recipe.difficulty === 'medium' ? '中等' : '复杂'}
                      </span>
                      {recipe.cuisine && <span className={styles.recipeMetaItem}><Utensils size={14} /> {recipe.cuisine}</span>}
                    </div>

                    {recipe.flavors?.length > 0 && (
                      <div className={styles.recipeTagRow}>
                        {recipe.flavors.map(f => <span key={f} className={styles.recipeTag}>{f}</span>)}
                        {recipe.nutrition_tags?.map(t => <span key={t} className={styles.recipeTag}>{t}</span>)}
                      </div>
                    )}

                    {(recipe.ingredients?.length ?? 0) > 0 && (
                      <section className={styles.recipeSection}>
                        <h2 className={styles.recipeSectionTitle}>食材</h2>
                        <div className={styles.ingredientGrid}>
                          {recipe.ingredients?.map((ing, i) => (
                            <div key={i} className={styles.ingredient}>
                              <span className={styles.ingName}>{ing.name}</span>
                              <span className={styles.ingAmount}>{ing.amount}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {(recipe.steps?.length ?? 0) > 0 && (
                      <section className={styles.recipeSection}>
                        <h2 className={styles.recipeSectionTitle}>做法步骤</h2>
                        {recipe.steps?.map(step => (
                          <div key={step.step_order} className={styles.recipeStep}>
                            <div className={styles.recipeStepNum}>{step.step_order}</div>
                            <div className={styles.recipeStepContent}>
                              <p className={styles.recipeStepDesc}>{step.description}</p>
                              {step.duration && <span className={styles.recipeStepTime}>约 {step.duration} 分钟</span>}
                            </div>
                          </div>
                        ))}
                      </section>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function TodayOverview() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { meals: storeMeals } = useTodayMenu()
  const familyId = user ? (Number(localStorage.getItem('familyId')) || 0) : 0
  const [dbData, setDbData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(!!familyId)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMeal, setDrawerMeal] = useState<string>('breakfast')

  useEffect(() => {
    if (!familyId) return
    logsApi.getDay(familyId, todayStr())
      .then(d => { setDbData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [familyId])

  const storeData: TodayData = Object.fromEntries(
    Object.entries(storeMeals).map(([k, v]) => [k, v.ids.map((id, i) => ({ id, name: v.names[i], images: [] }))])
  )
  const data: TodayData = dbData ? { ...storeData, ...dbData } : storeData

  const hasSomething = MEAL_KEYS.some(k => (data[k]?.length ?? 0) > 0)
  const dateLabel = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
<span className={styles.overline}>Today</span>
        <h1 className={styles.title}>今日菜单</h1>
        <p className={styles.date}>{dateLabel}</p>
      </header>

      {!user && (
        <div className={styles.loginBanner}>
          <Link to="/auth/login" className={styles.loginBannerLink}>登录</Link>后菜单数据将同步到家庭账号，跨设备随时查看
        </div>
      )}

      {loading ? (
        <div className={styles.loading}><div className={styles.loadingIcon} /></div>
      ) : !hasSomething ? (
        <div className={styles.empty}>
          <p>今日还没有安排</p>
          <button className={styles.btnGo} onClick={() => navigate('/home')}>去今日推荐选菜</button>
        </div>
      ) : (
        <>
          <div className={styles.mealList}>
            {MEAL_KEYS.map(mealType => {
              const entries = data[mealType]
              if (!entries?.length) return (
                <div key={mealType} className={styles.mealRow}>
                  <div className={styles.mealLabel}>{MEAL_LABELS[mealType]}</div>
                  <div className={styles.mealEmpty}>
                    <span>未安排</span>
                    <button className={styles.btnAdd} onClick={() => navigate('/home')}>+ 去选</button>
                  </div>
                </div>
              )
              return (
                <div key={mealType} className={styles.mealRow}>
                  <div className={styles.mealLabel}>{MEAL_LABELS[mealType]}</div>
                  <div className={styles.mealContent}>
                    <div className={styles.mealNames}>
                      {entries.map(e => (
                        <span key={e.name} className={styles.mealName}>{e.name}</span>
                      ))}
                    </div>
                    <div className={styles.mealActions}>
                      <button className={styles.mealAction} onClick={() => navigate('/home')}>去更换</button>
                      <button className={styles.mealAction} onClick={() => { setDrawerMeal(mealType); setDrawerOpen(true) }}>查看详情</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {(() => {
            const allIds = MEAL_KEYS.flatMap(k =>
              (data[k] ?? []).map(e => e.recipe_id ?? e.id).filter(Boolean) as number[]
            )
            return allIds.length > 0 ? (
              <button
                className={styles.shoppingBtn}
                onClick={() => navigate(`/shopping/today?ids=${allIds.join(',')}`)}
              >
                查看购物清单
              </button>
            ) : null
          })()}
        </>
      )}

      <TodayMenuDrawer
        open={drawerOpen}
        data={data}
        defaultMeal={drawerMeal}
        familyId={familyId || undefined}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}

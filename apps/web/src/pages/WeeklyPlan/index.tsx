import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { plansApi } from '../../api/plans'
import { recommendApi } from '../../api/recommend'
import type { Recipe } from '../../types'
import LoginPrompt from '../../components/LoginPrompt'
import styles from './WeeklyPlan.module.css'

interface PlanItem {
  id: number
  date: string
  meal_type: string
  recipe_id: number
  recipe_name: string
  cuisine: string
  cook_time: number
}

interface Plan {
  id: number
  family_id: number
  week_start_date: string
  status: string
  items: PlanItem[]
}

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner']

function getWeekStart(offset = 0) {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' })
}

function groupByDate(items: PlanItem[]) {
  const map: Record<string, PlanItem[]> = {}
  items.forEach(item => {
    if (!map[item.date]) map[item.date] = []
    map[item.date].push(item)
  })
  return map
}

export default function WeeklyPlan() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [weekOffset] = useState(0)
  const [replacingItem, setReplacingItem] = useState<number | null>(null)
  const [swapModal, setSwapModal] = useState<PlanItem | null>(null)
  const [swapRecipes, setSwapRecipes] = useState<Recipe[]>([])

  const familyId = Number(localStorage.getItem('familyId') ?? '0')

  useEffect(() => {
    if (!familyId) return
    const weekStart = getWeekStart(weekOffset)
    plansApi.get(familyId, weekStart)
      .then(p => { setPlan(p); setLoading(false) })
      .catch(() => setLoading(false))
  }, [familyId, weekOffset])

  if (!user) return <LoginPrompt title="登录后查看周计划" desc="创建家庭后可规划本周每日饮食，生成购物清单" />

  async function handleGenerate() {
    if (!familyId) return
    setGenerating(true)
    try {
      const weekStart = getWeekStart(weekOffset)
      const p = await plansApi.generate(familyId, weekStart)
      setPlan(p)
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  async function handleConfirm() {
    if (!plan) return
    setConfirming(true)
    try {
      const res = await plansApi.confirm(plan.id)
      navigate(`/shopping/${res.shopping_list_id}`)
    } catch (e) {
      console.error(e)
    } finally {
      setConfirming(false)
    }
  }

  async function openSwap(item: PlanItem) {
    setSwapModal(item)
    const recipes = await recommendApi.get({ family_id: familyId, meal_type: item.meal_type })
    setSwapRecipes(recipes.filter(r => r.id !== item.recipe_id).slice(0, 5))
  }

  async function handleSwap(item: PlanItem, recipeId: number) {
    if (!plan) return
    setReplacingItem(item.id)
    try {
      await plansApi.replaceItem(plan.id, item.id, recipeId)
      const weekStart = getWeekStart(weekOffset)
      const updated = await plansApi.get(familyId, weekStart)
      setPlan(updated)
      setSwapModal(null)
    } catch (e) {
      console.error(e)
    } finally {
      setReplacingItem(null)
    }
  }

  if (!familyId) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <p>需要先创建或加入家庭才能使用周计划</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/family/create')}>创建家庭</button>
          <button className={styles.btnSecondary} onClick={() => navigate('/family/join')}>加入家庭</button>
        </div>
      </div>
    )
  }

  if (loading) return <div className={styles.page}><div className={styles.loading}>加载中...</div></div>

  const weekStart = getWeekStart(weekOffset)
  const grouped = plan ? groupByDate(plan.items) : {}
  const dates = Object.keys(grouped).sort()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>周计划</h1>
        <span className={styles.weekLabel}>本周</span>
      </header>

      {!plan ? (
        <div className={styles.emptyPlan}>
          <p className={styles.emptyText}>本周还没有计划</p>
          <button className={styles.btnPrimary} onClick={handleGenerate} disabled={generating}>
            {generating ? '生成中...' : '一键生成本周菜单'}
          </button>
        </div>
      ) : (
        <>
          <div className={styles.planMeta}>
            <span className={`${styles.status} ${plan.status === 'confirmed' ? styles.statusConfirmed : ''}`}>
              {plan.status === 'draft' ? '草稿' : plan.status === 'confirmed' ? '已确认' : plan.status}
            </span>
            <span className={styles.weekDate}>{weekStart} 起</span>
          </div>

          <div className={styles.calendar}>
            {dates.map(date => (
              <div key={date} className={styles.dayCard}>
                <div className={styles.dayHeader}>{formatDate(date)}</div>
                <div className={styles.meals}>
                  {MEAL_ORDER.map(mealType => {
                    const item = grouped[date]?.find(i => i.meal_type === mealType)
                    if (!item) return null
                    return (
                      <div key={mealType} className={styles.mealRow}>
                        <span className={styles.mealLabel}>{MEAL_TYPE_LABEL[mealType] ?? mealType}</span>
                        <span className={styles.mealName}>{item.recipe_name}</span>
                        {plan.status === 'draft' && (
                          <button
                            className={styles.swapBtn}
                            onClick={() => openSwap(item)}
                            disabled={replacingItem === item.id}
                          >
                            换
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {plan.status === 'draft' && (
            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={handleGenerate} disabled={generating}>
                重新生成
              </button>
              <button className={styles.btnPrimary} onClick={handleConfirm} disabled={confirming}>
                {confirming ? '确认中...' : '确认，生成购物清单 →'}
              </button>
            </div>
          )}
          {plan.status === 'confirmed' && (
            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={() => navigate('/shopping/0')}>
                查看购物清单
              </button>
            </div>
          )}
        </>
      )}

      {/* Swap Modal */}
      {swapModal && (
        <div className={styles.modalOverlay} onClick={() => setSwapModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>选择替换菜谱</h3>
            <p className={styles.modalSub}>{formatDate(swapModal.date)} {MEAL_TYPE_LABEL[swapModal.meal_type]}</p>
            {swapRecipes.length === 0 ? <p className={styles.loading}>加载中...</p> : (
              <div className={styles.swapList}>
                {swapRecipes.map(r => (
                  <button
                    key={r.id}
                    className={styles.swapOption}
                    onClick={() => handleSwap(swapModal, r.id)}
                  >
                    <span className={styles.swapOptionName}>{r.name}</span>
                    <span className={styles.swapOptionMeta}>{r.cuisine} · {r.cook_time}分钟</span>
                  </button>
                ))}
              </div>
            )}
            <button className={styles.modalClose} onClick={() => setSwapModal(null)}>取消</button>
          </div>
        </div>
      )}
    </div>
  )
}

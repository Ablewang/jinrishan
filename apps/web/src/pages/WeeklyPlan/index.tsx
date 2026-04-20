import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { plansApi } from '../../api/plans'
import { recommendApi } from '../../api/recommend'
import type { Recipe } from '../../types'
import LoginPrompt from '../../components/LoginPrompt'
import DayDrawer from '../../components/DayDrawer'
import RecipePicker from '../../components/RecipePicker'
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
  shopping_list_id?: number | null
}

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner']
const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function getWeekStart(offset = 0) {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7
  d.setDate(diff)
  return localDateStr(d)
}

function getWeekEnd(offset = 0) {
  const d = new Date(getWeekStart(offset) + 'T00:00:00')
  d.setDate(d.getDate() + 6)
  return localDateStr(d)
}

function getWeekDates(offset = 0) {
  const start = new Date(getWeekStart(offset) + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return localDateStr(d)
  })
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() {
  return localDateStr(new Date())
}

function formatShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function groupByDate(items: PlanItem[]) {
  const map: Record<string, PlanItem[]> = {}
  items.forEach(item => {
    if (!map[item.date]) map[item.date] = []
    map[item.date].push(item)
  })
  return map
}

interface AddModalState { date: string; meal_type: string }

export default function WeeklyPlan() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [weekOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [swapModal, setSwapModal] = useState<PlanItem | null>(null)
  const [addModal, setAddModal] = useState<AddModalState | null>(null)
  const [dayDrawer, setDayDrawer] = useState<string | null>(null)
  const [actingItem, setActingItem] = useState<number | null>(null)
  const [randomizing, setRandomizing] = useState<string | null>(null)

  const familyId = Number(localStorage.getItem('familyId') ?? '0')
  const weekDates = getWeekDates(weekOffset)
  const today = todayStr()

  // If selectedDate is outside this week's range, default to today or first day
  useEffect(() => {
    if (!weekDates.includes(selectedDate)) {
      setSelectedDate(weekDates.includes(today) ? today : weekDates[0])
    }
  }, [weekOffset]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!familyId) return
    const weekStart = getWeekStart(weekOffset)
    plansApi.get(familyId, weekStart)
      .then(p => { setPlan(p); setLoading(false) })
      .catch(() => setLoading(false))
  }, [familyId, weekOffset])

  if (!user) return <LoginPrompt title="一周三餐，心中有数" desc="登录并创建家庭，按日规划饮食，自动汇总本周采购清单" />

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

  async function handleSwap(item: PlanItem, recipe: Recipe) {
    if (!plan) return
    setActingItem(item.id)
    try {
      await plansApi.replaceItem(plan.id, item.id, recipe.id)
      setPlan(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.id === item.id
          ? { ...i, recipe_id: recipe.id, recipe_name: recipe.name }
          : i)
      } : prev)
      setSwapModal(null)
    } catch (e) {
      console.error(e)
    } finally {
      setActingItem(null)
    }
  }

  async function handleDeleteItem(item: PlanItem) {
    if (!plan) return
    setActingItem(item.id)
    try {
      await plansApi.deleteItem(plan.id, item.id)
      setPlan(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== item.id) } : prev)
    } catch (e) {
      console.error(e)
    } finally {
      setActingItem(null)
    }
  }

  async function handleAddItem(recipe: Recipe) {
    if (!plan || !addModal) return
    try {
      const newItem = await plansApi.addItem(plan.id, addModal.date, addModal.meal_type, recipe.id)
      setPlan(prev => prev ? {
        ...prev,
        items: [...prev.items, { ...newItem, recipe_name: recipe.name }]
      } : prev)
      setAddModal(null)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleDayRandom(date: string) {
    if (!plan) return
    setRandomizing(date)
    try {
      const dayItems = plan.items.filter(i => i.date === date)
      await Promise.all(dayItems.map(item => plansApi.deleteItem(plan.id, item.id)))
      const kept = plan.items.filter(i => i.date !== date)
      const added: PlanItem[] = []
      const usedIds: number[] = []
      for (const mealType of MEAL_ORDER) {
        const recs = await recommendApi.get({ family_id: familyId, meal_type: mealType })
        const pick = recs.find(r => !usedIds.includes(r.id))
        if (pick) {
          const newItem = await plansApi.addItem(plan.id, date, mealType, pick.id)
          added.push({ ...newItem, recipe_name: pick.name })
          usedIds.push(pick.id)
        }
      }
      setPlan(prev => prev ? { ...prev, items: [...kept, ...added] } : prev)
    } catch (e) {
      console.error(e)
    } finally {
      setRandomizing(null)
    }
  }

  async function handleDayAdd(date: string, mealType: string, recipes: { id: number; name: string }[]) {
    if (!plan) return
    const added: PlanItem[] = []
    for (const r of recipes) {
      const newItem = await plansApi.addItem(plan.id, date, mealType, r.id)
      added.push({ ...newItem, recipe_name: r.name })
    }
    setPlan(prev => prev ? { ...prev, items: [...prev.items, ...added] } : prev)
  }

  async function handleRandom(date: string, meal_type: string) {
    if (!plan) return
    try {
      const existing = plan.items.filter(i => i.date === date && i.meal_type === meal_type)
      await Promise.all(existing.map(item => plansApi.deleteItem(plan.id, item.id)))
      const recipes = await recommendApi.get({ family_id: familyId, meal_type })
      const usedIds = plan.items.filter(i => i.date === date && i.meal_type !== meal_type).map(i => i.recipe_id)
      const pick = recipes.find(r => !usedIds.includes(r.id)) ?? recipes[0]
      if (pick) {
        const newItem = await plansApi.addItem(plan.id, date, meal_type, pick.id)
        setPlan(prev => prev ? {
          ...prev,
          items: [
            ...prev.items.filter(i => !(i.date === date && i.meal_type === meal_type)),
            { ...newItem, recipe_name: pick.name }
          ]
        } : prev)
      } else {
        setPlan(prev => prev ? {
          ...prev,
          items: prev.items.filter(i => !(i.date === date && i.meal_type === meal_type))
        } : prev)
      }
    } catch (e) {
      console.error(e)
    }
  }

  if (!familyId) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.overline}>Weekly Plan</span>
          <div className={styles.titleRow}><h1 className={styles.title}>周计划</h1></div>
        </header>
        <div className={styles.empty}>
          <p className={styles.emptyText}>需要先创建或加入家庭才能使用周计划</p>
          <button className={styles.btnPrimary} onClick={() => navigate('/family/create')}>创建家庭</button>
          <button className={styles.btnSecondary} onClick={() => navigate('/family/join')}>加入家庭</button>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.overline}>Weekly Plan</span>
        <div className={styles.titleRow}><h1 className={styles.title}>周计划</h1></div>
      </header>
      <div className={styles.loading}><div className={styles.loadingIcon} /></div>
    </div>
  )

  const weekStart = getWeekStart(weekOffset)
  const weekEnd = getWeekEnd(weekOffset)
  const grouped = plan ? groupByDate(plan.items ?? []) : {}
  const dayItems = grouped[selectedDate] ?? []

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.overline}>Weekly Plan</span>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>周计划</h1>
          <div className={styles.titleRight}>
            {plan && (
              <span className={`${styles.status} ${plan.status === 'confirmed' ? styles.statusConfirmed : ''}`}>
                {plan.status === 'draft' ? '草稿' : plan.status === 'confirmed' ? '已确认' : plan.status}
              </span>
            )}
            <span className={styles.weekLabel}>{weekStart} — {weekEnd}</span>
          </div>
        </div>
      </header>

      {/* 日期选择条 */}
      <div className={styles.dayTabs}>
        {weekDates.map(date => {
          const d = new Date(date + 'T00:00:00')
          const isToday = date === today
          const isSelected = date === selectedDate
          const hasItems = (grouped[date]?.length ?? 0) > 0
          return (
            <button
              key={date}
              className={`${styles.dayTab} ${isSelected ? styles.dayTabActive : ''} ${isToday ? styles.dayTabToday : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <span className={styles.dayTabWeekday}>{WEEKDAY_LABELS[d.getDay()]}</span>
              <span className={styles.dayTabDate}>{formatShort(date)}</span>
              {hasItems && !isSelected && <span className={styles.dayTabDot} />}
            </button>
          )
        })}
      </div>

      {!plan ? (
        <div className={styles.emptyPlan}>
          <p className={styles.emptyText}>本周还没有计划</p>
          <button className={styles.btnPrimary} onClick={handleGenerate} disabled={generating}>
            {generating ? '生成中...' : '一键生成本周菜单'}
          </button>
        </div>
      ) : (
        <>
          {/* 当天操作栏 */}
          <div className={styles.dayActions}>
            <button
              className={styles.dayRandomBtn}
              onClick={() => handleDayRandom(selectedDate)}
              disabled={randomizing === selectedDate}
            >
              {randomizing === selectedDate ? '...' : '随机这天'}
            </button>
            <button className={styles.dayPickBtn} onClick={() => setDayDrawer(selectedDate)}>
              批量选菜
            </button>
          </div>

          {/* 三餐列表 */}
          <div className={styles.meals}>
            {MEAL_ORDER.map(mealType => {
              const items = dayItems.filter(i => i.meal_type === mealType)
              return (
                <div key={mealType} className={styles.mealSection}>
                  <span className={styles.mealLabel}>{MEAL_TYPE_LABEL[mealType]}</span>
                  <div className={styles.mealContent}>
                    {items.map(item => (
                      <div key={item.id} className={styles.mealRow}>
                        <span className={styles.mealName}>{item.recipe_name}</span>
                        <button
                          className={styles.swapBtn}
                          onClick={() => setSwapModal(item)}
                          disabled={actingItem === item.id}
                        >
                          替换
                        </button>
                        {items.length > 1 && (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleDeleteItem(item)}
                            disabled={actingItem === item.id}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <div className={styles.mealActions}>
                      <button className={styles.addBtn} onClick={() => setAddModal({ date: selectedDate, meal_type: mealType })}>
                        + 选菜
                      </button>
                      <button className={styles.randomBtn} onClick={() => handleRandom(selectedDate, mealType)}>
                        随机
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className={styles.actions}>
            <button className={styles.btnSecondary} onClick={handleGenerate} disabled={generating}>
              {generating ? '生成中...' : '重新生成全周'}
            </button>
            {plan.status === 'draft' ? (
              <button className={styles.btnPrimary} onClick={handleConfirm} disabled={confirming}>
                {confirming ? '确认中...' : '确认，生成购物清单 →'}
              </button>
            ) : (
              <button className={styles.btnPrimary} onClick={() => navigate(`/shopping/${plan.shopping_list_id ?? 0}`)}>
                查看购物清单
              </button>
            )}
          </div>
        </>
      )}

      {/* 替换弹窗 */}
      {swapModal && (
        <div className={styles.modalOverlay} onClick={() => setSwapModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalSub}>{MEAL_TYPE_LABEL[swapModal.meal_type]} · 当前：{swapModal.recipe_name}</p>
                <h3 className={styles.modalTitle}>替换菜品</h3>
              </div>
              <button className={styles.modalClose} onClick={() => setSwapModal(null)}>×</button>
            </div>
            <RecipePicker
              mealType={swapModal.meal_type}
              familyId={familyId}
              excludeIds={[swapModal.recipe_id]}
              mode="single"
              onSelect={r => handleSwap(swapModal, r)}
            />
          </div>
        </div>
      )}

      {/* 选菜弹窗 */}
      {addModal && (
        <div className={styles.modalOverlay} onClick={() => setAddModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalSub}>{MEAL_TYPE_LABEL[addModal.meal_type]}</p>
                <h3 className={styles.modalTitle}>加一道菜</h3>
              </div>
              <button className={styles.modalClose} onClick={() => setAddModal(null)}>×</button>
            </div>
            <RecipePicker
              mealType={addModal.meal_type}
              familyId={familyId}
              excludeIds={plan?.items.filter(i => i.date === addModal.date && i.meal_type === addModal.meal_type).map(i => i.recipe_id) ?? []}
              mode="single"
              onSelect={r => handleAddItem(r)}
            />
          </div>
        </div>
      )}

      {/* 批量选菜抽屉 */}
      {dayDrawer && plan && (
        <DayDrawer
          date={dayDrawer}
          dateLabel={`${WEEKDAY_LABELS[new Date(dayDrawer + 'T00:00:00').getDay()]} ${formatShort(dayDrawer)}`}
          familyId={familyId}
          existingRecipeIds={[]}
          onAdd={(mealType, recipes) => handleDayAdd(dayDrawer, mealType, recipes)}
          onClose={() => setDayDrawer(null)}
        />
      )}
    </div>
  )
}

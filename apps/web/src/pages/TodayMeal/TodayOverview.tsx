import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { useTodayMenu } from '../../store/todayMenu'
import { logsApi } from '../../api/logs'
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

export default function TodayOverview() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { meals: storeMeals } = useTodayMenu()
  const familyId = user ? (Number(localStorage.getItem('familyId')) || 0) : 0
  const [dbData, setDbData] = useState<TodayData | null>(null)
  const [loading, setLoading] = useState(!!familyId)

  useEffect(() => {
    if (!familyId) return
    logsApi.getDay(familyId, todayStr())
      .then(d => { setDbData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [familyId])

  // DB 数据 merge store 数据：store 打底，DB 有记录的覆盖（DB 优先）
  const storeData: TodayData = Object.fromEntries(
    Object.entries(storeMeals).map(([k, v]) => [k, v.ids.map((id, i) => ({ id, name: v.names[i], images: [] }))])
  )
  const data: TodayData = dbData ? { ...storeData, ...dbData } : storeData

  const hasSomething = MEAL_KEYS.some(k => (data[k]?.length ?? 0) > 0)
  const dateLabel = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/home')}>← 去推荐页</button>
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
            const ids = entries.map(e => e.recipe_id ?? e.id).filter(Boolean) as number[]
            return (
              <div key={mealType} className={styles.mealRow}>
                <div className={styles.mealLabel}>{MEAL_LABELS[mealType]}</div>
                <button
                  className={styles.mealCard}
                  onClick={() => navigate(`/today/${mealType}?ids=${ids.join(',')}`)}
                >
                  <div className={styles.mealNames}>
                    {entries.map(e => (
                      <span key={e.name} className={styles.mealName}>{e.name}</span>
                    ))}
                  </div>
                  <span className={styles.mealArrow}>→</span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

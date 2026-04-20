import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { shoppingApi } from '../../api/shopping'
import { recipesApi } from '../../api/recipes'
import styles from './Shopping.module.css'

interface ShoppingItem {
  id: number
  ingredient_name: string
  amount: string
  category: string
  checked: number
}

interface ShoppingList {
  id: number
  items: ShoppingItem[]
}

const CATEGORY_ICONS: Record<string, string> = {
  肉类: '🥩',
  蔬菜: '🥬',
  水产: '🐟',
  海产: '🐟',
  调味料: '🧂',
  主食: '🍚',
  蛋奶: '🥚',
  豆制品: '🫘',
  其他: '🛒',
}

export default function Shopping() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [list, setList] = useState<ShoppingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const isTodayMode = id === 'today'

  useEffect(() => {
    if (isTodayMode) {
      const recipeIds = (searchParams.get('ids') ?? '').split(',').map(Number).filter(Boolean)
      if (!recipeIds.length) { setLoading(false); return }
      Promise.all(recipeIds.map(rid => recipesApi.get(rid)))
        .then(recipes => {
          const items: ShoppingItem[] = []
          let itemId = 1
          for (const recipe of recipes) {
            for (const ing of recipe.ingredients ?? []) {
              if (!ing.amount?.trim()) continue
              items.push({
                id: itemId++,
                ingredient_name: ing.name,
                amount: ing.amount,
                category: ing.category || '其他',
                checked: 0,
              })
            }
          }
          setList({ id: 0, items })
          setLoading(false)
        })
        .catch(() => setLoading(false))
      return
    }
    if (!id || id === '0') { setLoading(false); return }
    shoppingApi.get(Number(id))
      .then(l => { setList(l); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id, searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(item: ShoppingItem) {
    if (!list) return
    const newChecked = !item.checked
    if (isTodayMode) {
      setList(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.id === item.id ? { ...i, checked: newChecked ? 1 : 0 } : i)
      } : prev)
      return
    }
    setToggling(item.id)
    try {
      await shoppingApi.toggleItem(list.id, item.id, newChecked)
      setList(prev => prev ? {
        ...prev,
        items: prev.items.map(i => i.id === item.id ? { ...i, checked: newChecked ? 1 : 0 } : i)
      } : prev)
    } catch (e) {
      console.error(e)
    } finally {
      setToggling(null)
    }
  }

  if (loading) return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={`${styles.skeletonBlock} ${styles.skeletonBackBtn}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonOverline}`} />
        <div className={styles.titleRow}>
          <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
        </div>
      </header>
      <div className={styles.skeletonTabs}>
        {[80, 56, 72, 64].map((w, i) => (
          <div key={i} className={`${styles.skeletonBlock} ${styles.skeletonTab}`} style={{ width: w }} />
        ))}
      </div>
      <div className={styles.itemList}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={styles.skeletonItem}>
            <div className={`${styles.skeletonBlock} ${styles.skeletonCheckbox}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonItemName}`} style={{ maxWidth: `${[60, 80, 50, 70, 55, 65][i]}%` }} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonItemAmount}`} />
          </div>
        ))}
      </div>
    </div>
  )

  if (!list) return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.overline}>Shopping List</span>
        <div className={styles.titleRow}><h1 className={styles.title}>买菜清单</h1></div>
      </header>
      <div className={styles.empty}>
        <p className={styles.emptyText}>暂无购物清单</p>
        <p className={styles.emptyHint}>确认周计划后自动生成</p>
        <button className={styles.btnPrimary} onClick={() => navigate('/plan')}>去周计划</button>
      </div>
    </div>
  )

  const visibleItems = list.items.filter(item => item.amount && item.amount.trim() !== '')

  const grouped: Record<string, ShoppingItem[]> = {}
  visibleItems.forEach(item => {
    const cat = item.category || '其他'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  })
  const categories = Object.keys(grouped)
  const safeTab = Math.min(activeTab, categories.length - 1)
  const activeCategory = categories[safeTab]
  const activeItems = grouped[activeCategory] ?? []

  const totalCount = visibleItems.length
  const checkedCount = visibleItems.filter(i => i.checked).length

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← 返回</button>
        <span className={styles.overline}>Shopping List</span>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>买菜清单</h1>
          <span className={styles.progress}>{checkedCount} / {totalCount}</span>
        </div>
      </header>

      <div className={styles.tabs}>
        {categories.map((cat, i) => {
          const items = grouped[cat]
          const done = items.filter(it => it.checked).length
          const allDone = done === items.length
          return (
            <button
              key={cat}
              className={`${styles.tab} ${safeTab === i ? styles.tabActive : ''} ${allDone ? styles.tabDone : ''}`}
              onClick={() => setActiveTab(i)}
            >
              <span className={styles.tabIcon}>{CATEGORY_ICONS[cat] ?? '🛒'}</span>
              {cat}
              {allDone
                ? <span className={styles.tabCheck}>✓</span>
                : done > 0 && <span className={styles.tabDot} />
              }
            </button>
          )
        })}
      </div>

      <div className={styles.itemList}>
        {activeItems.map(item => (
          <div
            key={item.id}
            className={`${styles.item} ${item.checked ? styles.itemChecked : ''}`}
            onClick={() => !toggling && handleToggle(item)}
          >
            <div className={styles.checkbox}>
              {item.checked && <span>✓</span>}
            </div>
            <span className={styles.itemName}>{item.ingredient_name}</span>
            <span className={styles.itemAmount}>{item.amount}</span>
          </div>
        ))}
      </div>

      {checkedCount === totalCount && totalCount > 0 && (
        <div className={styles.allDone}>全部买好了，开工吧</div>
      )}
    </div>
  )
}

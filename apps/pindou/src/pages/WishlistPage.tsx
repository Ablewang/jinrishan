import { useEffect, useMemo, useState } from 'react'
import { Header } from '../components/Header'
import { BackTitle } from '../components/BackTitle'
import { fetchItem } from '../hooks/useData'
import { usePalette } from '../hooks/usePalette'
import { useStore } from '../hooks/useStore'
import type { NavTarget } from '../App'
import styles from './WishlistPage.module.css'

const CAT_ZH: Record<string, string> = {
  'Building Blocks': '建筑方块',
  'Combat':          '战斗',
  'Decorations':     '装饰',
  'Food and Drinks':   '食物与饮料',
  'Materials':       '材料',
  'Miscellaneous':   '杂项',
  'Redstone':        '红石',
  'Spawn Eggs':      '刷怪蛋',
  'Tools':           '工具',
}

interface Props {
  onBack: () => void
  onNavigate: (target: NavTarget) => void
}

export function WishlistPage({ onBack, onNavigate }: Props) {
  const { wishlist, done, inventory } = useStore()
  const { items, remove, removeAll } = wishlist
  const { palette } = usePalette()
  const [satisfiedSet, setSatisfiedSet] = useState<Set<string>>(new Set())

  useEffect(() => {
    const activeItems = items.filter(i => !done.has(i.cat, i.name))
    if (activeItems.length === 0) { setSatisfiedSet(new Set()); return }
    Promise.all(
      activeItems.map(i => fetchItem(i.cat, i.name, palette).catch(() => null))
    ).then(results => {
      const s = new Set<string>()
      for (let idx = 0; idx < results.length; idx++) {
        const data = results[idx]
        if (!data) continue
        const allOk = data.materials.every(m => inventory.get(m.code) >= m.count)
        if (allOk) s.add(`${activeItems[idx].cat}/${activeItems[idx].name}`)
      }
      setSatisfiedSet(s)
    })
  }, [items, done.items, inventory.inventory, palette])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const item of items) {
      if (!map.has(item.cat)) map.set(item.cat, [])
      map.get(item.cat)!.push(item)
    }
    for (const [cat, catItems] of map) {
      map.set(cat, [...catItems].sort((a, b) => {
        const aOk = satisfiedSet.has(`${a.cat}/${a.name}`) ? 0 : 1
        const bOk = satisfiedSet.has(`${b.cat}/${b.name}`) ? 0 : 1
        return aOk - bOk
      }))
    }
    return map
  }, [items, satisfiedSet])

  return (
    <div className={styles.page}>
      <Header
        left={<BackTitle title="收藏夹" onBack={onBack} />}
        right={
          items.length > 0
            ? <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.purchaseBtn} onClick={() => onNavigate({ type: 'my', tab: 'inventory' })}>拼豆管理</button>
                <button className={styles.purchaseBtn} onClick={() => onNavigate({ type: 'my', tab: 'purchase' })}>查看购买清单</button>
              </div>
            : <button className={styles.purchaseBtn} onClick={() => onNavigate({ type: 'my', tab: 'inventory' })}>拼豆管理</button>
        }
      />
      {items.length === 0 ? (
        <div className={styles.empty}>还没有收藏任何物品</div>
      ) : (
        <div className={styles.content}>
          {[...grouped.entries()].map(([cat, catItems]) => (
            <div key={cat} className={styles.group}>
              <div className={styles.groupHeader}>
                <span className={styles.groupTitle}>{CAT_ZH[cat] ?? cat}</span>
                <span className={styles.groupCount}>{catItems.length} 个</span>
                <button className={styles.removeAll} onClick={() => removeAll(cat)}>全部移除</button>
              </div>
              {catItems.map(item => {
                const key = `${item.cat}/${item.name}`
                const satisfied = satisfiedSet.has(key)
                return (
                  <div key={item.name} className={styles.item} onClick={() => onNavigate({ type: 'item', cat: item.cat, name: item.name })}>
                    <img
                      className={styles.thumb}
                      src={`/gallery/${encodeURIComponent(item.cat)}/${item.name}.png`}
                      alt={item.display_name}
                      loading="lazy"
                      onError={e => { e.currentTarget.style.display = 'none' }}
                    />
                    <div className={styles.itemInfo}>
                      <span className={`${styles.itemName} ${satisfied ? styles.itemSatisfied : ''}`}>{item.display_name}</span>
                      {done.has(item.cat, item.name) && <span className={styles.doneTag}>已拼</span>}
                      {satisfied && !done.has(item.cat, item.name) && <span className={styles.satisfiedTag}>够了</span>}
                    </div>
                    <button className={styles.removeBtn} onClick={e => { e.stopPropagation(); remove(item.cat, item.name) }}>移除</button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useMemo } from 'react'
import { Header } from '../components/Header'
import { BackTitle } from '../components/BackTitle'
import { useStore } from '../hooks/useStore'
import type { NavTarget } from '../App'
import styles from './WishlistPage.module.css'

const CAT_ZH: Record<string, string> = {
  'Building Blocks': '建筑方块',
  'Combat':          '战斗',
  'Decorations':     '装饰',
  'Food and Drinks': '食物与饮料',
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

export function DonePage({ onBack, onNavigate }: Props) {
  const { done } = useStore()
  const { items, unmark } = done

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const item of items) {
      if (!map.has(item.cat)) map.set(item.cat, [])
      map.get(item.cat)!.push(item)
    }
    return map
  }, [items])

  return (
    <div className={styles.page}>
      <Header left={<BackTitle title="已拼" onBack={onBack} />} />
      {items.length === 0 ? (
        <div className={styles.empty}>还没有标记任何已拼物品</div>
      ) : (
        <div className={styles.content}>
          {[...grouped.entries()].map(([cat, catItems]) => (
            <div key={cat} className={styles.group}>
              <div className={styles.groupHeader}>
                <span className={styles.groupTitle}>{CAT_ZH[cat] ?? cat}</span>
                <span className={styles.groupCount}>{catItems.length} 个</span>
              </div>
              {catItems.map(item => (
                <div key={item.name} className={styles.item} onClick={() => onNavigate({ type: 'item', cat: item.cat, name: item.name })}>
                  <img
                    className={styles.thumb}
                    src={`/gallery/${encodeURIComponent(item.cat)}/${item.name}.png`}
                    alt={item.display_name}
                    loading="lazy"
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.display_name}</span>
                  </div>
                  <button className={styles.removeBtn} onClick={e => { e.stopPropagation(); unmark(item.cat, item.name) }}>取消</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

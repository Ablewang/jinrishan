import { useMemo, useState } from 'react'
import { Header } from '../components/Header'
import { ItemRow } from '../components/ItemRow'
import { useData } from '../hooks/useData'
import type { NavTarget } from '../App'
import type { ManifestItem } from '../types'
import styles from './CategoryPage.module.css'

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
  cat: string
  onNavigate: (target: NavTarget) => void
  onBack: () => void
}

export function CategoryPage({ cat, onNavigate, onBack }: Props) {
  const { manifest } = useData()
  const [query, setQuery] = useState('')
  const [composing, setComposing] = useState(false)

  const data = manifest?.categories[cat]

  const filtered = useMemo<ManifestItem[]>(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    if (!q) return data.items
    return data.items.filter(i =>
      i.display_name.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
    )
  }, [data, query])

  return (
    <div className={styles.page}>
      <Header
        onBack={onBack}
        title={CAT_ZH[cat] ?? cat}
        right={<button className={styles.link} onClick={() => onNavigate({ type: 'summary' })}>清单汇总</button>}
      />
      <div className={styles.searchWrap}>
        <input
          className={styles.search}
          type="text"
          placeholder="搜索物品名称..."
          value={query}
          onChange={e => { if (!composing) setQuery(e.target.value) }}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={e => { setComposing(false); setQuery((e.target as HTMLInputElement).value) }}
        />
      </div>
      <div className={styles.list}>
        {!data ? (
          <div className={styles.empty}>加载中...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>没有找到相关物品</div>
        ) : (
          filtered.map(item => (
            <ItemRow
              key={item.name}
              cat={cat}
              item={item}
              onClick={() => onNavigate({ type: 'item', cat, name: item.name })}
            />
          ))
        )}
      </div>
    </div>
  )
}

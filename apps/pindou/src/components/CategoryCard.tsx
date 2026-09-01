import type { ManifestCategory, SummaryCategory } from '../types'
import styles from './CategoryCard.module.css'

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

function fmt(n: number) { return n.toLocaleString('zh-CN') }

interface Props {
  cat: string
  data: ManifestCategory
  sumData: SummaryCategory | undefined
  onClick: () => void
}

export function CategoryCard({ cat, data, sumData, onClick }: Props) {
  const previews = data.items.filter(i => i.has_gallery).slice(0, 4)
  const total = sumData ? fmt(sumData.total_beads) : '—'

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.thumbs}>
        {Array.from({ length: 4 }, (_, k) => {
          const item = previews[k]
          return item ? (
            <div key={k} className={styles.thumbCell}>
              <img
                src={`/gallery/${encodeURIComponent(cat)}/${item.name}.png`}
                alt={item.display_name}
                loading="lazy"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            </div>
          ) : (
            <div key={k} className={`${styles.thumbCell} ${styles.thumbPh}`} />
          )
        })}
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{CAT_ZH[cat] ?? cat}</span>
        <span className={styles.meta}>{data.count} 款 · {total} 颗</span>
      </div>
    </div>
  )
}

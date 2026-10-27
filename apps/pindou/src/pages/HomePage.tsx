import { CategoryCard } from '../components/CategoryCard'
import { Header } from '../components/Header'
import { PaletteSegment } from '../components/PaletteSegment'
import { useData } from '../hooks/useData'
import type { NavTarget } from '../App'
import styles from './HomePage.module.css'

const LOGO = (
  <span className={styles.logo}>首页 </span>
)

interface Props {
  onNavigate: (target: NavTarget) => void
}

export function HomePage({ onNavigate }: Props) {
  const { manifest, summary, error } = useData()

  const leftSlot = (
    <div className={styles.headerLeft}>
      {LOGO}
      <span className={styles.divider}>|</span>
      <button className={styles.link} onClick={() => onNavigate({ type: 'summary' })}>材料表</button>
      <span className={styles.divider}>|</span>
      <button className={styles.link} onClick={() => onNavigate({ type: 'wishlist' })}>收藏</button>
      <span className={styles.divider}>|</span>
      <button className={styles.link} onClick={() => onNavigate({ type: 'done' })}>已拼</button>
    </div>
  )

  if (error) {
    return (
      <div className={styles.page}>
        <Header left={leftSlot} right={<PaletteSegment />} />
        <div className={styles.err}>{error}</div>
      </div>
    )
  }

  if (!manifest) {
    return (
      <div className={styles.page}>
        <Header left={leftSlot} right={<PaletteSegment />} />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Header left={leftSlot} right={<PaletteSegment />} />
      <main className={styles.grid}>
        {Object.entries(manifest.categories).map(([cat, data]) => (
          <CategoryCard
            key={cat}
            cat={cat}
            data={data}
            sumData={summary?.categories[cat]}
            onClick={() => onNavigate({ type: 'category', cat })}
          />
        ))}
      </main>
    </div>
  )
}

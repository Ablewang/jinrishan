import { CategoryCard } from '../components/CategoryCard'
import { Header } from '../components/Header'
import { useData } from '../hooks/useData'
import { usePalette } from '../hooks/usePalette'
import type { NavTarget } from '../App'
import styles from './HomePage.module.css'

const LOGO = (
  <span className={styles.logo}>分类 </span>
)

interface Props {
  onNavigate: (target: NavTarget) => void
}

export function HomePage({ onNavigate }: Props) {
  const { manifest, summary, error } = useData()
  const { palette, setPalette } = usePalette()

  const paletteSegment = (
    <div className={styles.segment}>
      <button
        className={`${styles.segBtn} ${palette === 'full' ? styles.segActive : ''}`}
        onClick={() => setPalette('full')}
      >完整色</button>
      <button
        className={`${styles.segBtn} ${palette === '221' ? styles.segActive : ''}`}
        onClick={() => setPalette('221')}
      >221色</button>
    </div>
  )

  const leftSlot = (
    <div className={styles.headerLeft}>
      {LOGO}
      <span className={styles.divider}>|</span>
      <button className={styles.link} onClick={() => onNavigate({ type: 'summary' })}>清单汇总</button>
      <span className={styles.divider}>|</span>
      <button className={styles.link} onClick={() => onNavigate({ type: 'wishlist' })}>收藏夹</button>
    </div>
  )

  if (error) {
    return (
      <div className={styles.page}>
        <Header left={leftSlot} right={paletteSegment} />
        <div className={styles.err}>{error}</div>
      </div>
    )
  }

  if (!manifest) {
    return (
      <div className={styles.page}>
        <Header left={leftSlot} right={paletteSegment} />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Header left={leftSlot} right={paletteSegment} />
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

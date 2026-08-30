import { CategoryCard } from '../components/CategoryCard'
import { Header } from '../components/Header'
import { useData } from '../hooks/useData'
import styles from './HomePage.module.css'

const LOGO = (
  <span className={styles.logo}>分类</span>
)

interface Props {
  onNavigate: (hash: string) => void
}

export function HomePage({ onNavigate }: Props) {
  const { manifest, summary, error } = useData()

  if (error) {
    return (
      <div className={styles.page}>
        <Header left={LOGO} />
        <div className={styles.err}>{error}</div>
      </div>
    )
  }

  if (!manifest) {
    return (
      <div className={styles.page}>
        <Header left={LOGO} />
        <div className={styles.loading}>加载中...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Header
        left={LOGO}
        right={<button className={styles.link} onClick={() => onNavigate('#/summary')}>清单汇总</button>}
      />
      <main className={styles.grid}>
        {Object.entries(manifest.categories).map(([cat, data]) => (
          <CategoryCard
            key={cat}
            cat={cat}
            data={data}
            sumData={summary?.categories[cat]}
            onClick={() => onNavigate(`#/category/${encodeURIComponent(cat)}`)}
          />
        ))}
      </main>
    </div>
  )
}

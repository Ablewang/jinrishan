import { useEffect, useState } from 'react'
import { adminStatsApi } from '../../api/stats'
import type { OverviewStats } from '../../types'
import styles from './Dashboard.module.css'

interface StatCard {
  icon: string
  label: string
  value: number
  color: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminStatsApi.overview()
      .then(s => { setStats(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const cards: StatCard[] = stats ? [
    { icon: '🍳', label: '菜谱总数', value: stats.recipe_count, color: '#e67e22' },
    { icon: '👥', label: '注册用户', value: stats.user_count, color: '#3498db' },
    { icon: '🏠', label: '家庭数量', value: stats.family_count, color: '#2ecc71' },
    { icon: '📊', label: '近 7 天推荐', value: stats.event_count_7d, color: '#9b59b6' },
  ] : []

  return (
    <div>
      <h1 className={styles.title}>仪表盘</h1>

      {loading ? (
        <p className={styles.loading}>加载中...</p>
      ) : (
        <div className={styles.grid}>
          {cards.map(card => (
            <div key={card.label} className={styles.card}>
              <div className={styles.cardIcon} style={{ background: card.color + '20' }}>
                {card.icon}
              </div>
              <div className={styles.cardInfo}>
                <div className={styles.cardValue} style={{ color: card.color }}>{card.value.toLocaleString()}</div>
                <div className={styles.cardLabel}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.quickLinks}>
        <h2 className={styles.sectionTitle}>快捷入口</h2>
        <div className={styles.linkGrid}>
          <a href="/recipes/new" className={styles.link}>+ 新建菜谱</a>
          <a href="/enums" className={styles.link}>管理枚举</a>
          <a href="/analytics" className={styles.link}>查看推荐分析</a>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { adminStatsApi } from '../../api/stats'
import type { RecommendStats } from '../../types'
import styles from './Analytics.module.css'

const EVENT_COLORS: Record<string, string> = {
  shown: '#95a5a6',
  accepted: '#2ecc71',
  rejected: '#e74c3c',
  swapped: '#f39c12',
  cooked: '#3498db',
}

const EVENT_LABELS: Record<string, string> = {
  shown: '展示',
  accepted: '接受',
  rejected: '拒绝',
  swapped: '换一换',
  cooked: '已做',
}

function nDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function Analytics() {
  const [stats, setStats] = useState<RecommendStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(nDaysAgo(30))
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    setLoading(true)
    adminStatsApi.recommendations({ date_from: dateFrom, date_to: dateTo })
      .then(s => { setStats(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [dateFrom, dateTo])

  const pieData = stats?.by_type.map(b => ({
    name: EVENT_LABELS[b.event_type] ?? b.event_type,
    value: b.count,
    color: EVENT_COLORS[b.event_type] ?? '#999',
  })) ?? []

  // Reshape by_date to recharts format
  const dateMap: Record<string, Record<string, number>> = {}
  stats?.by_date.forEach(d => {
    if (!dateMap[d.event_date]) dateMap[d.event_date] = {}
    dateMap[d.event_date][d.event_type] = d.count
  })
  const lineData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, types]) => ({ date: date.slice(5), ...types }))

  return (
    <div>
      <h1 className={styles.title}>推荐分析</h1>

      <div className={styles.filters}>
        <label>开始日期</label>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={styles.dateInput} />
        <label>结束日期</label>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={styles.dateInput} />
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : !stats ? (
        <div className={styles.loading}>暂无数据</div>
      ) : (
        <div className={styles.grid}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>事件类型分布</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>每日趋势</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {['accepted', 'rejected', 'swapped'].map(key => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={EVENT_LABELS[key]}
                    stroke={EVENT_COLORS[key]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>接受最多 TOP 10</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={stats.top_accepted.slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="recipe_name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" name="接受次数" fill="#2ecc71" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardTitle}>拒绝最多 TOP 10</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={stats.top_rejected.slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="recipe_name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" name="拒绝次数" fill="#e74c3c" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Card, Row, Col, DatePicker, Spin, App } from 'antd'
import dayjs from 'dayjs'
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { adminStatsApi } from '../../api/stats'
import type { RecommendStats } from '../../types'

const { RangePicker } = DatePicker

const EVENT_COLORS: Record<string, string> = {
  shown: '#95a5a6', accepted: '#2ecc71', rejected: '#e74c3c', swapped: '#f39c12', cooked: '#3498db',
}
const EVENT_LABELS: Record<string, string> = {
  shown: '展示', accepted: '接受', rejected: '拒绝', swapped: '换一换', cooked: '已做',
}

export default function Analytics() {
  const { message } = App.useApp()
  const [stats, setStats] = useState<RecommendStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ])

  useEffect(() => {
    setLoading(true)
    adminStatsApi.recommendations({ date_from: dateRange[0], date_to: dateRange[1] })
      .then(s => setStats(s))
      .catch(() => message.error('加载失败'))
      .finally(() => setLoading(false))
  }, [dateRange])

  const pieData = stats?.by_type.map(b => ({
    name: EVENT_LABELS[b.event_type] ?? b.event_type,
    value: b.count,
    color: EVENT_COLORS[b.event_type] ?? '#999',
  })) ?? []

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <RangePicker
          value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
          onChange={dates => {
            if (dates?.[0] && dates?.[1]) {
              setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')])
            }
          }}
        />
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="事件类型分布">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {pieData.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col span={12}>
            <Card title="每日趋势">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={lineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  {['accepted', 'rejected', 'swapped'].map(key => (
                    <Line key={key} type="monotone" dataKey={key} name={EVENT_LABELS[key]} stroke={EVENT_COLORS[key]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col span={12}>
            <Card title="接受最多 TOP 10">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats?.top_accepted.slice(0, 10) ?? []} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="recipe_name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" name="接受次数" fill="#2ecc71" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col span={12}>
            <Card title="拒绝最多 TOP 10">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats?.top_rejected.slice(0, 10) ?? []} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="recipe_name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" name="拒绝次数" fill="#e74c3c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Spin } from 'antd'
import { BookOutlined, UserOutlined, HomeOutlined, BarChartOutlined } from '@ant-design/icons'
import { adminStatsApi } from '../../api/stats'
import type { OverviewStats } from '../../types'

export default function Dashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminStatsApi.overview()
      .then(s => { setStats(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <Spin spinning={loading}>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic title="菜谱总数" value={stats?.recipe_count ?? 0} prefix={<BookOutlined />} valueStyle={{ color: '#e67e22' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="注册用户" value={stats?.user_count ?? 0} prefix={<UserOutlined />} valueStyle={{ color: '#3498db' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="家庭数量" value={stats?.family_count ?? 0} prefix={<HomeOutlined />} valueStyle={{ color: '#2ecc71' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="近 7 天推荐" value={stats?.event_count_7d ?? 0} prefix={<BarChartOutlined />} valueStyle={{ color: '#9b59b6' }} />
          </Card>
        </Col>
      </Row>
    </Spin>
  )
}

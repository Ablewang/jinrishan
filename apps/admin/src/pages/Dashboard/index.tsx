import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Statistic, Button, Spin, Space, Typography } from 'antd'
import {
  BookOutlined, UserOutlined, HomeOutlined, BarChartOutlined, PlusOutlined, TagsOutlined, LineChartOutlined,
} from '@ant-design/icons'
import { adminStatsApi } from '../../api/stats'
import type { OverviewStats } from '../../types'

const { Title } = Typography

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminStatsApi.overview()
      .then(s => { setStats(s); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>仪表盘</Title>

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

        <Card title="快捷入口" style={{ marginTop: 16 }}>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/recipes/new')}>新建菜谱</Button>
            <Button icon={<TagsOutlined />} onClick={() => navigate('/enums')}>管理枚举</Button>
            <Button icon={<LineChartOutlined />} onClick={() => navigate('/analytics')}>查看推荐分析</Button>
          </Space>
        </Card>
      </Spin>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Drawer, Avatar, Descriptions, Tag, Table, Spin, Typography, Divider, Statistic, Row, Col } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { adminUsersApi } from '../../api/users'
import type { UserDetail } from '../../types'

const { Text } = Typography

const ROLE_LABEL: Record<string, string> = { owner: '创建者', member: '成员' }
const PREF_TYPE_LABEL: Record<string, string> = {
  liked: '喜欢', disliked: '不喜欢', allergy: '过敏',
}
const PREF_TARGET_LABEL: Record<string, string> = {
  cuisine: '菜系', flavor: '口味', ingredient: '食材',
}

function fmtDate(s: string | null | undefined) {
  if (!s) return '-'
  return new Date(s).toLocaleString('zh-CN', { hour12: false })
}

interface Props {
  open: boolean
  userId: number | null
  onClose: () => void
}

export default function UserDrawer({ open, userId, onClose }: Props) {
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !userId) return
    setLoading(true)
    setDetail(null)
    adminUsersApi.get(userId)
      .then(setDetail)
      .finally(() => setLoading(false))
  }, [open, userId])

  const prefGroups = detail ? groupPrefs(detail.preferences) : []

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="用户详情"
      width={600}
      styles={{ body: { padding: '16px 24px' } }}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {detail && (
          <>
            {/* 头像 + 基本信息 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <Avatar
                src={detail.avatar ?? undefined}
                icon={<UserOutlined />}
                size={64}
                style={{ background: '#e67e22', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                  {detail.name ?? '未设置昵称'}
                </div>
                <Text type="secondary">{detail.phone}</Text>
              </div>
            </div>

            {/* 统计 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={8}>
                <Statistic title="周计划数" value={detail.plan_count} />
              </Col>
              <Col span={8}>
                <Statistic title="推荐互动" value={detail.event_count} />
              </Col>
              <Col span={8}>
                <Statistic title="加入家庭" value={detail.families.length} />
              </Col>
            </Row>

            <Descriptions column={1} size="small" bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="用户 ID">{detail.id}</Descriptions.Item>
              <Descriptions.Item label="注册时间">{fmtDate(detail.created_at)}</Descriptions.Item>
              <Descriptions.Item label="最后登录">{fmtDate(detail.last_login_at)}</Descriptions.Item>
            </Descriptions>

            {/* 家庭 */}
            <Divider style={{ fontSize: 13, margin: '0 0 12px' }}>所在家庭</Divider>
            {detail.families.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 13 }}>未加入任何家庭</Text>
            ) : (
              <Table
                size="small"
                rowKey="id"
                dataSource={detail.families}
                pagination={false}
                style={{ marginBottom: 24 }}
                columns={[
                  { title: '家庭名', dataIndex: 'name' },
                  { title: '邀请码', dataIndex: 'invite_code', render: v => <code>{v}</code> },
                  { title: '角色', dataIndex: 'role', render: v => ROLE_LABEL[v] ?? v },
                  { title: '加入时间', dataIndex: 'joined_at', render: v => fmtDate(v) },
                ]}
              />
            )}

            {/* 口味偏好 */}
            <Divider style={{ fontSize: 13, margin: '0 0 12px' }}>口味偏好</Divider>
            {prefGroups.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 13 }}>未设置偏好</Text>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {prefGroups.map(g => (
                  <div key={g.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12, width: 80, flexShrink: 0, paddingTop: 2 }}>
                      {g.label}
                    </Text>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {g.values.map(v => (
                        <Tag key={v} color={g.color}>{v}</Tag>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Spin>
    </Drawer>
  )
}

function groupPrefs(prefs: UserDetail['preferences']) {
  const map: Record<string, { label: string; color: string; values: string[] }> = {}
  for (const p of prefs) {
    const key = p.pref_type === 'allergy' ? 'allergy' : `${p.pref_type}_${p.target_type}`
    if (!map[key]) {
      const typeLabel = PREF_TYPE_LABEL[p.pref_type] ?? p.pref_type
      const targetLabel = p.pref_type === 'allergy' ? '过敏原' : (PREF_TARGET_LABEL[p.target_type] ?? p.target_type)
      map[key] = {
        label: `${typeLabel} · ${targetLabel}`,
        color: p.pref_type === 'liked' ? 'green' : p.pref_type === 'allergy' ? 'red' : 'orange',
        values: [],
      }
    }
    map[key].values.push(p.target_value)
  }
  return Object.values(map)
}

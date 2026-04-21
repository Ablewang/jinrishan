import { useEffect, useState } from 'react'
import { Table, App, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { adminUsersApi } from '../../api/users'
import type { Family } from '../../types'

const LIMIT = 20

export default function FamilyList() {
  const { message } = App.useApp()
  const [families, setFamilies] = useState<Family[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminUsersApi.families({ page, limit: LIMIT })
      .then(res => { setFamilies(res.data); setTotal(res.total) })
      .catch(() => message.error('加载失败'))
      .finally(() => setLoading(false))
  }, [page])

  const columns: ColumnsType<Family> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '家庭名', dataIndex: 'name' },
    {
      title: '邀请码', dataIndex: 'invite_code',
      render: v => (
        <Typography.Text code copyable={{ tooltips: ['复制', '已复制'] }}>{v}</Typography.Text>
      ),
    },
    { title: '成员数', dataIndex: 'member_count', width: 90 },
    {
      title: '创建时间', dataIndex: 'created_at',
      render: v => new Date(v).toLocaleDateString('zh-CN'),
    },
  ]

  return (
    <div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={families}
        loading={loading}
        pagination={{
          current: page,
          pageSize: LIMIT,
          total,
          showTotal: t => `共 ${t} 条`,
          onChange: p => setPage(p),
        }}
      />
    </div>
  )
}

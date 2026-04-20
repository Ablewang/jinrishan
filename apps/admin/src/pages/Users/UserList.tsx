import { useEffect, useState } from 'react'
import { Table, Input, Typography, App } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { adminUsersApi } from '../../api/users'
import type { User } from '../../types'

const { Title } = Typography
const LIMIT = 20

export default function UserList() {
  const { message } = App.useApp()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminUsersApi.list({ keyword, page, limit: LIMIT })
      .then(res => { setUsers(res.data); setTotal(res.total) })
      .catch(() => message.error('加载失败'))
      .finally(() => setLoading(false))
  }, [keyword, page])

  const columns: ColumnsType<User> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '手机号', dataIndex: 'phone' },
    { title: '昵称', dataIndex: 'name', render: v => v ?? '-' },
    {
      title: '注册时间', dataIndex: 'created_at',
      render: v => new Date(v).toLocaleDateString('zh-CN'),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>用户列表</Title>
      </div>
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索手机号..."
          allowClear
          style={{ width: 280 }}
          onSearch={v => { setKeyword(v.trim()); setPage(1) }}
        />
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
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

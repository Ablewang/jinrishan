import { useEffect, useState } from 'react'
import { Table, Input, App, Avatar } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { adminUsersApi } from '../../api/users'
import type { User } from '../../types'
import UserDrawer from './UserDrawer'

const LIMIT = 20

function fmtDate(s: string | null | undefined) {
  if (!s) return '-'
  return new Date(s).toLocaleString('zh-CN', { hour12: false })
}

export default function UserList() {
  const { message } = App.useApp()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    adminUsersApi.list({ keyword, page, limit: LIMIT })
      .then(res => { setUsers(res.data); setTotal(res.total) })
      .catch(() => message.error('加载失败'))
      .finally(() => setLoading(false))
  }, [keyword, page])

  function openDetail(id: number) {
    setSelectedId(id)
    setDrawerOpen(true)
  }

  const columns: ColumnsType<User> = [
    {
      title: '头像', dataIndex: 'avatar', width: 60,
      render: (avatar, record) => (
        <Avatar
          src={avatar ?? undefined}
          icon={<UserOutlined />}
          size={36}
          style={{ background: '#e67e22', cursor: 'pointer' }}
          onClick={() => openDetail(record.id)}
        />
      ),
    },
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '手机号', dataIndex: 'phone' },
    { title: '昵称', dataIndex: 'name', render: v => v ?? '-' },
    {
      title: '注册时间', dataIndex: 'created_at',
      render: v => fmtDate(v),
    },
    {
      title: '最后登录', dataIndex: 'last_login_at',
      render: v => fmtDate(v),
    },
  ]

  return (
    <div>
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
        rowClassName={() => 'clickable-row'}
        onRow={record => ({ onClick: () => openDetail(record.id), style: { cursor: 'pointer' } })}
        pagination={{
          current: page,
          pageSize: LIMIT,
          total,
          showTotal: t => `共 ${t} 条`,
          onChange: p => setPage(p),
        }}
      />

      <UserDrawer
        open={drawerOpen}
        userId={selectedId}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}

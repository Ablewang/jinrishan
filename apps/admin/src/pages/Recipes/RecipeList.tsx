import { useEffect, useState } from 'react'
import { Table, Input, Button, Tag, Space, Popconfirm, App } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { adminRecipesApi } from '../../api/recipes'
import type { Recipe } from '../../types'
import RecipeDrawer from './RecipeDrawer'

const DIFFICULTY_LABEL: Record<string, string> = { easy: '简单', medium: '中等', hard: '复杂' }
const LIMIT = 20

export default function RecipeList() {
  const { message } = App.useApp()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    adminRecipesApi.list({ keyword, page, limit: LIMIT })
      .then(res => { setRecipes(res.data); setTotal(res.total) })
      .catch(() => message.error('加载失败'))
      .finally(() => setLoading(false))
  }, [keyword, page])

  function openNew() {
    setEditId(null)
    setDrawerOpen(true)
  }

  function openEdit(id: number) {
    setEditId(id)
    setDrawerOpen(true)
  }

  function handleSaved(recipe: Recipe) {
    setDrawerOpen(false)
    if (editId) {
      setRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r))
    } else {
      setRecipes(prev => [recipe, ...prev])
      setTotal(prev => prev + 1)
    }
  }

  async function handleDelete(id: number) {
    setDeleting(id)
    try {
      await adminRecipesApi.delete(id)
      setRecipes(prev => prev.filter(r => r.id !== id))
      setTotal(prev => prev - 1)
      message.success('已删除')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '删除失败')
    } finally {
      setDeleting(null)
    }
  }

  const columns: ColumnsType<Recipe> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: '菜名', dataIndex: 'name', render: name => <strong>{name}</strong> },
    { title: '菜系', dataIndex: 'cuisine', width: 100 },
    {
      title: '难度', dataIndex: 'difficulty', width: 80,
      render: v => DIFFICULTY_LABEL[v] ?? v,
    },
    {
      title: '时长', dataIndex: 'cook_time', width: 90,
      render: v => `${v} 分钟`,
    },
    {
      title: '来源', dataIndex: 'source', width: 80,
      render: v => <Tag color={v === 'system' ? 'orange' : 'blue'}>{v === 'system' ? '系统' : '用户'}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 120,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record.id)}>编辑</Button>
          <Popconfirm
            title={`确认删除「${record.name}」？`}
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} loading={deleting === record.id}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>新建菜谱</Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索菜名..."
          allowClear
          style={{ width: 280 }}
          onSearch={v => { setKeyword(v.trim()); setPage(1) }}
        />
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={recipes}
        loading={loading}
        pagination={{
          current: page,
          pageSize: LIMIT,
          total,
          showTotal: t => `共 ${t} 条`,
          onChange: p => setPage(p),
        }}
      />

      <RecipeDrawer
        open={drawerOpen}
        id={editId}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}

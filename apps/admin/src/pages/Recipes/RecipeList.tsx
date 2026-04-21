import { useEffect, useState } from 'react'
import { Table, Input, Button, Tag, Space, Popconfirm, App, Select, InputNumber, Row, Col, Form } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { adminRecipesApi } from '../../api/recipes'
import type { Recipe } from '../../types'
import RecipeDrawer from './RecipeDrawer'

const DIFFICULTY_LABEL: Record<string, string> = { easy: '简单', medium: '中等', hard: '复杂' }
const DIFFICULTY_COLOR: Record<string, string> = { easy: 'green', medium: 'orange', hard: 'red' }
const CUISINES = ['家常菜', '川菜', '粤菜', '湘菜', '东北菜', '苏菜', '闽菜', '徽菜', '浙菜', '京菜', '清真', '西式', '日式', '韩式', '其他']
const LIMIT = 20

interface Filters {
  keyword: string
  cuisine: string
  difficulty: string
  source: string
  cook_time_min?: number
  cook_time_max?: number
}

const DEFAULT_FILTERS: Filters = { keyword: '', cuisine: '', difficulty: '', source: '' }

export default function RecipeList() {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    adminRecipesApi.list({ ...filters, page, limit: LIMIT })
      .then(res => { setRecipes(res.data); setTotal(res.total) })
      .catch(() => message.error('加载失败'))
      .finally(() => setLoading(false))
  }, [filters, page])

  function handleSearch(values: Filters) {
    setFilters(values)
    setPage(1)
  }

  function handleReset() {
    form.resetFields()
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }

  function openNew() { setEditId(null); setDrawerOpen(true) }
  function openEdit(id: number) { setEditId(id); setDrawerOpen(true) }

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
    { title: '菜系', dataIndex: 'cuisine', width: 90, render: v => v || '-' },
    {
      title: '难度', dataIndex: 'difficulty', width: 80,
      render: v => <Tag color={DIFFICULTY_COLOR[v]}>{DIFFICULTY_LABEL[v] ?? v}</Tag>,
    },
    {
      title: '时长', dataIndex: 'cook_time', width: 90,
      render: v => `${v} 分钟`,
      sorter: (a, b) => a.cook_time - b.cook_time,
    },
    {
      title: '来源', dataIndex: 'source', width: 80,
      render: v => <Tag color={v === 'system' ? 'orange' : 'blue'}>{v === 'system' ? '系统' : '用户'}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 140,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record.id)}>编辑</Button>
          <Popconfirm
            title={`确认删除「${record.name}」？`}
            okText="删除" okButtonProps={{ danger: true }} cancelText="取消"
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
      {/* 筛选栏 */}
      <Form form={form} onFinish={handleSearch} initialValues={DEFAULT_FILTERS}>
        <Row gutter={[12, 8]} align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Form.Item name="keyword" noStyle>
              <Input placeholder="搜索菜名..." allowClear style={{ width: 180 }} prefix={<SearchOutlined style={{ color: '#bbb' }} />} />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item name="cuisine" noStyle>
              <Select placeholder="菜系" allowClear style={{ width: 120 }}
                options={CUISINES.map(c => ({ label: c, value: c }))} />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item name="difficulty" noStyle>
              <Select placeholder="难度" allowClear style={{ width: 100 }}
                options={[
                  { label: '简单', value: 'easy' },
                  { label: '中等', value: 'medium' },
                  { label: '复杂', value: 'hard' },
                ]} />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item name="source" noStyle>
              <Select placeholder="来源" allowClear style={{ width: 100 }}
                options={[
                  { label: '系统', value: 'system' },
                  { label: '用户', value: 'user' },
                ]} />
            </Form.Item>
          </Col>
          <Col>
            <Space.Compact>
              <Form.Item name="cook_time_min" noStyle>
                <InputNumber placeholder="时长≥" min={0} style={{ width: 90 }} addonAfter="分" />
              </Form.Item>
              <Form.Item name="cook_time_max" noStyle>
                <InputNumber placeholder="时长≤" min={0} style={{ width: 90 }} addonAfter="分" />
              </Form.Item>
            </Space.Compact>
          </Col>
          <Col>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button>
              <Button icon={<ClearOutlined />} onClick={handleReset}>重置</Button>
            </Space>
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>新建菜谱</Button>
          </Col>
        </Row>
      </Form>

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

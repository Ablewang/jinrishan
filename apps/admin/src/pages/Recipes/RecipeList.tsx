import { useRef, useState } from 'react'
import { Button, Tag, Space, Popconfirm, App } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { ProTable } from '@ant-design/pro-components'
import type { ActionType, ProColumns } from '@ant-design/pro-components'
import { adminRecipesApi } from '../../api/recipes'
import type { Recipe } from '../../types'
import RecipeDrawer from './RecipeDrawer'
import type { RecipeDrawerHandle } from './RecipeDrawer'

const DIFFICULTY_LABEL: Record<string, string> = { easy: '简单', medium: '中等', hard: '复杂' }
const DIFFICULTY_COLOR: Record<string, string> = { easy: 'green', medium: 'orange', hard: 'red' }
const CUISINES = ['家常菜', '川菜', '粤菜', '湘菜', '东北菜', '苏菜', '闽菜', '徽菜', '浙菜', '京菜', '清真', '西式', '日式', '韩式', '其他']

export default function RecipeList() {
  const { message } = App.useApp()
  const tableRef = useRef<ActionType>(undefined)
  const drawerRef = useRef<RecipeDrawerHandle>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  async function handleDelete(id: number) {
    setDeleting(id)
    try {
      await adminRecipesApi.delete(id)
      message.success('已删除')
      tableRef.current?.reload()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '删除失败')
    } finally {
      setDeleting(null)
    }
  }

  const columns: ProColumns<Recipe>[] = [
    { title: 'ID', dataIndex: 'id', width: 60, search: false },
    {
      title: '菜名', dataIndex: 'name',
      fieldProps: { placeholder: '搜索菜名' },
      render: (_, record) => record.name,
    },
    {
      title: '菜系', dataIndex: 'cuisine', width: 100,
      valueType: 'select',
      valueEnum: Object.fromEntries(CUISINES.map(c => [c, { text: c }])),
      render: (_, record) => record.cuisine || '-',
    },
    {
      title: '难度', dataIndex: 'difficulty', width: 80,
      valueType: 'select',
      valueEnum: { easy: { text: '简单' }, medium: { text: '中等' }, hard: { text: '复杂' } },
      render: (_, record) => (
        <Tag color={DIFFICULTY_COLOR[record.difficulty]}>{DIFFICULTY_LABEL[record.difficulty] ?? record.difficulty}</Tag>
      ),
    },
    {
      title: '时长(分钟)', dataIndex: 'cook_time', width: 120,
      valueType: 'digitRange',
      search: {
        transform: (value: [number, number]) => ({
          cook_time_min: value?.[0],
          cook_time_max: value?.[1],
        }),
      },
      render: (_, record) => `${record.cook_time} 分钟`,
    },
    {
      title: '来源', dataIndex: 'source', width: 90,
      valueType: 'select',
      valueEnum: { system: { text: '系统' }, user: { text: '用户' } },
      render: (_, record) => (
        <Tag color={record.source === 'system' ? 'orange' : 'blue'}>
          {record.source === 'system' ? '系统' : '用户'}
        </Tag>
      ),
    },
    {
      title: '操作', key: 'action', width: 140, search: false,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => drawerRef.current?.open(record.id)}>编辑</Button>
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
    <>
      <ProTable<Recipe>
        rowKey="id"
        actionRef={tableRef}
        columns={columns}
        request={async (params) => {
          const { current, pageSize, name: keyword, cuisine, difficulty, source, cook_time_min, cook_time_max } = params
          const res = await adminRecipesApi.list({
            keyword, cuisine, difficulty, source,
            cook_time_min, cook_time_max,
            page: current, limit: pageSize,
          })
          return { data: res.data, success: true, total: res.total }
        }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
        toolBarRender={() => [
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => drawerRef.current?.open()}>新建菜谱</Button>,
        ]}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        dateFormatter="string"
      />

      <RecipeDrawer ref={drawerRef} onSaved={() => tableRef.current?.reload()} />
    </>
  )
}

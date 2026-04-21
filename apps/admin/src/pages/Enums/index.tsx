import { useEffect, useState } from 'react'
import { Card, Menu, Input, Button, Spin, App, Row, Col } from 'antd'
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { adminEnumsApi } from '../../api/enums'
import type { EnumValue } from '../../types'

const ENUM_TYPE_LABELS: Record<string, string> = {
  cuisine: '菜系',
  category: '菜品分类',
  cooking_method: '烹饪方式',
  flavor: '口味',
  protein_type: '蛋白质类型',
  nutrition_tag: '营养标签',
  season: '季节',
  allergy: '过敏原',
}

// 拖拽行组件
function SortableRow({
  item, index, onChange, onRemove,
}: {
  item: EnumValue & { _key: string }
  index: number
  onChange: (index: number, field: 'value' | 'label', val: string) => void
  onRemove: (index: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item._key })

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? '#fafafa' : 'transparent',
        borderRadius: 4,
      }}
    >
      <span
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', color: '#bbb', fontSize: 16, flexShrink: 0, lineHeight: 1, paddingTop: 2 }}
      >
        <HolderOutlined />
      </span>
      <Input
        placeholder="值 (英文)"
        value={item.value}
        style={{ width: 180 }}
        onChange={e => onChange(index, 'value', e.target.value)}
      />
      <Input
        placeholder="显示名"
        value={item.label}
        style={{ width: 180 }}
        onChange={e => onChange(index, 'label', e.target.value)}
      />
      <Button icon={<DeleteOutlined />} danger type="text" onClick={() => onRemove(index)} />
    </div>
  )
}

let _keyCounter = 0
function mkKey() { return String(++_keyCounter) }

type EditItem = EnumValue & { _key: string }

export default function EnumManager() {
  const { message } = App.useApp()
  const [allEnums, setAllEnums] = useState<Record<string, EnumValue[]>>({})
  const [activeType, setActiveType] = useState('')
  const [editing, setEditing] = useState<EditItem[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    adminEnumsApi.list().then(data => {
      setAllEnums(data)
      const firstType = Object.keys(data)[0] ?? ''
      setActiveType(firstType)
      setEditing((data[firstType] ?? []).map(e => ({ ...e, _key: mkKey() })))
    }).catch(() => message.error('加载失败'))
      .finally(() => setLoading(false))
  }, [])

  function selectType(type: string) {
    setActiveType(type)
    setEditing((allEnums[type] ?? []).map(e => ({ ...e, _key: mkKey() })))
  }

  function updateValue(index: number, field: 'value' | 'label', val: string) {
    setEditing(prev => prev.map((e, i) => i === index ? { ...e, [field]: val } : e))
  }

  function addValue() {
    setEditing(prev => [...prev, { id: 0, enum_type: activeType, value: '', label: '', sort_order: prev.length + 1, _key: mkKey() }])
  }

  function removeValue(index: number) {
    setEditing(prev => prev.filter((_, i) => i !== index))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setEditing(prev => {
      const oldIndex = prev.findIndex(e => e._key === active.id)
      const newIndex = prev.findIndex(e => e._key === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const values = editing.filter(e => e.value.trim()).map((e, i) => ({
        value: e.value, label: e.label || e.value, sort_order: i + 1,
      }))
      await adminEnumsApi.update(activeType, values)
      setAllEnums(prev => ({ ...prev, [activeType]: editing }))
      message.success('保存成功')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const menuItems = Object.keys(allEnums).map(type => ({
    key: type,
    label: (
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{ENUM_TYPE_LABELS[type] ?? type}</span>
        <span style={{ color: '#999', fontSize: 12 }}>{allEnums[type]?.length ?? 0}</span>
      </span>
    ),
  }))

  return (
    <div>
      <Spin spinning={loading}>
        <Row gutter={16}>
          <Col span={5}>
            <Card bodyStyle={{ padding: 0 }}>
              <Menu
                mode="inline"
                selectedKeys={[activeType]}
                items={menuItems}
                style={{ border: 'none' }}
                onClick={({ key }) => selectType(key)}
              />
            </Card>
          </Col>
          <Col span={19}>
            <Card
              title={ENUM_TYPE_LABELS[activeType] ?? activeType}
              extra={
                <Button type="primary" loading={saving} onClick={handleSave}>保存</Button>
              }
            >
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={editing.map(e => e._key)} strategy={verticalListSortingStrategy}>
                  {editing.map((e, i) => (
                    <SortableRow
                      key={e._key}
                      item={e}
                      index={i}
                      onChange={updateValue}
                      onRemove={removeValue}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              <Button icon={<PlusOutlined />} type="dashed" onClick={addValue} style={{ marginTop: 4 }}>
                添加值
              </Button>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}

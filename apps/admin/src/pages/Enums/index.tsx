import { useEffect, useState } from 'react'
import { Card, Menu, Input, Button, Space, Spin, App, Row, Col } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
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

export default function EnumManager() {
  const { message } = App.useApp()
  const [allEnums, setAllEnums] = useState<Record<string, EnumValue[]>>({})
  const [activeType, setActiveType] = useState('')
  const [editing, setEditing] = useState<EnumValue[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminEnumsApi.list().then(data => {
      setAllEnums(data)
      const firstType = Object.keys(data)[0] ?? ''
      setActiveType(firstType)
      setEditing(data[firstType] ? [...data[firstType]] : [])
    }).catch(() => message.error('加载失败'))
      .finally(() => setLoading(false))
  }, [])

  function selectType(type: string) {
    setActiveType(type)
    setEditing(allEnums[type] ? [...allEnums[type]] : [])
  }

  function updateValue(index: number, field: 'value' | 'label', val: string) {
    setEditing(prev => prev.map((e, i) => i === index ? { ...e, [field]: val } : e))
  }

  function addValue() {
    setEditing(prev => [...prev, { id: 0, enum_type: activeType, value: '', label: '', sort_order: prev.length + 1 }])
  }

  function removeValue(index: number) {
    setEditing(prev => prev.filter((_, i) => i !== index))
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
              <Space direction="vertical" style={{ width: '100%' }}>
                {editing.map((e, i) => (
                  <Space key={i} style={{ width: '100%' }}>
                    <Input
                      placeholder="值 / 显示名"
                      value={e.value}
                      style={{ width: 240 }}
                      onChange={ev => updateValue(i, 'value', ev.target.value)}
                    />
                    <Button icon={<DeleteOutlined />} danger type="text" onClick={() => removeValue(i)} />
                  </Space>
                ))}
                <Button icon={<PlusOutlined />} type="dashed" onClick={addValue}>添加值</Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}

import { useEffect } from 'react'
import {
  Drawer, Form, Input, Select, InputNumber, Checkbox, Button, Card, Row, Col,
  Space, App, Divider,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { adminRecipesApi } from '../../api/recipes'
import type { Recipe } from '../../types'

const { TextArea } = Input

const CUISINES = ['川菜', '粤菜', '湘菜', '东北菜', '家常菜', '西式', '日式', '韩式', '其他']
const CATEGORIES = ['家常', '汤品', '凉菜', '炒菜', '炖菜', '蒸菜', '烤类', '主食', '点心']
const COOKING_METHODS = ['炒', '炖', '蒸', '烤', '拌', '炸', '煮', '煎', '焖']
const PROTEIN_TYPES = ['猪肉', '牛肉', '鸡肉', '鱼肉', '海鲜', '蛋类', '豆类', '蔬菜']
const INGREDIENT_CATS = ['主料', '配料', '调味料', '其他']
const MEAL_TYPE_OPTIONS = [
  { label: '早餐', value: 'breakfast' },
  { label: '午餐', value: 'lunch' },
  { label: '晚餐', value: 'dinner' },
]

interface Props {
  open: boolean
  id?: number | null
  onClose: () => void
  onSaved: (recipe?: Recipe) => void
}

export default function RecipeDrawer({ open, id, onClose, onSaved }: Props) {
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const isEdit = Boolean(id)

  useEffect(() => {
    if (!open) return
    if (!isEdit || !id) {
      form.resetFields()
      form.setFieldsValue({
        difficulty: 'easy',
        spicy_level: 0,
        prep_time: 15,
        cook_time: 30,
        ingredients: [{ name: '', amount: '', category: '主料' }],
        steps: [{ description: '' }],
      })
      return
    }
    adminRecipesApi.get(id).then(recipe => {
      form.setFieldsValue({
        ...recipe,
        ingredients: recipe.ingredients?.length
          ? recipe.ingredients
          : [{ name: '', amount: '', category: '主料' }],
        steps: recipe.steps?.length
          ? recipe.steps
          : [{ description: '' }],
      })
    }).catch(() => message.error('加载菜谱失败'))
  }, [open, id])

  async function handleSave() {
    try {
      const values = await form.validateFields() as Partial<Recipe> & { ingredients: unknown[]; steps: unknown[] }
      if (isEdit && id) {
        const updated = await adminRecipesApi.update(id, values)
        message.success('保存成功')
        onSaved(updated)
      } else {
        const created = await adminRecipesApi.create(values)
        message.success('创建成功')
        onSaved(created)
      }
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error(e instanceof Error ? e.message : '保存失败')
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? '编辑菜谱' : '新建菜谱'}
      width="clamp(960px, 70vw, 1280px)"
      styles={{ body: { padding: '16px 24px 80px' } }}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Card title="基本信息" style={{ marginBottom: 16 }}>
              <Form.Item name="name" label="菜名" rules={[{ required: true, message: '请填写菜名' }]}>
                <Input placeholder="红烧肉" />
              </Form.Item>
              <Form.Item name="description" label="简介">
                <TextArea rows={3} placeholder="一道经典家常菜..." />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="cuisine" label="菜系">
                    <Select placeholder="请选择" options={CUISINES.map(c => ({ label: c, value: c }))} allowClear />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="category" label="分类">
                    <Select placeholder="请选择" options={CATEGORIES.map(c => ({ label: c, value: c }))} allowClear />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="prep_time" label="预处理时间 (分钟)">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="cook_time" label="烹饪时间 (分钟)">
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="difficulty" label="难度">
                    <Select options={[{ label: '简单', value: 'easy' }, { label: '中等', value: 'medium' }, { label: '复杂', value: 'hard' }]} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="spicy_level" label="辣度">
                    <Select options={[{ label: '不辣', value: 0 }, { label: '微辣', value: 1 }, { label: '中辣', value: 2 }, { label: '重辣', value: 3 }]} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="cooking_method" label="烹饪方式">
                    <Select placeholder="请选择" options={COOKING_METHODS.map(m => ({ label: m, value: m }))} allowClear />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="protein_type" label="蛋白质类型">
                    <Select placeholder="请选择" options={PROTEIN_TYPES.map(p => ({ label: p, value: p }))} allowClear />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="meal_types" label="适用餐次">
                <Checkbox.Group options={MEAL_TYPE_OPTIONS} />
              </Form.Item>
            </Card>
          </Col>

          <Col span={12}>
            <Card title="食材" style={{ marginBottom: 16 }}>
              <Form.List name="ingredients">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name }) => (
                      <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                        <Form.Item name={[name, 'name']} noStyle>
                          <Input placeholder="食材名" style={{ width: 130 }} />
                        </Form.Item>
                        <Form.Item name={[name, 'amount']} noStyle>
                          <Input placeholder="用量" style={{ width: 90 }} />
                        </Form.Item>
                        <Form.Item name={[name, 'category']} noStyle>
                          <Select style={{ width: 90 }} options={INGREDIENT_CATS.map(c => ({ label: c, value: c }))} />
                        </Form.Item>
                        <Button icon={<DeleteOutlined />} type="text" danger onClick={() => remove(name)} />
                      </Space>
                    ))}
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ name: '', amount: '', category: '配料' })}>
                      添加食材
                    </Button>
                  </>
                )}
              </Form.List>
            </Card>

            <Card title="烹饪步骤">
              <Form.List name="steps">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name }, index) => (
                      <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%', background: '#e67e22',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 600, flexShrink: 0, marginTop: 4,
                        }}>
                          {index + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <Form.Item name={[name, 'description']} noStyle>
                            <TextArea placeholder={`第 ${index + 1} 步描述...`} rows={2} />
                          </Form.Item>
                        </div>
                        <Button icon={<DeleteOutlined />} type="text" danger onClick={() => remove(name)} />
                      </div>
                    ))}
                    <Divider style={{ margin: '8px 0' }} />
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ description: '' })}>
                      添加步骤
                    </Button>
                  </>
                )}
              </Form.List>
            </Card>
          </Col>
        </Row>
      </Form>
    </Drawer>
  )
}

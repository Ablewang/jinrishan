import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'
import { verifyToken } from '../lib/jwt'

const enums = new Hono<AppContext>()

const VALID_TYPES = [
  'cuisine', 'category', 'meal_type', 'protein_type',
  'flavor', 'cooking_method', 'nutrition_tag', 'season',
]

enums.get('/:type', async (c) => {
  const type = c.req.param('type')
  if (!VALID_TYPES.includes(type)) {
    return c.json({ error: '无效的枚举类型' }, 400)
  }

  const { results: systemValues } = await c.env.DB.prepare(
    `SELECT value FROM system_enum_configs
     WHERE type = ? AND is_active = 1 ORDER BY sort_order`
  ).bind(type).all<{ value: string }>()

  // 尝试获取用户自定义值（可选，游客跳过）
  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  let userValues: { value: string }[] = []

  if (token && c.env.JWT_SECRET) {
    const userId = await verifyToken(token, c.env.JWT_SECRET)
    if (userId) {
      const { results } = await c.env.DB.prepare(
        `SELECT value FROM user_enum_configs WHERE user_id = ? AND type = ?`
      ).bind(userId, type).all<{ value: string }>()
      userValues = results
    }
  }

  const values = [
    ...systemValues.map(r => r.value),
    ...userValues.map(r => r.value),
  ]
  return c.json({ data: values })
})

enums.post('/user', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { type, value } = await c.req.json<{ type: string; value: string }>()

  if (!VALID_TYPES.includes(type)) return c.json({ error: '无效的枚举类型' }, 400)
  if (!value?.trim()) return c.json({ error: 'value 不能为空' }, 400)

  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO user_enum_configs (user_id, type, value) VALUES (?, ?, ?)`
  ).bind(userId, type, value.trim()).run()

  return c.json({ data: { ok: true } })
})

export default enums

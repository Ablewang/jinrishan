import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const inventory = new Hono<AppContext>()

inventory.use('*', authMiddleware)

// 获取整个色板库存
inventory.get('/:palette', async (c) => {
  const userId = c.get('userId')
  const palette = c.req.param('palette')

  const rows = await c.env.DB.prepare(
    'SELECT color_code, count FROM pindou_inventory WHERE user_id = ? AND palette = ?'
  ).bind(userId, palette).all<{ color_code: string; count: number }>()

  const data: Record<string, number> = {}
  for (const row of rows.results) {
    data[row.color_code] = row.count
  }
  return c.json({ data })
})

// 设置单个色号数量（count = 0 则删除）
inventory.put('/:palette/:code', async (c) => {
  const userId = c.get('userId')
  const palette = c.req.param('palette')
  const code = decodeURIComponent(c.req.param('code'))
  const { count } = await c.req.json<{ count: number }>()

  if (typeof count !== 'number' || count < 0) return c.json({ error: '参数无效' }, 400)

  if (count === 0) {
    await c.env.DB.prepare(
      'DELETE FROM pindou_inventory WHERE user_id = ? AND palette = ? AND color_code = ?'
    ).bind(userId, palette, code).run()
  } else {
    await c.env.DB.prepare(`
      INSERT INTO pindou_inventory (user_id, palette, color_code, count, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, palette, color_code) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at
    `).bind(userId, palette, code, count).run()
  }

  return c.json({ data: { ok: true } })
})

// 清空色板
inventory.delete('/:palette', async (c) => {
  const userId = c.get('userId')
  const palette = c.req.param('palette')

  await c.env.DB.prepare(
    'DELETE FROM pindou_inventory WHERE user_id = ? AND palette = ?'
  ).bind(userId, palette).run()

  return c.json({ data: { ok: true } })
})

export default inventory

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const wishlist = new Hono<AppContext>()

wishlist.use('*', authMiddleware)

// 获取全部
wishlist.get('/', async (c) => {
  const userId = c.get('userId')
  const items = await c.env.DB.prepare(
    'SELECT cat, name, display_name, created_at FROM pindou_wishlist WHERE user_id = ? ORDER BY created_at ASC'
  ).bind(userId).all()
  return c.json({ data: items.results })
})

// 添加单条
wishlist.post('/', async (c) => {
  const userId = c.get('userId')
  const { cat, name, display_name } = await c.req.json<{ cat: string; name: string; display_name: string }>()
  if (!cat || !name || !display_name) return c.json({ error: '参数缺失' }, 400)

  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO pindou_wishlist (user_id, cat, name, display_name) VALUES (?, ?, ?, ?)'
  ).bind(userId, cat, name, display_name).run()

  return c.json({ data: { ok: true } })
})

// 批量添加
wishlist.post('/batch', async (c) => {
  const userId = c.get('userId')
  const { items } = await c.req.json<{ items: { cat: string; name: string; display_name: string }[] }>()
  if (!Array.isArray(items) || items.length === 0) return c.json({ error: '参数缺失' }, 400)

  const stmt = c.env.DB.prepare(
    'INSERT OR IGNORE INTO pindou_wishlist (user_id, cat, name, display_name) VALUES (?, ?, ?, ?)'
  )
  await c.env.DB.batch(items.map(i => stmt.bind(userId, i.cat, i.name, i.display_name)))

  return c.json({ data: { ok: true } })
})

// 删除单条
wishlist.delete('/:cat/:name', async (c) => {
  const userId = c.get('userId')
  const cat = decodeURIComponent(c.req.param('cat'))
  const name = decodeURIComponent(c.req.param('name'))

  await c.env.DB.prepare(
    'DELETE FROM pindou_wishlist WHERE user_id = ? AND cat = ? AND name = ?'
  ).bind(userId, cat, name).run()

  return c.json({ data: { ok: true } })
})

// 删除整个分类
wishlist.delete('/:cat', async (c) => {
  const userId = c.get('userId')
  const cat = decodeURIComponent(c.req.param('cat'))

  await c.env.DB.prepare(
    'DELETE FROM pindou_wishlist WHERE user_id = ? AND cat = ?'
  ).bind(userId, cat).run()

  return c.json({ data: { ok: true } })
})

export default wishlist

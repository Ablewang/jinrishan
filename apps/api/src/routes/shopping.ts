import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const shopping = new Hono<AppContext>()

shopping.get('/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const list = await c.env.DB.prepare('SELECT * FROM shopping_lists WHERE id = ?').bind(id).first()
  if (!list) return c.json({ error: '清单不存在' }, 404)

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM shopping_list_items WHERE list_id = ? ORDER BY category, ingredient_name'
  ).bind(id).all()

  return c.json({ data: { ...list, items } })
})

shopping.put('/:id/items/:itemId', authMiddleware, async (c) => {
  const itemId = Number(c.req.param('itemId'))
  const { checked } = await c.req.json<{ checked: boolean }>()

  await c.env.DB.prepare(
    'UPDATE shopping_list_items SET checked = ? WHERE id = ?'
  ).bind(checked ? 1 : 0, itemId).run()

  return c.json({ data: { ok: true } })
})

export default shopping

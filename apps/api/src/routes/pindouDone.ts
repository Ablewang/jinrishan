import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const done = new Hono<AppContext>()

done.use('*', authMiddleware)

// 获取全部
done.get('/', async (c) => {
  const userId = c.get('userId')
  const items = await c.env.DB.prepare(
    'SELECT cat, name, display_name, done_at FROM pindou_done WHERE user_id = ? ORDER BY done_at ASC'
  ).bind(userId).all()
  return c.json({ data: items.results })
})

// 标记已拼
done.post('/', async (c) => {
  const userId = c.get('userId')
  const { cat, name, display_name, done_at } = await c.req.json<{
    cat: string; name: string; display_name: string; done_at?: number
  }>()
  if (!cat || !name || !display_name) return c.json({ error: '参数缺失' }, 400)

  const doneAt = done_at ?? Date.now()
  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO pindou_done (user_id, cat, name, display_name, done_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(userId, cat, name, display_name, doneAt).run()

  return c.json({ data: { ok: true } })
})

// 取消已拼
done.delete('/:cat/:name', async (c) => {
  const userId = c.get('userId')
  const cat = decodeURIComponent(c.req.param('cat'))
  const name = decodeURIComponent(c.req.param('name'))

  await c.env.DB.prepare(
    'DELETE FROM pindou_done WHERE user_id = ? AND cat = ? AND name = ?'
  ).bind(userId, cat, name).run()

  return c.json({ data: { ok: true } })
})

export default done

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const store = new Hono<AppContext>()

store.use('/*', authMiddleware)

// 获取单个 key
store.get('/:app/:key', async (c) => {
  const userId = c.get('userId')
  const { app, key } = c.req.param()

  const row = await c.env.DB.prepare(
    'SELECT value FROM app_store WHERE user_id = ? AND app = ? AND key = ?'
  ).bind(userId, app, key).first<{ value: string }>()

  return c.json({ data: row?.value ?? null })
})

// 写入单个 key
store.put('/:app/:key', async (c) => {
  const userId = c.get('userId')
  const { app, key } = c.req.param()
  const { value } = await c.req.json<{ value: string }>()

  if (value === undefined) return c.json({ error: '缺少 value' }, 400)

  await c.env.DB.prepare(`
    INSERT INTO app_store (user_id, app, key, value, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, app, key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `).bind(userId, app, key, value).run()

  return c.json({ data: { ok: true } })
})

// 删除单个 key
store.delete('/:app/:key', async (c) => {
  const userId = c.get('userId')
  const { app, key } = c.req.param()

  await c.env.DB.prepare(
    'DELETE FROM app_store WHERE user_id = ? AND app = ? AND key = ?'
  ).bind(userId, app, key).run()

  return c.json({ data: { ok: true } })
})

// 获取某个 app 下所有 key
store.get('/:app', async (c) => {
  const userId = c.get('userId')
  const { app } = c.req.param()

  const { results } = await c.env.DB.prepare(
    'SELECT key, value, updated_at FROM app_store WHERE user_id = ? AND app = ?'
  ).bind(userId, app).all<{ key: string; value: string; updated_at: string }>()

  const data: Record<string, string> = {}
  for (const row of results) data[row.key] = row.value

  return c.json({ data })
})

export default store

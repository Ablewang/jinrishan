import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

type Bindings = { DB: D1Database }

const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

app.get('/todos', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM todos ORDER BY created_at DESC'
  ).all()
  return c.json(results)
})

app.post('/todos', async (c) => {
  const { title } = await c.req.json<{ title: string }>()
  if (!title?.trim()) return c.json({ error: 'title required' }, 400)
  const { meta } = await c.env.DB.prepare(
    'INSERT INTO todos (title) VALUES (?)'
  ).bind(title.trim()).run()
  const todo = await c.env.DB.prepare(
    'SELECT * FROM todos WHERE id = ?'
  ).bind(meta.last_row_id).first()
  return c.json(todo, 201)
})

app.patch('/todos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const { done } = await c.req.json<{ done: boolean }>()
  await c.env.DB.prepare(
    'UPDATE todos SET done = ? WHERE id = ?'
  ).bind(done ? 1 : 0, id).run()
  const todo = await c.env.DB.prepare(
    'SELECT * FROM todos WHERE id = ?'
  ).bind(id).first()
  return c.json(todo)
})

app.delete('/todos/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare('DELETE FROM todos WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

export const onRequest = handle(app)

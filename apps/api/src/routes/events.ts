import { Hono } from 'hono'
import type { AppContext } from '../types'

const events = new Hono<AppContext>()

events.post('/', async (c) => {
  const body = await c.req.json<{
    family_id: number
    recipe_id: number
    event_type: string
    meal_type?: string
    event_date?: string
    source?: string
  }>()

  if (!body.family_id || !body.recipe_id || !body.event_type) {
    return c.json({ error: '参数缺失' }, 400)
  }

  const validEvents = ['shown', 'accepted', 'rejected', 'swapped', 'cooked']
  if (!validEvents.includes(body.event_type)) {
    return c.json({ error: '无效的 event_type' }, 400)
  }

  await c.env.DB.prepare(`
    INSERT INTO recommendation_events (family_id, recipe_id, event_type, meal_type, event_date, source)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    body.family_id, body.recipe_id, body.event_type,
    body.meal_type ?? null,
    body.event_date ?? new Date().toISOString().slice(0, 10),
    body.source ?? 'daily'
  ).run()

  return c.json({ data: { ok: true } })
})

export default events

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const logs = new Hono<AppContext>()

// POST /api/logs - 记录今日已选菜谱
logs.post('/', authMiddleware, async (c) => {
  const body = await c.req.json<{ family_id: number; date: string; meal_type: string; recipe_ids: number[] }>()
  const { family_id, date, meal_type, recipe_ids } = body
  if (!family_id || !date || !meal_type || !recipe_ids?.length) {
    return c.json({ error: '参数缺失' }, 400)
  }

  // 先删除当天该餐的旧记录，再插入
  await c.env.DB.prepare(
    'DELETE FROM meal_logs WHERE family_id = ? AND date = ? AND meal_type = ?'
  ).bind(family_id, date, meal_type).run()

  const stmts = recipe_ids.map(recipe_id =>
    c.env.DB.prepare(
      'INSERT INTO meal_logs (family_id, date, meal_type, recipe_id) VALUES (?, ?, ?, ?)'
    ).bind(family_id, date, meal_type, recipe_id)
  )
  await c.env.DB.batch(stmts)

  return c.json({ ok: true })
})

// GET /api/logs?family_id=&date= - 获取某天的饮食记录
logs.get('/', authMiddleware, async (c) => {
  const { family_id, date } = c.req.query()
  if (!family_id || !date) return c.json({ error: '参数缺失' }, 400)

  const { results } = await c.env.DB.prepare(`
    SELECT ml.meal_type, ml.recipe_id,
           r.name, r.images, r.cook_time, r.difficulty, r.cuisine, r.description
    FROM meal_logs ml
    JOIN recipes r ON r.id = ml.recipe_id
    WHERE ml.family_id = ? AND ml.date = ?
    ORDER BY ml.meal_type, ml.id
  `).bind(Number(family_id), date).all()

  const meals: Record<string, { recipe_id: number; name: string; images: string[] }[]> = {}
  for (const row of results as any[]) {
    const mt = row.meal_type as string
    if (!meals[mt]) meals[mt] = []
    meals[mt].push({ ...row, images: (() => { try { return JSON.parse(row.images) } catch { return [] } })() })
  }

  return c.json({ data: meals })
})

export default logs

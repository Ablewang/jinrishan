import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'
import { recommend } from '../lib/recommender'

const plans = new Hono<AppContext>()

interface PlanItem {
  date: string
  meal_type: string
  recipe_id: number
}

plans.get('/', authMiddleware, async (c) => {
  const { family_id, week } = c.req.query()
  if (!family_id) return c.json({ error: 'family_id 必填' }, 400)

  const plan = await c.env.DB.prepare(
    'SELECT * FROM weekly_plans WHERE family_id = ? AND week_start_date = ?'
  ).bind(Number(family_id), week).first<{ id: number; status: string }>()

  if (!plan) return c.json({ data: null })

  const { results: items } = await c.env.DB.prepare(`
    SELECT wpi.*, r.name as recipe_name, r.cuisine, r.flavors, r.cook_time, r.difficulty, r.protein_type
    FROM weekly_plan_items wpi
    JOIN recipes r ON r.id = wpi.recipe_id
    WHERE wpi.plan_id = ?
    ORDER BY wpi.date, wpi.meal_type
  `).bind(plan.id).all()

  const shoppingList = await c.env.DB.prepare(
    'SELECT id FROM shopping_lists WHERE plan_id = ?'
  ).bind(plan.id).first<{ id: number }>()

  return c.json({ data: { ...plan, items, shopping_list_id: shoppingList?.id ?? null } })
})

plans.post('/', authMiddleware, async (c) => {
  const { family_id, week_start_date } = await c.req.json<{ family_id: number; week_start_date: string }>()
  if (!family_id || !week_start_date) return c.json({ error: '参数缺失' }, 400)

  // 删除已有计划（草稿或已确认）
  await c.env.DB.prepare(
    'DELETE FROM weekly_plans WHERE family_id = ? AND week_start_date = ?'
  ).bind(family_id, week_start_date).run()

  const { meta } = await c.env.DB.prepare(
    'INSERT INTO weekly_plans (family_id, week_start_date, status) VALUES (?, ?, ?)'
  ).bind(family_id, week_start_date, 'draft').run()

  const planId = meta.last_row_id as number

  const MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
  const items: PlanItem[] = []
  const usedIds: number[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(new Date(week_start_date).getTime() + i * 86400000)
      .toISOString().slice(0, 10)

    for (const mealType of MEAL_TYPES) {
      const recs = await recommend({
        familyId: family_id,
        date,
        mealType,
        count: 1,
        excludeIds: usedIds,
        db: c.env.DB,
      })

      if (recs[0]) {
        items.push({ date, meal_type: mealType, recipe_id: recs[0].id })
        usedIds.push(recs[0].id)
      }
    }
  }

  for (const item of items) {
    await c.env.DB.prepare(
      'INSERT INTO weekly_plan_items (plan_id, date, meal_type, recipe_id) VALUES (?, ?, ?, ?)'
    ).bind(planId, item.date, item.meal_type, item.recipe_id).run()
  }

  const { results: savedItems } = await c.env.DB.prepare(`
    SELECT wpi.*, r.name as recipe_name, r.cuisine, r.cook_time
    FROM weekly_plan_items wpi JOIN recipes r ON r.id = wpi.recipe_id
    WHERE wpi.plan_id = ? ORDER BY wpi.date
  `).bind(planId).all()

  return c.json({ data: { id: planId, family_id, week_start_date, status: 'draft', items: savedItems } }, 201)
})

plans.put('/:planId/items/:itemId', authMiddleware, async (c) => {
  const planId = Number(c.req.param('planId'))
  const itemId = Number(c.req.param('itemId'))
  const { recipe_id } = await c.req.json<{ recipe_id: number }>()

  await c.env.DB.prepare(
    'UPDATE weekly_plan_items SET recipe_id = ? WHERE id = ? AND plan_id = ?'
  ).bind(recipe_id, itemId, planId).run()

  return c.json({ data: { ok: true } })
})

plans.post('/:planId/items', authMiddleware, async (c) => {
  const planId = Number(c.req.param('planId'))
  const { date, meal_type, recipe_id } = await c.req.json<{ date: string; meal_type: string; recipe_id: number }>()

  const { meta } = await c.env.DB.prepare(
    'INSERT INTO weekly_plan_items (plan_id, date, meal_type, recipe_id) VALUES (?, ?, ?, ?)'
  ).bind(planId, date, meal_type, recipe_id).run()

  const item = await c.env.DB.prepare(`
    SELECT wpi.*, r.name as recipe_name, r.cuisine, r.cook_time
    FROM weekly_plan_items wpi JOIN recipes r ON r.id = wpi.recipe_id
    WHERE wpi.id = ?
  `).bind(meta.last_row_id).first()

  return c.json({ data: item }, 201)
})

plans.delete('/:planId/items/:itemId', authMiddleware, async (c) => {
  const planId = Number(c.req.param('planId'))
  const itemId = Number(c.req.param('itemId'))

  await c.env.DB.prepare(
    'DELETE FROM weekly_plan_items WHERE id = ? AND plan_id = ?'
  ).bind(itemId, planId).run()

  return c.json({ data: { ok: true } })
})

plans.post('/:planId/confirm', authMiddleware, async (c) => {
  const planId = Number(c.req.param('planId'))

  await c.env.DB.prepare(
    "UPDATE weekly_plans SET status = 'confirmed' WHERE id = ?"
  ).bind(planId).run()

  // 自动生成购物清单
  const plan = await c.env.DB.prepare(
    'SELECT * FROM weekly_plans WHERE id = ?'
  ).bind(planId).first<{ family_id: number }>()

  if (plan) {
    const { meta } = await c.env.DB.prepare(
      'INSERT INTO shopping_lists (plan_id, family_id) VALUES (?, ?)'
    ).bind(planId, plan.family_id).run()

    const listId = meta.last_row_id as number

    const { results: ingredients } = await c.env.DB.prepare(`
      SELECT ri.name, ri.amount, ri.category
      FROM weekly_plan_items wpi
      JOIN recipe_ingredients ri ON ri.recipe_id = wpi.recipe_id
      WHERE wpi.plan_id = ?
    `).bind(planId).all<{ name: string; amount: string; category: string }>()

    // 按食材名聚合
    const merged = new Map<string, { amount: string; category: string }>()
    for (const ing of ingredients) {
      if (!merged.has(ing.name)) merged.set(ing.name, { amount: ing.amount, category: ing.category })
      // 简化：相同食材不合并用量，实际应解析数字
    }

    for (const [name, { amount, category }] of merged) {
      await c.env.DB.prepare(
        'INSERT INTO shopping_list_items (list_id, ingredient_name, amount, category) VALUES (?, ?, ?, ?)'
      ).bind(listId, name, amount, category).run()
    }

    return c.json({ data: { plan_id: planId, shopping_list_id: listId } })
  }

  return c.json({ data: { ok: true } })
})

export default plans

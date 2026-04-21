import { Hono } from 'hono'
import { signAdminToken } from '../lib/jwt'
import { adminAuthMiddleware } from '../middleware/adminAuth'
import type { Bindings } from '../types'

const admin = new Hono<{ Bindings: Bindings }>()

/* ─────────────────────────────────────────────
   Auth: POST /api/admin/login
───────────────────────────────────────────── */
admin.post('/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>()
  if (!username || !password) return c.json({ error: '参数缺失' }, 400)

  const row = await c.env.DB.prepare(
    'SELECT id, username, password_hash FROM admins WHERE username = ?'
  ).bind(username).first<{ id: number; username: string; password_hash: string }>()

  if (!row) return c.json({ error: '用户名或密码错误' }, 401)

  let valid = false
  if (row.password_hash.startsWith('dev_plain:')) {
    valid = row.password_hash.slice('dev_plain:'.length) === password
  } else {
    // PBKDF2 verification
    valid = await verifyPassword(password, row.password_hash)
  }

  if (!valid) return c.json({ error: '用户名或密码错误' }, 401)

  const token = await signAdminToken(row.id, c.env.JWT_SECRET)
  return c.json({ token, admin: { id: row.id, username: row.username } })
})

/* ─────────────────────────────────────────────
   All routes below require admin auth
───────────────────────────────────────────── */
admin.use('/*', adminAuthMiddleware)

/* ─── Recipes ─────────────────────────────── */

admin.get('/recipes', async (c) => {
  const keyword = c.req.query('keyword') ?? ''
  const cuisine = c.req.query('cuisine') ?? ''
  const difficulty = c.req.query('difficulty') ?? ''
  const source = c.req.query('source') ?? ''
  const cookTimeMin = c.req.query('cook_time_min') ? Number(c.req.query('cook_time_min')) : null
  const cookTimeMax = c.req.query('cook_time_max') ? Number(c.req.query('cook_time_max')) : null
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const limit = Math.min(100, Number(c.req.query('limit') ?? '20'))
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: (string | number)[] = []

  if (keyword) { conditions.push('r.name LIKE ?'); params.push(`%${keyword}%`) }
  if (cuisine) { conditions.push('r.cuisine = ?'); params.push(cuisine) }
  if (difficulty) { conditions.push('r.difficulty = ?'); params.push(difficulty) }
  if (source) { conditions.push('r.source = ?'); params.push(source) }
  if (cookTimeMin !== null) { conditions.push('r.cook_time >= ?'); params.push(cookTimeMin) }
  if (cookTimeMax !== null) { conditions.push('r.cook_time <= ?'); params.push(cookTimeMax) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const totalRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM recipes r ${where}`
  ).bind(...params).first<{ cnt: number }>()

  const rows = await c.env.DB.prepare(
    `SELECT id, name, description, cuisine, category, difficulty, cook_time, source, created_at
     FROM recipes r ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all()

  return c.json({ data: rows.results, total: totalRow?.cnt ?? 0 })
})

admin.get('/recipes/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const recipe = await c.env.DB.prepare('SELECT * FROM recipes WHERE id = ?').bind(id).first()
  if (!recipe) return c.json({ error: '菜谱不存在' }, 404)

  const ingredients = await c.env.DB.prepare(
    'SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order'
  ).bind(id).all()

  const steps = await c.env.DB.prepare(
    'SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY step_order'
  ).bind(id).all()

  return c.json({ ...recipe, ingredients: ingredients.results, steps: steps.results })
})

admin.post('/recipes', async (c) => {
  const body = await c.req.json<{
    name: string; description?: string; cuisine?: string; category?: string
    meal_types?: string[]; main_ingredient?: string; protein_type?: string
    flavors?: string[]; spicy_level?: number; cooking_method?: string
    prep_time?: number; cook_time?: number; difficulty?: string
    nutrition_tags?: string[]; season?: string[]
    ingredients?: { name: string; amount: string; category: string; sort_order: number }[]
    steps?: { step_order: number; description: string; images?: string[]; duration?: number }[]
  }>()

  if (!body.name) return c.json({ error: '菜名必填' }, 400)

  const result = await c.env.DB.prepare(
    `INSERT INTO recipes (name, description, images, cuisine, category, meal_types, main_ingredient,
       protein_type, flavors, spicy_level, cooking_method, prep_time, cook_time, difficulty,
       nutrition_tags, season, source)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'system')`
  ).bind(
    body.name, body.description ?? '', '[]',
    body.cuisine ?? '', body.category ?? '',
    JSON.stringify(body.meal_types ?? []),
    body.main_ingredient ?? '', body.protein_type ?? '',
    JSON.stringify(body.flavors ?? []),
    body.spicy_level ?? 0, body.cooking_method ?? '',
    body.prep_time ?? 15, body.cook_time ?? 30,
    body.difficulty ?? 'easy',
    JSON.stringify(body.nutrition_tags ?? []),
    JSON.stringify(body.season ?? []),
  ).run()

  const recipeId = result.meta.last_row_id

  if (body.ingredients?.length) {
    const stmts = body.ingredients.map((ing, i) =>
      c.env.DB.prepare(
        'INSERT INTO recipe_ingredients (recipe_id, name, amount, category, sort_order) VALUES (?,?,?,?,?)'
      ).bind(recipeId, ing.name, ing.amount, ing.category, i + 1)
    )
    await c.env.DB.batch(stmts)
  }

  if (body.steps?.length) {
    const stmts = body.steps.map((step, i) =>
      c.env.DB.prepare(
        'INSERT INTO recipe_steps (recipe_id, step_order, description, images, duration) VALUES (?,?,?,?,?)'
      ).bind(recipeId, i + 1, step.description, JSON.stringify(step.images ?? []), step.duration ?? null)
    )
    await c.env.DB.batch(stmts)
  }

  return c.json({ id: recipeId }, 201)
})

admin.put('/recipes/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json<{
    name?: string; description?: string; cuisine?: string; category?: string
    meal_types?: string[]; main_ingredient?: string; protein_type?: string
    flavors?: string[]; spicy_level?: number; cooking_method?: string
    prep_time?: number; cook_time?: number; difficulty?: string
    nutrition_tags?: string[]; season?: string[]
    ingredients?: { name: string; amount: string; category: string; sort_order: number }[]
    steps?: { step_order: number; description: string; images?: string[]; duration?: number }[]
  }>()

  await c.env.DB.prepare(
    `UPDATE recipes SET
       name = COALESCE(?, name), description = COALESCE(?, description),
       cuisine = COALESCE(?, cuisine), category = COALESCE(?, category),
       meal_types = COALESCE(?, meal_types), main_ingredient = COALESCE(?, main_ingredient),
       protein_type = COALESCE(?, protein_type), flavors = COALESCE(?, flavors),
       spicy_level = COALESCE(?, spicy_level), cooking_method = COALESCE(?, cooking_method),
       prep_time = COALESCE(?, prep_time), cook_time = COALESCE(?, cook_time),
       difficulty = COALESCE(?, difficulty), nutrition_tags = COALESCE(?, nutrition_tags),
       season = COALESCE(?, season)
     WHERE id = ?`
  ).bind(
    body.name ?? null, body.description ?? null,
    body.cuisine ?? null, body.category ?? null,
    body.meal_types ? JSON.stringify(body.meal_types) : null,
    body.main_ingredient ?? null, body.protein_type ?? null,
    body.flavors ? JSON.stringify(body.flavors) : null,
    body.spicy_level ?? null, body.cooking_method ?? null,
    body.prep_time ?? null, body.cook_time ?? null,
    body.difficulty ?? null,
    body.nutrition_tags ? JSON.stringify(body.nutrition_tags) : null,
    body.season ? JSON.stringify(body.season) : null,
    id,
  ).run()

  if (body.ingredients) {
    const deleteStmt = c.env.DB.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').bind(id)
    const insertStmts = body.ingredients.map((ing, i) =>
      c.env.DB.prepare(
        'INSERT INTO recipe_ingredients (recipe_id, name, amount, category, sort_order) VALUES (?,?,?,?,?)'
      ).bind(id, ing.name, ing.amount, ing.category, i + 1)
    )
    await c.env.DB.batch([deleteStmt, ...insertStmts])
  }

  if (body.steps) {
    const deleteStmt = c.env.DB.prepare('DELETE FROM recipe_steps WHERE recipe_id = ?').bind(id)
    const insertStmts = body.steps.map((step, i) =>
      c.env.DB.prepare(
        'INSERT INTO recipe_steps (recipe_id, step_order, description, images, duration) VALUES (?,?,?,?,?)'
      ).bind(id, i + 1, step.description, JSON.stringify(step.images ?? []), step.duration ?? null)
    )
    await c.env.DB.batch([deleteStmt, ...insertStmts])
  }

  return c.json({ ok: true })
})

admin.delete('/recipes/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM recipe_steps WHERE recipe_id = ?').bind(id),
    c.env.DB.prepare('DELETE FROM recipes WHERE id = ?').bind(id),
  ])
  return c.json({ ok: true })
})

/* ─── Enums ─────────────────────────────── */

admin.get('/enums', async (c) => {
  const rows = await c.env.DB.prepare(
    'SELECT id, type AS enum_type, value, value AS label, sort_order FROM system_enum_configs ORDER BY type, sort_order'
  ).all<{ id: number; enum_type: string; value: string; label: string; sort_order: number }>()

  const grouped: Record<string, typeof rows.results> = {}
  for (const row of rows.results) {
    if (!grouped[row.enum_type]) grouped[row.enum_type] = []
    grouped[row.enum_type].push(row)
  }
  return c.json(grouped)
})

admin.put('/enums/:type', async (c) => {
  const type = c.req.param('type')
  const { values } = await c.req.json<{
    values: { value: string; label: string; sort_order: number }[]
  }>()

  const deleteStmt = c.env.DB.prepare('DELETE FROM system_enum_configs WHERE type = ?').bind(type)
  const insertStmts = values.map(v =>
    c.env.DB.prepare(
      'INSERT INTO system_enum_configs (type, value, sort_order) VALUES (?,?,?)'
    ).bind(type, v.value, v.sort_order)
  )
  await c.env.DB.batch([deleteStmt, ...insertStmts])
  return c.json({ ok: true })
})

/* ─── Users ─────────────────────────────── */

admin.get('/users', async (c) => {
  const keyword = c.req.query('keyword') ?? ''
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const limit = Math.min(100, Number(c.req.query('limit') ?? '20'))
  const offset = (page - 1) * limit

  const where = keyword ? 'WHERE phone LIKE ?' : ''
  const param = keyword ? [`%${keyword}%`] : []

  const totalRow = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM users ${where}`
  ).bind(...param).first<{ cnt: number }>()

  const rows = await c.env.DB.prepare(
    `SELECT id, phone, name, avatar, created_at, last_login_at FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).bind(...param, limit, offset).all()

  return c.json({ data: rows.results, total: totalRow?.cnt ?? 0 })
})

admin.get('/users/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const user = await c.env.DB.prepare(
    `SELECT id, phone, name, avatar, created_at, last_login_at FROM users WHERE id = ?`
  ).bind(id).first()
  if (!user) return c.json({ error: '用户不存在' }, 404)

  const families = await c.env.DB.prepare(
    `SELECT f.id, f.name, f.invite_code, fm.role, fm.joined_at
     FROM family_members fm JOIN families f ON f.id = fm.family_id
     WHERE fm.user_id = ?`
  ).bind(id).all()

  const prefs = await c.env.DB.prepare(
    `SELECT pref_type, target_type, target_value FROM personal_preferences WHERE user_id = ?`
  ).bind(id).all()

  const planCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM weekly_plans WHERE family_id IN (
      SELECT family_id FROM family_members WHERE user_id = ?
    )`
  ).bind(id).first<{ cnt: number }>()

  const eventCount = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM recommendation_events WHERE family_id IN (
      SELECT family_id FROM family_members WHERE user_id = ?
    )`
  ).bind(id).first<{ cnt: number }>()

  return c.json({
    ...user,
    families: families.results,
    preferences: prefs.results,
    plan_count: planCount?.cnt ?? 0,
    event_count: eventCount?.cnt ?? 0,
  })
})

admin.get('/families', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const limit = Math.min(100, Number(c.req.query('limit') ?? '20'))
  const offset = (page - 1) * limit

  const totalRow = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM families'
  ).first<{ cnt: number }>()

  const rows = await c.env.DB.prepare(
    `SELECT f.id, f.name, f.invite_code, f.created_by, f.created_at,
       COUNT(fm.id) as member_count
     FROM families f
     LEFT JOIN family_members fm ON fm.family_id = f.id
     GROUP BY f.id
     ORDER BY f.id DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all()

  return c.json({ data: rows.results, total: totalRow?.cnt ?? 0 })
})

/* ─── Stats ─────────────────────────────── */

admin.get('/stats/overview', async (c) => {
  const [recipeRow, userRow, familyRow, eventRow] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM recipes').first<{ cnt: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM users').first<{ cnt: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM families').first<{ cnt: number }>(),
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM recommendation_events WHERE event_date >= date('now', '-7 days')`
    ).first<{ cnt: number }>(),
  ])

  return c.json({
    recipe_count: recipeRow?.cnt ?? 0,
    user_count: userRow?.cnt ?? 0,
    family_count: familyRow?.cnt ?? 0,
    event_count_7d: eventRow?.cnt ?? 0,
  })
})

admin.get('/stats/recommendations', async (c) => {
  const dateFrom = c.req.query('date_from') ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const dateTo = c.req.query('date_to') ?? new Date().toISOString().slice(0, 10)

  const [byType, byDate, topAccepted, topRejected] = await Promise.all([
    c.env.DB.prepare(
      `SELECT event_type, COUNT(*) as count FROM recommendation_events
       WHERE event_date BETWEEN ? AND ? GROUP BY event_type`
    ).bind(dateFrom, dateTo).all<{ event_type: string; count: number }>(),

    c.env.DB.prepare(
      `SELECT event_date, event_type, COUNT(*) as count FROM recommendation_events
       WHERE event_date BETWEEN ? AND ? GROUP BY event_date, event_type ORDER BY event_date`
    ).bind(dateFrom, dateTo).all<{ event_date: string; event_type: string; count: number }>(),

    c.env.DB.prepare(
      `SELECT e.recipe_id, r.name as recipe_name, COUNT(*) as count
       FROM recommendation_events e JOIN recipes r ON r.id = e.recipe_id
       WHERE e.event_type = 'accepted' AND e.event_date BETWEEN ? AND ?
       GROUP BY e.recipe_id ORDER BY count DESC LIMIT 10`
    ).bind(dateFrom, dateTo).all<{ recipe_id: number; recipe_name: string; count: number }>(),

    c.env.DB.prepare(
      `SELECT e.recipe_id, r.name as recipe_name, COUNT(*) as count
       FROM recommendation_events e JOIN recipes r ON r.id = e.recipe_id
       WHERE e.event_type = 'rejected' AND e.event_date BETWEEN ? AND ?
       GROUP BY e.recipe_id ORDER BY count DESC LIMIT 10`
    ).bind(dateFrom, dateTo).all<{ recipe_id: number; recipe_name: string; count: number }>(),
  ])

  return c.json({
    by_type: byType.results,
    by_date: byDate.results,
    top_accepted: topAccepted.results,
    top_rejected: topRejected.results,
  })
})

/* ─── Password helper ─────────────────────── */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const parts = hash.split(':')
    if (parts.length !== 3) return false
    const [, saltBase64, storedHashBase64] = parts
    const salt = base64ToBuffer(saltBase64)
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
    const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
    return bufferToBase64(derived) === storedHashBase64
  } catch {
    return false
  }
}

function base64ToBuffer(b64: string): ArrayBuffer {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer
}

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

export default admin

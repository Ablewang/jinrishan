import { Hono } from 'hono'
import type { AppContext } from '../types'
import { signToken } from '../lib/jwt'
import { authMiddleware } from '../middleware/auth'

const auth = new Hono<AppContext>()

auth.post('/send-otp', async (c) => {
  const { phone } = await c.req.json<{ phone: string }>()
  if (!phone?.match(/^1[3-9]\d{9}$/)) {
    return c.json({ error: '手机号格式不正确' }, 400)
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  await c.env.DB.prepare(
    `INSERT INTO otp_codes (phone, code, expires_at) VALUES (?, ?, ?)`
  ).bind(phone, code, expiresAt).run()

  const isDev = !c.env.ENV || c.env.ENV === 'development'
  return c.json({ data: { ok: true, ...(isDev ? { code } : {}) } })
})

auth.post('/verify-otp', async (c) => {
  const { phone, code } = await c.req.json<{ phone: string; code: string }>()
  if (!phone || !code) return c.json({ error: '参数缺失' }, 400)

  const record = await c.env.DB.prepare(
    `SELECT id FROM otp_codes
     WHERE phone = ? AND code = ? AND used = 0
       AND expires_at > datetime('now')
     ORDER BY id DESC LIMIT 1`
  ).bind(phone, code).first<{ id: number }>()

  if (!record) return c.json({ error: '验证码无效或已过期' }, 400)

  await c.env.DB.prepare(
    `UPDATE otp_codes SET used = 1 WHERE id = ?`
  ).bind(record.id).run()

  let isNew = false
  let user = await c.env.DB.prepare(
    `SELECT id, phone, name FROM users WHERE phone = ?`
  ).bind(phone).first<{ id: number; phone: string; name: string | null }>()

  if (!user) {
    isNew = true
    const defaultName = `用户${phone.slice(-4)}`
    const { meta } = await c.env.DB.prepare(
      `INSERT INTO users (phone, name) VALUES (?, ?)`
    ).bind(phone, defaultName).run()
    user = await c.env.DB.prepare(
      `SELECT id, phone, name FROM users WHERE id = ?`
    ).bind(meta.last_row_id).first<{ id: number; phone: string; name: string | null }>()
  }

  if (!user) return c.json({ error: '用户创建失败' }, 500)

  const token = await signToken(user.id, c.env.JWT_SECRET)
  return c.json({ data: { token, user, is_new: isNew } })
})

auth.put('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { name } = await c.req.json<{ name?: string }>()
  if (!name?.trim()) return c.json({ error: '姓名不能为空' }, 400)

  await c.env.DB.prepare(`UPDATE users SET name = ? WHERE id = ?`).bind(name.trim(), userId).run()
  const user = await c.env.DB.prepare(
    `SELECT id, phone, name FROM users WHERE id = ?`
  ).bind(userId).first<{ id: number; phone: string; name: string | null }>()

  return c.json({ data: user })
})

auth.get('/preferences', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare(
    'SELECT pref_type, target_type, target_value FROM personal_preferences WHERE user_id = ?'
  ).bind(userId).all<{ pref_type: string; target_type: string; target_value: string }>()

  const prefs: Record<string, string[]> = {
    liked_cuisines: [], liked_flavors: [], liked_ingredients: [],
    disliked_cuisines: [], disliked_flavors: [], disliked_ingredients: [],
    allergies: [],
  }
  for (const r of results) {
    if (r.pref_type === 'allergy') { prefs.allergies.push(r.target_value) }
    else { const k = `${r.pref_type}_${r.target_type}s`; if (k in prefs) prefs[k].push(r.target_value) }
  }
  return c.json({ data: prefs })
})

auth.put('/preferences', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<Record<string, string[]>>()

  await c.env.DB.prepare('DELETE FROM personal_preferences WHERE user_id = ?').bind(userId).run()

  const entries: [string, string, string[]][] = [
    ['liked', 'cuisine', body.liked_cuisines ?? []],
    ['liked', 'flavor', body.liked_flavors ?? []],
    ['liked', 'ingredient', body.liked_ingredients ?? []],
    ['disliked', 'cuisine', body.disliked_cuisines ?? []],
    ['disliked', 'flavor', body.disliked_flavors ?? []],
    ['disliked', 'ingredient', body.disliked_ingredients ?? []],
  ]
  for (const [pt, tt, vals] of entries) {
    for (const v of vals) {
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO personal_preferences (user_id, pref_type, target_type, target_value) VALUES (?, ?, ?, ?)'
      ).bind(userId, pt, tt, v).run()
    }
  }
  for (const v of body.allergies ?? []) {
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO personal_preferences (user_id, pref_type, target_type, target_value) VALUES (?, ?, ?, ?)'
    ).bind(userId, 'allergy', 'ingredient', v).run()
  }

  return c.json({ data: { ok: true } })
})

export default auth

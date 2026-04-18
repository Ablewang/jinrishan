import { Hono } from 'hono'
import type { AppContext } from '../types'
import { signToken } from '../lib/jwt'

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

  let user = await c.env.DB.prepare(
    `SELECT id, phone, name FROM users WHERE phone = ?`
  ).bind(phone).first<{ id: number; phone: string; name: string | null }>()

  if (!user) {
    const { meta } = await c.env.DB.prepare(
      `INSERT INTO users (phone) VALUES (?)`
    ).bind(phone).run()
    user = await c.env.DB.prepare(
      `SELECT id, phone, name FROM users WHERE id = ?`
    ).bind(meta.last_row_id).first<{ id: number; phone: string; name: string | null }>()
  }

  if (!user) return c.json({ error: '用户创建失败' }, 500)

  const token = await signToken(user.id, c.env.JWT_SECRET)
  return c.json({ data: { token, user } })
})

export default auth

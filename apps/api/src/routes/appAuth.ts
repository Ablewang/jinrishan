import { Hono } from 'hono'
import type { AppContext } from '../types'
import { signToken } from '../lib/jwt'
import { authMiddleware } from '../middleware/auth'

const appAuth = new Hono<AppContext>()

// PBKDF2 密码哈希（Web Crypto API，兼容 Cloudflare Workers）
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key, 256
  )
  const hashArr = new Uint8Array(bits)
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(hashArr).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${saltHex}:${hashHex}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)))
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key, 256
  )
  const hashArr = new Uint8Array(bits)
  const computed = Array.from(hashArr).map(b => b.toString(16).padStart(2, '0')).join('')
  return computed === hashHex
}

// 注册
appAuth.post('/register', async (c) => {
  const { phone, password, name } = await c.req.json<{ phone: string; password: string; name?: string }>()

  if (!phone?.match(/^1[3-9]\d{9}$/)) return c.json({ error: '手机号格式不正确' }, 400)
  if (!password || password.length < 6) return c.json({ error: '密码至少 6 位' }, 400)

  const existing = await c.env.DB.prepare(
    'SELECT id FROM app_users WHERE phone = ?'
  ).bind(phone).first<{ id: number }>()
  if (existing) return c.json({ error: '该手机号已注册' }, 400)

  const hash = await hashPassword(password)
  const defaultName = name?.trim() || `用户${phone.slice(-4)}`

  const { meta } = await c.env.DB.prepare(
    'INSERT INTO app_users (phone, password, name) VALUES (?, ?, ?)'
  ).bind(phone, hash, defaultName).run()

  const user = await c.env.DB.prepare(
    'SELECT id, phone, name FROM app_users WHERE id = ?'
  ).bind(meta.last_row_id).first<{ id: number; phone: string; name: string }>()

  if (!user) return c.json({ error: '注册失败' }, 500)

  const token = await signToken(user.id, c.env.JWT_SECRET)
  return c.json({ data: { token, user } })
})

// 登录
appAuth.post('/login', async (c) => {
  const { phone, password } = await c.req.json<{ phone: string; password: string }>()

  if (!phone || !password) return c.json({ error: '参数缺失' }, 400)

  const user = await c.env.DB.prepare(
    'SELECT id, phone, name, password FROM app_users WHERE phone = ?'
  ).bind(phone).first<{ id: number; phone: string; name: string; password: string }>()

  if (!user) return c.json({ error: '手机号或密码错误' }, 401)

  const ok = await verifyPassword(password, user.password)
  if (!ok) return c.json({ error: '手机号或密码错误' }, 401)

  await c.env.DB.prepare(
    'UPDATE app_users SET last_login_at = datetime(\'now\') WHERE id = ?'
  ).bind(user.id).run()

  const token = await signToken(user.id, c.env.JWT_SECRET)
  const { password: _, ...safeUser } = user
  return c.json({ data: { token, user: safeUser } })
})

// 获取当前用户信息
appAuth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const user = await c.env.DB.prepare(
    'SELECT id, phone, name FROM app_users WHERE id = ?'
  ).bind(userId).first<{ id: number; phone: string; name: string }>()
  if (!user) return c.json({ error: '用户不存在' }, 404)
  return c.json({ data: user })
})

// 修改用户名
appAuth.put('/me', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { name } = await c.req.json<{ name?: string }>()
  if (!name?.trim()) return c.json({ error: '用户名不能为空' }, 400)

  await c.env.DB.prepare(
    'UPDATE app_users SET name = ? WHERE id = ?'
  ).bind(name.trim(), userId).run()

  const user = await c.env.DB.prepare(
    'SELECT id, phone, name FROM app_users WHERE id = ?'
  ).bind(userId).first<{ id: number; phone: string; name: string }>()

  return c.json({ data: user })
})

export default appAuth

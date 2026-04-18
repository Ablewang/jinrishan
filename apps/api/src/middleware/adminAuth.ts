import type { Context, Next } from 'hono'
import { verifyAdminToken } from '../lib/jwt'
import type { Bindings } from '../types'

export async function adminAuthMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: '未授权' }, 401)
  }
  const token = auth.slice(7)
  const adminId = await verifyAdminToken(token, c.env.JWT_SECRET)
  if (!adminId) {
    return c.json({ error: '令牌无效或权限不足' }, 401)
  }
  await next()
}

import type { Context, Next } from 'hono'
import type { AppContext } from '../types'
import { verifyToken } from '../lib/jwt'

export async function authMiddleware(c: Context<AppContext>, next: Next) {
  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  if (!c.env.JWT_SECRET) return c.json({ error: 'Server misconfigured' }, 500)

  const userId = await verifyToken(token, c.env.JWT_SECRET)
  if (!userId) return c.json({ error: 'Invalid token' }, 401)

  c.set('userId', userId)
  await next()
}

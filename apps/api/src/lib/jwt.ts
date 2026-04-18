import { sign as honoSign, verify as honoVerify } from 'hono/jwt'

const EXPIRES_IN = 60 * 60 * 24 * 7 // 7 days

export async function signToken(userId: number, secret: string): Promise<string> {
  return honoSign(
    { sub: String(userId), exp: Math.floor(Date.now() / 1000) + EXPIRES_IN },
    secret,
    'HS256'
  )
}

export async function verifyToken(token: string, secret: string): Promise<number | null> {
  try {
    const payload = await honoVerify(token, secret, 'HS256')
    return Number(payload.sub)
  } catch {
    return null
  }
}

export async function signAdminToken(adminId: number, secret: string): Promise<string> {
  return honoSign(
    { sub: String(adminId), role: 'admin', exp: Math.floor(Date.now() / 1000) + EXPIRES_IN },
    secret,
    'HS256'
  )
}

export async function verifyAdminToken(token: string, secret: string): Promise<number | null> {
  try {
    const payload = await honoVerify(token, secret, 'HS256')
    if (payload.role !== 'admin') return null
    return Number(payload.sub)
  } catch {
    return null
  }
}

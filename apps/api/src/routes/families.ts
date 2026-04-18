import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const families = new Hono<AppContext>()

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

families.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { name } = await c.req.json<{ name: string }>()
  if (!name?.trim()) return c.json({ error: '家庭名称不能为空' }, 400)

  let inviteCode = generateInviteCode()
  // 保证唯一性
  for (let i = 0; i < 5; i++) {
    const exists = await c.env.DB.prepare(
      'SELECT id FROM families WHERE invite_code = ?'
    ).bind(inviteCode).first()
    if (!exists) break
    inviteCode = generateInviteCode()
  }

  const { meta } = await c.env.DB.prepare(
    'INSERT INTO families (name, invite_code, created_by) VALUES (?, ?, ?)'
  ).bind(name.trim(), inviteCode, userId).run()

  const familyId = meta.last_row_id as number
  // 创建者自动成为 owner 成员
  await c.env.DB.prepare(
    'INSERT INTO family_members (family_id, user_id, nickname, role) VALUES (?, ?, ?, ?)'
  ).bind(familyId, userId, null, 'owner').run()

  const family = await c.env.DB.prepare(
    'SELECT * FROM families WHERE id = ?'
  ).bind(familyId).first()

  return c.json({ data: family }, 201)
})

families.get('/:id', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const family = await c.env.DB.prepare(
    'SELECT * FROM families WHERE id = ?'
  ).bind(id).first()
  if (!family) return c.json({ error: '家庭不存在' }, 404)
  return c.json({ data: family })
})

families.get('/:id/members', authMiddleware, async (c) => {
  const id = Number(c.req.param('id'))
  const { results } = await c.env.DB.prepare(`
    SELECT fm.*, u.phone, u.name as user_name, u.avatar
    FROM family_members fm
    JOIN users u ON u.id = fm.user_id
    WHERE fm.family_id = ?
    ORDER BY fm.joined_at
  `).bind(id).all()
  return c.json({ data: results })
})

families.post('/join', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { invite_code, nickname } = await c.req.json<{ invite_code: string; nickname?: string }>()
  if (!invite_code?.trim()) return c.json({ error: '邀请码不能为空' }, 400)

  const family = await c.env.DB.prepare(
    'SELECT * FROM families WHERE invite_code = ?'
  ).bind(invite_code.toUpperCase()).first<{ id: number; name: string }>()

  if (!family) return c.json({ error: '邀请码无效' }, 404)

  const existing = await c.env.DB.prepare(
    'SELECT id FROM family_members WHERE family_id = ? AND user_id = ?'
  ).bind(family.id, userId).first()

  if (existing) return c.json({ error: '你已经是该家庭成员' }, 409)

  await c.env.DB.prepare(
    'INSERT INTO family_members (family_id, user_id, nickname, role) VALUES (?, ?, ?, ?)'
  ).bind(family.id, userId, nickname ?? null, 'member').run()

  return c.json({ data: { family_id: family.id, family_name: family.name } })
})

families.delete('/:id/members/:userId', authMiddleware, async (c) => {
  const familyId = Number(c.req.param('id'))
  const targetUserId = Number(c.req.param('userId'))
  const requesterId = c.get('userId')

  // 只有 owner 或自己可以移除
  const requester = await c.env.DB.prepare(
    'SELECT role FROM family_members WHERE family_id = ? AND user_id = ?'
  ).bind(familyId, requesterId).first<{ role: string }>()

  if (!requester) return c.json({ error: '你不是该家庭成员' }, 403)
  if (requester.role !== 'owner' && requesterId !== targetUserId) {
    return c.json({ error: '无权限' }, 403)
  }

  await c.env.DB.prepare(
    'DELETE FROM family_members WHERE family_id = ? AND user_id = ?'
  ).bind(familyId, targetUserId).run()

  return c.json({ data: { ok: true } })
})

export default families

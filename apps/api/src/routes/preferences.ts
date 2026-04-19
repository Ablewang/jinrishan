import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const preferences = new Hono<AppContext>()

type PrefType = 'liked' | 'disliked' | 'allergy'
type TargetType = 'cuisine' | 'flavor' | 'ingredient' | 'protein_type'

interface PrefRow {
  pref_type: string
  target_type: string
  target_value: string
}

function rowsToPrefs(rows: PrefRow[]) {
  const result: Record<string, string[]> = {
    liked_cuisines: [], liked_flavors: [], liked_ingredients: [],
    disliked_cuisines: [], disliked_flavors: [], disliked_ingredients: [],
    allergies: [],
  }
  for (const row of rows) {
    if (row.pref_type === 'allergy') {
      result.allergies.push(row.target_value)
    } else {
      const key = `${row.pref_type}_${row.target_type}s`
      if (key in result) result[key].push(row.target_value)
    }
  }
  return result
}

preferences.get('/:familyId/members/:memberId/preferences', authMiddleware, async (c) => {
  const memberId = Number(c.req.param('memberId'))
  const { results } = await c.env.DB.prepare(
    'SELECT pref_type, target_type, target_value FROM user_preferences WHERE member_id = ?'
  ).bind(memberId).all<PrefRow>()

  return c.json({ data: { member_id: memberId, ...rowsToPrefs(results) } })
})

preferences.put('/:familyId/members/:memberId/preferences', authMiddleware, async (c) => {
  const memberId = Number(c.req.param('memberId'))
  const body = await c.req.json<{
    liked_cuisines?: string[]; liked_flavors?: string[]; liked_ingredients?: string[]
    disliked_cuisines?: string[]; disliked_flavors?: string[]; disliked_ingredients?: string[]
    allergies?: string[]
  }>()

  // 全量覆盖
  await c.env.DB.prepare('DELETE FROM user_preferences WHERE member_id = ?').bind(memberId).run()

  const rows: { prefType: PrefType; targetType: TargetType; values: string[] }[] = [
    { prefType: 'liked', targetType: 'cuisine', values: body.liked_cuisines ?? [] },
    { prefType: 'liked', targetType: 'flavor', values: body.liked_flavors ?? [] },
    { prefType: 'liked', targetType: 'ingredient', values: body.liked_ingredients ?? [] },
    { prefType: 'disliked', targetType: 'cuisine', values: body.disliked_cuisines ?? [] },
    { prefType: 'disliked', targetType: 'flavor', values: body.disliked_flavors ?? [] },
    { prefType: 'disliked', targetType: 'ingredient', values: body.disliked_ingredients ?? [] },
  ]

  for (const { prefType, targetType, values } of rows) {
    for (const value of values) {
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO user_preferences (member_id, pref_type, target_type, target_value) VALUES (?, ?, ?, ?)'
      ).bind(memberId, prefType, targetType, value).run()
    }
  }

  for (const value of body.allergies ?? []) {
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO user_preferences (member_id, pref_type, target_type, target_value) VALUES (?, ?, ?, ?)'
    ).bind(memberId, 'allergy', 'ingredient', value).run()
  }

  return c.json({ data: { ok: true } })
})

export { rowsToPrefs }
export default preferences

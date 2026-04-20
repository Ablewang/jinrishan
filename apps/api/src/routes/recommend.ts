import { Hono } from 'hono'
import type { AppContext } from '../types'
import { recommend } from '../lib/recommender'

const recommendRoute = new Hono<AppContext>()

recommendRoute.get('/', async (c) => {
  const { family_id, date, meal_type } = c.req.query()
  const guestAllergies = c.req.query('allergies')?.split(',').filter(Boolean) ?? []
  const guestFlavors = c.req.query('flavors')?.split(',').filter(Boolean) ?? []
  const excludeIds = c.req.query('exclude_ids')?.split(',').map(Number).filter(Boolean) ?? []

  const isGuest = !family_id
  const targetDate = date || new Date().toISOString().slice(0, 10)
  const targetMeal = meal_type || 'dinner'

  const recipes = await recommend({
    familyId: isGuest ? 0 : Number(family_id),
    date: targetDate,
    mealType: targetMeal,
    count: 3,
    excludeIds,
    db: c.env.DB,
    ...(isGuest ? { guestAllergies, guestFlavors } : {}),
  })

  return c.json({ data: recipes })
})

recommendRoute.post('/refresh', async (c) => {
  const body = await c.req.json<{
    family_id?: number
    date?: string
    meal_type?: string
    exclude_ids?: number[]
    guest_allergies?: string[]
    guest_flavors?: string[]
  }>()

  const isGuest = !body.family_id
  const recipes = await recommend({
    familyId: isGuest ? 0 : (body.family_id ?? 0),
    date: body.date ?? new Date().toISOString().slice(0, 10),
    mealType: body.meal_type ?? 'dinner',
    count: 1,
    excludeIds: body.exclude_ids ?? [],
    db: c.env.DB,
    ...(isGuest ? {
      guestAllergies: body.guest_allergies ?? [],
      guestFlavors: body.guest_flavors ?? [],
    } : {}),
  })

  return c.json({ data: recipes[0] ?? null })
})

export default recommendRoute

import { Hono } from 'hono'
import type { AppContext } from '../types'
import { authMiddleware } from '../middleware/auth'

const recipes = new Hono<AppContext>()

type RecipeRow = {
  id: number; name: string; description: string; images: string
  cuisine: string; category: string; meal_types: string; main_ingredient: string
  protein_type: string; flavors: string; spicy_level: number; cooking_method: string
  prep_time: number; cook_time: number; difficulty: string; nutrition_tags: string
  season: string; source: string; created_by: number | null; created_at: string
}

function parseRecipe(row: RecipeRow) {
  return {
    ...row,
    images: JSON.parse(row.images || '[]'),
    meal_types: JSON.parse(row.meal_types || '[]'),
    flavors: JSON.parse(row.flavors || '[]'),
    nutrition_tags: JSON.parse(row.nutrition_tags || '[]'),
    season: JSON.parse(row.season || '["全年"]'),
  }
}

recipes.get('/', async (c) => {
  const { cuisine, category, keyword, limit = '20', offset = '0' } = c.req.query()

  let sql = 'SELECT * FROM recipes WHERE 1=1'
  const params: (string | number)[] = []

  if (cuisine) { sql += ' AND cuisine = ?'; params.push(cuisine) }
  if (category) { sql += ' AND category = ?'; params.push(category) }
  if (keyword) { sql += ' AND name LIKE ?'; params.push(`%${keyword}%`) }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(Number(limit), Number(offset))

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<RecipeRow>()
  return c.json({ data: results.map(parseRecipe) })
})

recipes.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const recipe = await c.env.DB.prepare(
    'SELECT * FROM recipes WHERE id = ?'
  ).bind(id).first<RecipeRow>()

  if (!recipe) return c.json({ error: '菜谱不存在' }, 404)

  const { results: ingredients } = await c.env.DB.prepare(
    'SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order'
  ).bind(id).all()

  const { results: steps } = await c.env.DB.prepare(
    'SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY step_order'
  ).bind(id).all()

  return c.json({ data: { ...parseRecipe(recipe), ingredients, steps } })
})

recipes.post('/', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json<{
    name: string; description?: string; cuisine: string; category: string
    meal_types: string[]; main_ingredient: string; protein_type: string
    flavors: string[]; spicy_level: number; cooking_method: string
    prep_time: number; cook_time: number; difficulty: string
    nutrition_tags?: string[]; season?: string[]
  }>()

  if (!body.name?.trim()) return c.json({ error: '菜名不能为空' }, 400)

  const { meta } = await c.env.DB.prepare(`
    INSERT INTO recipes (name, description, cuisine, category, meal_types, main_ingredient,
      protein_type, flavors, spicy_level, cooking_method, prep_time, cook_time,
      difficulty, nutrition_tags, season, source, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', ?)
  `).bind(
    body.name.trim(), body.description ?? '',
    body.cuisine, body.category,
    JSON.stringify(body.meal_types ?? []),
    body.main_ingredient, body.protein_type,
    JSON.stringify(body.flavors ?? []),
    body.spicy_level ?? 0, body.cooking_method,
    body.prep_time ?? 0, body.cook_time ?? 0,
    body.difficulty ?? 'easy',
    JSON.stringify(body.nutrition_tags ?? []),
    JSON.stringify(body.season ?? ['全年']),
    userId
  ).run()

  const recipe = await c.env.DB.prepare(
    'SELECT * FROM recipes WHERE id = ?'
  ).bind(meta.last_row_id).first<RecipeRow>()

  return c.json({ data: parseRecipe(recipe!) }, 201)
})

export default recipes

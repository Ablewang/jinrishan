import type { D1Database } from '@cloudflare/workers-types'

interface Recipe {
  id: number
  name: string
  cuisine: string
  category: string
  meal_types: string[]
  protein_type: string
  flavors: string[]
  spicy_level: number
  cooking_method: string
  prep_time: number
  cook_time: number
  nutrition_tags: string[]
  season: string[]
  created_at: string
}

interface FamilyPrefs {
  allergies: Set<string>
  likedCuisines: string[]
  likedFlavors: string[]
  dislikedCuisines: string[]
  dislikedFlavors: string[]
  hasChildren: boolean
}

export interface RecommendOptions {
  familyId: number
  date: string           // YYYY-MM-DD
  mealType: string       // breakfast / lunch / dinner
  count?: number         // 返回数量，默认 3
  excludeIds?: number[]  // 排除的菜谱 id（已推过的）
  db: D1Database
  // 游客模式偏好（登录用户用 DB，游客用这个）
  guestAllergies?: string[]
  guestFlavors?: string[]
}

function getCurrentSeason(date: string): string {
  const month = new Date(date).getMonth() + 1
  if (month >= 3 && month <= 5) return '春'
  if (month >= 6 && month <= 8) return '夏'
  if (month >= 9 && month <= 11) return '秋'
  return '冬'
}

function parseJsonField(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[]
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return [] }
  }
  return []
}

async function getFamilyPrefs(familyId: number, db: D1Database): Promise<FamilyPrefs> {
  const { results: members } = await db.prepare(
    'SELECT id FROM family_members WHERE family_id = ?'
  ).bind(familyId).all<{ id: number }>()

  if (members.length === 0) {
    return { allergies: new Set(), likedCuisines: [], likedFlavors: [], dislikedCuisines: [], dislikedFlavors: [], hasChildren: false }
  }

  const memberIds = members.map(m => m.id)
  const placeholders = memberIds.map(() => '?').join(',')
  const { results: prefs } = await db.prepare(
    `SELECT pref_type, target_type, target_value FROM user_preferences WHERE member_id IN (${placeholders})`
  ).bind(...memberIds).all<{ pref_type: string; target_type: string; target_value: string }>()

  const allergies = new Set<string>()
  const likedCuisines: string[] = []
  const likedFlavors: string[] = []
  const dislikedCuisines: string[] = []
  const dislikedFlavors: string[] = []

  for (const p of prefs) {
    if (p.pref_type === 'allergy') allergies.add(p.target_value)
    else if (p.pref_type === 'liked' && p.target_type === 'cuisine') likedCuisines.push(p.target_value)
    else if (p.pref_type === 'liked' && p.target_type === 'flavor') likedFlavors.push(p.target_value)
    else if (p.pref_type === 'disliked' && p.target_type === 'cuisine') dislikedCuisines.push(p.target_value)
    else if (p.pref_type === 'disliked' && p.target_type === 'flavor') dislikedFlavors.push(p.target_value)
  }

  return { allergies, likedCuisines, likedFlavors, dislikedCuisines, dislikedFlavors, hasChildren: false }
}

async function getRecentIngredients(familyId: number, db: D1Database, days: number): Promise<Set<string>> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const { results } = await db.prepare(`
    SELECT DISTINCT ri.name
    FROM meal_logs ml
    JOIN recipe_ingredients ri ON ri.recipe_id = ml.recipe_id
    WHERE ml.family_id = ? AND ml.date >= ?
  `).bind(familyId, since).all<{ name: string }>()
  return new Set(results.map(r => r.name))
}

async function getRecentRecipeIds(familyId: number, db: D1Database, days: number): Promise<Set<number>> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const { results } = await db.prepare(
    'SELECT DISTINCT recipe_id FROM meal_logs WHERE family_id = ? AND date >= ?'
  ).bind(familyId, since).all<{ recipe_id: number }>()
  return new Set(results.map(r => r.recipe_id))
}

async function getBehaviorScores(familyId: number, db: D1Database): Promise<Map<number, number>> {
  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const { results } = await db.prepare(`
    SELECT recipe_id, event_type, created_at
    FROM recommendation_events
    WHERE family_id = ? AND created_at >= ?
  `).bind(familyId, since).all<{ recipe_id: number; event_type: string; created_at: string }>()

  const scores = new Map<number, number>()
  const now = Date.now()
  for (const ev of results) {
    const daysAgo = (now - new Date(ev.created_at).getTime()) / 86400000
    const decay = Math.exp(-0.1 * daysAgo) // 时间衰减
    const delta = ev.event_type === 'accepted' || ev.event_type === 'cooked' ? decay
      : ev.event_type === 'rejected' ? -decay * 0.5 : 0
    scores.set(ev.recipe_id, (scores.get(ev.recipe_id) ?? 0) + delta)
  }
  return scores
}

async function getRecentCuisineCount(familyId: number, db: D1Database): Promise<Map<string, number>> {
  const since = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
  const { results } = await db.prepare(`
    SELECT r.cuisine, COUNT(*) as cnt
    FROM meal_logs ml JOIN recipes r ON r.id = ml.recipe_id
    WHERE ml.family_id = ? AND ml.date >= ?
    GROUP BY r.cuisine
  `).bind(familyId, since).all<{ cuisine: string; cnt: number }>()
  return new Map(results.map(r => [r.cuisine, r.cnt]))
}

function scoreRecipe(
  recipe: Recipe,
  prefs: FamilyPrefs,
  season: string,
  recentCuisines: Map<string, number>,
  behaviorScores: Map<number, number>,
  recipeCount: number,
  recipeIndex: number
): number {
  let score = 50 // 基准分

  // 1. 口味匹配度 30%
  const flavors = recipe.flavors
  const likedMatches = flavors.filter(f => prefs.likedFlavors.includes(f)).length
  const cuisineMatch = prefs.likedCuisines.includes(recipe.cuisine) ? 1 : 0
  const flavorScore = (likedMatches / Math.max(flavors.length, 1)) * 0.7 + cuisineMatch * 0.3
  score += flavorScore * 30

  // 忌口惩罚
  const dislikedFlavorMatch = flavors.filter(f => prefs.dislikedFlavors.includes(f)).length > 0
  const dislikedCuisineMatch = prefs.dislikedCuisines.includes(recipe.cuisine)
  if (dislikedFlavorMatch || dislikedCuisineMatch) score *= 0.5

  // 2. 近期多样性 25%（同菜系越多越低分）
  const cuisineCount = recentCuisines.get(recipe.cuisine) ?? 0
  const diversityPenalty = Math.min(cuisineCount / 5, 1) // 最多扣满
  score -= diversityPenalty * 25

  // 3. 行为历史 20%
  const behaviorBonus = (behaviorScores.get(recipe.id) ?? 0) * 10
  score += Math.max(-20, Math.min(20, behaviorBonus))

  // 4. 季节适配 15%
  const recipeSeasons = recipe.season
  if (recipeSeasons.includes('全年') || recipeSeasons.includes(season)) {
    score += 15
  } else {
    score -= 5
  }

  // 5. 新鲜度 10%（越新越高）
  const ageMs = Date.now() - new Date(recipe.created_at).getTime()
  const ageDays = ageMs / 86400000
  const freshnessScore = Math.max(0, 1 - ageDays / 365)
  score += freshnessScore * 10

  // 随机扰动 ±8
  score += (Math.random() - 0.5) * 16

  return score
}

export async function recommend(opts: RecommendOptions): Promise<Recipe[]> {
  const { familyId, date, mealType, count = 3, excludeIds = [], db } = opts

  const season = getCurrentSeason(date)

  // 获取家庭偏好（游客模式用传入的参数）
  let prefs: FamilyPrefs
  if (opts.guestAllergies !== undefined) {
    prefs = {
      allergies: new Set(opts.guestAllergies),
      likedCuisines: [],
      likedFlavors: opts.guestFlavors ?? [],
      dislikedCuisines: [],
      dislikedFlavors: [],
      hasChildren: false,
    }
  } else {
    prefs = await getFamilyPrefs(familyId, db)
  }

  // 近期已吃（7天内，硬排除）
  const recentIds = familyId > 0 ? await getRecentRecipeIds(familyId, db, 7) : new Set<number>()
  const recentCuisines = familyId > 0 ? await getRecentCuisineCount(familyId, db) : new Map<string, number>()
  const behaviorScores = familyId > 0 ? await getBehaviorScores(familyId, db) : new Map<number, number>()

  // 加载所有菜谱
  const { results: allRecipes } = await db.prepare(
    'SELECT * FROM recipes ORDER BY created_at'
  ).all<Record<string, unknown>>()

  const recipes: Recipe[] = allRecipes.map(r => ({
    ...(r as unknown as Recipe),
    meal_types: parseJsonField(r.meal_types),
    flavors: parseJsonField(r.flavors),
    nutrition_tags: parseJsonField(r.nutrition_tags),
    season: parseJsonField(r.season),
  }))

  // Step 1: Filter
  const filtered = recipes.filter(r => {
    if (excludeIds.includes(r.id)) return false
    if (recentIds.has(r.id)) return false
    if (!r.meal_types.includes(mealType) && r.meal_types.length > 0) return false
    if (prefs.hasChildren && r.spicy_level > 1) return false
    return true
  })

  // 如果没有足够的菜谱，放宽餐次限制
  const pool = filtered.length >= count ? filtered : recipes.filter(r =>
    !excludeIds.includes(r.id) && !recentIds.has(r.id)
  )

  // Step 2: Score
  const scored = pool.map((r, idx) => ({
    recipe: r,
    score: scoreRecipe(r, prefs, season, recentCuisines, behaviorScores, pool.length, idx),
  })).sort((a, b) => b.score - a.score)

  // Step 3: Select（荤素搭配：选结果里确保不全是同一 protein_type）
  const selected: Recipe[] = []
  const usedProtein = new Set<string>()

  for (const { recipe } of scored) {
    if (selected.length >= count) break
    // 前两道菜不重复 protein_type（第三道允许）
    if (selected.length < 2 && usedProtein.has(recipe.protein_type) && usedProtein.size > 0) {
      continue
    }
    selected.push(recipe)
    usedProtein.add(recipe.protein_type)
  }

  // 如果荤素约束导致不够，补充
  if (selected.length < count) {
    for (const { recipe } of scored) {
      if (selected.length >= count) break
      if (!selected.find(r => r.id === recipe.id)) selected.push(recipe)
    }
  }

  return selected
}

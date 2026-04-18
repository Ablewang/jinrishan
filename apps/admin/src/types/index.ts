export interface AdminUser {
  id: number
  username: string
}

export interface Recipe {
  id: number
  name: string
  description: string
  images: string[]
  cuisine: string
  category: string
  meal_types: string[]
  main_ingredient: string
  protein_type: string
  flavors: string[]
  spicy_level: 0 | 1 | 2 | 3
  cooking_method: string
  prep_time: number
  cook_time: number
  difficulty: 'easy' | 'medium' | 'hard'
  nutrition_tags: string[]
  season: string[]
  source: 'system' | 'user'
  created_at: string
  ingredients?: Ingredient[]
  steps?: Step[]
}

export interface Ingredient {
  id?: number
  name: string
  amount: string
  category: string
  sort_order: number
}

export interface Step {
  id?: number
  step_order: number
  description: string
  images: string[]
  duration?: number
}

export interface User {
  id: number
  phone: string
  name: string | null
  created_at: string
}

export interface Family {
  id: number
  name: string
  invite_code: string
  created_by: number
  member_count: number
  created_at: string
}

export interface EnumValue {
  id: number
  enum_type: string
  value: string
  label: string
  sort_order: number
}

export interface PagedResult<T> {
  data: T[]
  total: number
}

export interface OverviewStats {
  recipe_count: number
  user_count: number
  family_count: number
  event_count_7d: number
}

export interface RecommendStats {
  by_type: { event_type: string; count: number }[]
  by_date: { event_date: string; count: number; event_type: string }[]
  top_accepted: { recipe_id: number; recipe_name: string; count: number }[]
  top_rejected: { recipe_id: number; recipe_name: string; count: number }[]
}

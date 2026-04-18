export interface Ingredient {
  id?: number
  name: string
  amount: string
  category: string
  sort_order?: number
}

export interface Step {
  id?: number
  step_order: number
  description: string
  images: string[]
  duration?: number
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
  created_by?: number
  created_at: string
  ingredients?: Ingredient[]
  steps?: Step[]
}

export interface User {
  id: number
  phone: string
  name: string | null
  avatar?: string
  created_at: string
}

export interface Family {
  id: number
  name: string
  invite_code: string
  created_by: number
  created_at: string
}

export interface FamilyMember {
  id: number
  family_id: number
  user_id: number
  nickname: string | null
  role: 'owner' | 'member'
  joined_at: string
}

export interface MemberPreference {
  member_id: number
  liked_cuisines: string[]
  liked_flavors: string[]
  liked_ingredients: string[]
  disliked_cuisines: string[]
  disliked_flavors: string[]
  disliked_ingredients: string[]
  allergies: string[]
}

export interface RecommendationEvent {
  family_id: number
  recipe_id: number
  event_type: 'shown' | 'accepted' | 'rejected' | 'swapped' | 'cooked'
  meal_type?: string
  event_date?: string
  source: 'daily' | 'weekly_plan' | 'bot'
}

export interface RecipeCard {
  recipe_id: number
  name: string
  image?: string
  tags: string[]
  actions: ('accept' | 'reject' | 'swap' | 'view_detail' | 'add_to_plan')[]
}

// 游客本地偏好（存 localStorage）
export interface GuestPrefs {
  allergies: string[]
  liked_flavors: string[]
  swap_count: number
}

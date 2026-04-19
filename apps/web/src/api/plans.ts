import { apiFetch } from './client'

interface PlanItem {
  id: number; date: string; meal_type: string; recipe_id: number
  recipe_name: string; cuisine: string; cook_time: number
}

interface Plan {
  id: number; family_id: number; week_start_date: string; status: string
  items: PlanItem[]; shopping_list_id?: number | null
}

export const plansApi = {
  get: (family_id: number, week: string) =>
    apiFetch<Plan | null>(`/api/plans?family_id=${family_id}&week=${week}`),

  generate: (family_id: number, week_start_date: string) =>
    apiFetch<Plan>('/api/plans', { method: 'POST', body: JSON.stringify({ family_id, week_start_date }) }),

  addItem: (planId: number, date: string, meal_type: string, recipe_id: number) =>
    apiFetch<PlanItem>(`/api/plans/${planId}/items`, {
      method: 'POST', body: JSON.stringify({ date, meal_type, recipe_id }),
    }),

  replaceItem: (planId: number, itemId: number, recipe_id: number) =>
    apiFetch(`/api/plans/${planId}/items/${itemId}`, {
      method: 'PUT', body: JSON.stringify({ recipe_id }),
    }),

  deleteItem: (planId: number, itemId: number) =>
    apiFetch(`/api/plans/${planId}/items/${itemId}`, { method: 'DELETE' }),

  confirm: (planId: number) =>
    apiFetch<{ plan_id: number; shopping_list_id: number }>(`/api/plans/${planId}/confirm`, {
      method: 'POST',
    }),
}

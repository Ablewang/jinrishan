import { apiFetch } from './client'
import type { Recipe, PagedResult } from '../types'

export const adminRecipesApi = {
  list: (params?: {
    keyword?: string; cuisine?: string; difficulty?: string; source?: string
    cook_time_min?: number; cook_time_max?: number; page?: number; limit?: number
  }) => {
    const qs = new URLSearchParams()
    if (params?.keyword) qs.set('keyword', params.keyword)
    if (params?.cuisine) qs.set('cuisine', params.cuisine)
    if (params?.difficulty) qs.set('difficulty', params.difficulty)
    if (params?.source) qs.set('source', params.source)
    if (params?.cook_time_min != null) qs.set('cook_time_min', String(params.cook_time_min))
    if (params?.cook_time_max != null) qs.set('cook_time_max', String(params.cook_time_max))
    qs.set('page', String(params?.page ?? 1))
    qs.set('limit', String(params?.limit ?? 20))
    return apiFetch<PagedResult<Recipe>>('/api/admin/recipes?' + qs)
  },

  get: (id: number) => apiFetch<Recipe>(`/api/admin/recipes/${id}`),

  create: (data: Partial<Recipe> & { ingredients?: Recipe['ingredients']; steps?: Recipe['steps'] }) =>
    apiFetch<Recipe>('/api/admin/recipes', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<Recipe> & { ingredients?: Recipe['ingredients']; steps?: Recipe['steps'] }) =>
    apiFetch<Recipe>(`/api/admin/recipes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: number) =>
    apiFetch(`/api/admin/recipes/${id}`, { method: 'DELETE' }),
}

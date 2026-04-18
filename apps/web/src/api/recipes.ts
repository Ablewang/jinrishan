import { apiFetch } from './client'
import type { Recipe } from '../types'

export const recipesApi = {
  list: (params?: { cuisine?: string; category?: string; keyword?: string; limit?: number }) =>
    apiFetch<Recipe[]>('/api/recipes?' + new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
    )),

  get: (id: number) => apiFetch<Recipe>(`/api/recipes/${id}`),

  create: (data: Partial<Recipe>) =>
    apiFetch<Recipe>('/api/recipes', { method: 'POST', body: JSON.stringify(data) }),
}

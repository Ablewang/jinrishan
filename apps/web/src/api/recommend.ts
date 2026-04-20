import { apiFetch } from './client'
import type { Recipe } from '../types'

interface GuestParams {
  meal_type?: string
  allergies?: string[]
  flavors?: string[]
  exclude_ids?: number[]
}

interface FamilyParams {
  family_id: number
  date?: string
  meal_type?: string
  exclude_ids?: number[]
}

export const recommendApi = {
  get: (params: GuestParams | FamilyParams) => {
    const qs = new URLSearchParams()
    if ('family_id' in params) {
      qs.set('family_id', String(params.family_id))
      if (params.date) qs.set('date', params.date)
      if (params.meal_type) qs.set('meal_type', params.meal_type)
    } else {
      if (params.meal_type) qs.set('meal_type', params.meal_type)
      if (params.allergies?.length) qs.set('allergies', params.allergies.join(','))
      if (params.flavors?.length) qs.set('flavors', params.flavors.join(','))
    }
    if (params.exclude_ids?.length) qs.set('exclude_ids', params.exclude_ids.join(','))
    return apiFetch<Recipe[]>('/api/recommend?' + qs)
  },

  refresh: (params: {
    family_id?: number
    meal_type?: string
    exclude_ids?: number[]
    guest_allergies?: string[]
    guest_flavors?: string[]
  }) =>
    apiFetch<Recipe | null>('/api/recommend/refresh', {
      method: 'POST', body: JSON.stringify(params),
    }),
}

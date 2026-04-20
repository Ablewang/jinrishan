import { apiFetch } from './client'
import type { User } from '../types'

type Prefs = {
  liked_cuisines: string[]; liked_flavors: string[]; liked_ingredients: string[]
  disliked_cuisines: string[]; disliked_flavors: string[]; disliked_ingredients: string[]
  allergies: string[]
}

export const authApi = {
  sendOtp: (phone: string) =>
    apiFetch<{ ok: boolean; code?: string }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, code: string) =>
    apiFetch<{ token: string; user: User; is_new: boolean }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),

  getPreferences: () => apiFetch<Prefs>('/api/auth/preferences'),

  updatePreferences: (prefs: Partial<Prefs>) =>
    apiFetch('/api/auth/preferences', { method: 'PUT', body: JSON.stringify(prefs) }),
}

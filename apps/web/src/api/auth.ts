import { apiFetch } from './client'
import type { User } from '../types'

export const authApi = {
  sendOtp: (phone: string) =>
    apiFetch<{ ok: boolean; code?: string }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, code: string) =>
    apiFetch<{ token: string; user: User }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),
}

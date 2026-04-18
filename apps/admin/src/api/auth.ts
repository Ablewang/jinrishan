import { apiFetch } from './client'
import type { AdminUser } from '../types'

export const adminAuthApi = {
  login: (username: string, password: string) =>
    apiFetch<{ token: string; admin: AdminUser }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
}

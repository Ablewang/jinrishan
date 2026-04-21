import { apiFetch } from './client'
import type { User, UserDetail, Family, PagedResult } from '../types'

export const adminUsersApi = {
  list: (params?: { keyword?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.keyword) qs.set('keyword', params.keyword)
    qs.set('page', String(params?.page ?? 1))
    qs.set('limit', String(params?.limit ?? 20))
    return apiFetch<PagedResult<User>>('/api/admin/users?' + qs)
  },

  get: (id: number) => apiFetch<UserDetail>(`/api/admin/users/${id}`),

  families: (params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('limit', String(params?.limit ?? 20))
    return apiFetch<PagedResult<Family>>('/api/admin/families?' + qs)
  },
}

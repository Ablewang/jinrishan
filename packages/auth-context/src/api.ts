const BASE_URL = 'https://jinrishan.95sang.cn'

export class AuthApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
    throw new AuthApiError(res.status, body.error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export interface AppUser {
  id: number
  phone: string
  name: string
}

export const authApi = {
  register: (phone: string, password: string, name?: string) =>
    request<{ data: { token: string; user: AppUser } }>('/api/app/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, name }),
    }),

  login: (phone: string, password: string) =>
    request<{ data: { token: string; user: AppUser } }>('/api/app/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  getMe: (token: string) =>
    request<{ data: AppUser }>('/api/app/auth/me', {}, token),

  updateMe: (token: string, name: string) =>
    request<{ data: AppUser }>('/api/app/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }, token),
}

export const storeApi = {
  get: (token: string, app: string, key: string) =>
    request<{ data: string | null }>(`/api/store/${app}/${key}`, {}, token),

  set: (token: string, app: string, key: string, value: string) =>
    request<{ data: { ok: boolean } }>(`/api/store/${app}/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }, token),

  delete: (token: string, app: string, key: string) =>
    request<{ data: { ok: boolean } }>(`/api/store/${app}/${key}`, {
      method: 'DELETE',
    }, token),

  getAll: (token: string, app: string) =>
    request<{ data: Record<string, string> }>(`/api/store/${app}`, {}, token),
}

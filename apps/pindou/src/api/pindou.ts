const BASE = 'https://jinrishan.95sang.cn'

async function req<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(init?.headers as Record<string, string> ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export interface WishItem { cat: string; name: string; display_name: string }
export interface DoneItem { cat: string; name: string; display_name: string; done_at: number }

export const wishlistApi = {
  getAll: (token: string) =>
    req<{ data: WishItem[] }>('/api/pindou/wishlist', token),

  add: (token: string, item: WishItem) =>
    req<{ data: { ok: boolean } }>('/api/pindou/wishlist', token, {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  addBatch: (token: string, items: WishItem[]) =>
    req<{ data: { ok: boolean } }>('/api/pindou/wishlist/batch', token, {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  remove: (token: string, cat: string, name: string) =>
    req<{ data: { ok: boolean } }>(`/api/pindou/wishlist/${encodeURIComponent(cat)}/${encodeURIComponent(name)}`, token, {
      method: 'DELETE',
    }),

  removeCat: (token: string, cat: string) =>
    req<{ data: { ok: boolean } }>(`/api/pindou/wishlist/${encodeURIComponent(cat)}`, token, {
      method: 'DELETE',
    }),
}

export const doneApi = {
  getAll: (token: string) =>
    req<{ data: DoneItem[] }>('/api/pindou/done', token),

  mark: (token: string, item: Omit<DoneItem, 'done_at'> & { done_at?: number }) =>
    req<{ data: { ok: boolean } }>('/api/pindou/done', token, {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  unmark: (token: string, cat: string, name: string) =>
    req<{ data: { ok: boolean } }>(`/api/pindou/done/${encodeURIComponent(cat)}/${encodeURIComponent(name)}`, token, {
      method: 'DELETE',
    }),
}

export const inventoryApi = {
  getAll: (token: string, palette: string) =>
    req<{ data: Record<string, number> }>(`/api/pindou/inventory/${palette}`, token),

  set: (token: string, palette: string, code: string, count: number) =>
    req<{ data: { ok: boolean } }>(`/api/pindou/inventory/${palette}/${encodeURIComponent(code)}`, token, {
      method: 'PUT',
      body: JSON.stringify({ count }),
    }),

  clear: (token: string, palette: string) =>
    req<{ data: { ok: boolean } }>(`/api/pindou/inventory/${palette}`, token, {
      method: 'DELETE',
    }),
}

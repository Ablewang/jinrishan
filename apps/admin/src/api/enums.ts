import { apiFetch } from './client'
import type { EnumValue } from '../types'

export const adminEnumsApi = {
  list: () => apiFetch<Record<string, EnumValue[]>>('/api/admin/enums'),

  update: (type: string, values: { value: string; label: string; sort_order: number }[]) =>
    apiFetch(`/api/admin/enums/${type}`, { method: 'PUT', body: JSON.stringify({ values }) }),
}

import { apiFetch } from './client'

export const logsApi = {
  save(params: { family_id: number; date: string; meal_type: string; recipe_ids: number[] }) {
    return apiFetch<{ ok: boolean }>('/api/logs', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  getDay(family_id: number, date: string) {
    return apiFetch<Record<string, { recipe_id: number; name: string; images: string[] }[]>>(
      `/api/logs?family_id=${family_id}&date=${date}`
    )
  },
}

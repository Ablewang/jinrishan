import { apiFetch } from './client'
import type { OverviewStats, RecommendStats } from '../types'

export const adminStatsApi = {
  overview: () => apiFetch<OverviewStats>('/api/admin/stats/overview'),

  recommendations: (params?: { date_from?: string; date_to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.date_from) qs.set('date_from', params.date_from)
    if (params?.date_to) qs.set('date_to', params.date_to)
    return apiFetch<RecommendStats>('/api/admin/stats/recommendations?' + qs)
  },
}

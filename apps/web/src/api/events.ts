import { apiFetch } from './client'
import type { RecommendationEvent } from '../types'

export const eventsApi = {
  post: (event: RecommendationEvent) =>
    apiFetch<{ ok: boolean }>('/api/events', {
      method: 'POST', body: JSON.stringify(event),
    }),
}

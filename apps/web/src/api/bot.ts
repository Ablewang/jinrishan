import { apiFetch } from './client'

interface BotCard {
  recipe_id: number; name: string; tags: string[]; cook_time: number
  actions: string[]
}

interface BotResponse {
  reply: string; intent: string; cards: BotCard[]
}

export const botApi = {
  message: (family_id: number, message: string, context?: { meal_type?: string; date?: string }) =>
    apiFetch<BotResponse>('/api/bot/message', {
      method: 'POST', body: JSON.stringify({ family_id, message, context }),
    }),
}

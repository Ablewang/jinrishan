import { apiFetch } from './client'

interface ShoppingItem {
  id: number; ingredient_name: string; amount: string; category: string; checked: number
}

export const shoppingApi = {
  get: (id: number) => apiFetch<{ id: number; items: ShoppingItem[] }>(`/api/shopping/${id}`),

  toggleItem: (listId: number, itemId: number, checked: boolean) =>
    apiFetch(`/api/shopping/${listId}/items/${itemId}`, {
      method: 'PUT', body: JSON.stringify({ checked }),
    }),
}

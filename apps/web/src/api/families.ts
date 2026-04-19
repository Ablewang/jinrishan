import { apiFetch } from './client'

export const familiesApi = {
  create: (name: string) =>
    apiFetch<{ id: number; name: string; invite_code: string }>('/api/families', {
      method: 'POST', body: JSON.stringify({ name }),
    }),

  get: (id: number) => apiFetch<{ id: number; name: string; invite_code: string }>(`/api/families/${id}`),

  members: (id: number) => apiFetch<{
    id: number; user_id: number | null; display_name: string | null; nickname: string | null; role: string; user_name: string | null
  }[]>(`/api/families/${id}/members`),

  updateMember: (familyId: number, memberUserId: number, data: { nickname?: string; role?: string }) =>
    apiFetch(`/api/families/${familyId}/members/${memberUserId}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),

  createVirtual: (familyId: number, display_name: string, nickname?: string) =>
    apiFetch<{ id: number; family_id: number; display_name: string; nickname: string | null }>(
      `/api/families/${familyId}/members/virtual`,
      { method: 'POST', body: JSON.stringify({ display_name, nickname }) },
    ),

  deleteVirtual: (familyId: number, memberId: number) =>
    apiFetch(`/api/families/${familyId}/members/virtual/${memberId}`, { method: 'DELETE' }),

  updateVirtual: (familyId: number, memberId: number, data: { display_name?: string; nickname?: string }) =>
    apiFetch(`/api/families/${familyId}/members/virtual/${memberId}`, {
      method: 'PUT', body: JSON.stringify(data),
    }),

  join: (invite_code: string, nickname?: string) =>
    apiFetch<{ family_id: number; family_name: string }>('/api/families/join', {
      method: 'POST', body: JSON.stringify({ invite_code, nickname }),
    }),

  getPreferences: (familyId: number, memberId: number) =>
    apiFetch<{
      member_id: number
      liked_cuisines: string[]; liked_flavors: string[]; liked_ingredients: string[]
      disliked_cuisines: string[]; disliked_flavors: string[]; disliked_ingredients: string[]
      allergies: string[]
    }>(`/api/families/${familyId}/members/${memberId}/preferences`),

  updatePreferences: (familyId: number, memberId: number, prefs: Record<string, string[]>) =>
    apiFetch(`/api/families/${familyId}/members/${memberId}/preferences`, {
      method: 'PUT', body: JSON.stringify(prefs),
    }),
}

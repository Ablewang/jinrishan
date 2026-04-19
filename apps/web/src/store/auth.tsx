import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReactNode } from 'react'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (data: Partial<User>) => void
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      updateUser: (data) => set((state) => ({
        user: state.user ? { ...state.user, ...data } : null
      })),
    }),
    {
      name: 'auth',
      onRehydrateStorage: () => (state) => {
        if (state) state.isLoading = false
      },
    }
  )
)

// 兼容旧的 useAuth 调用方式，无需修改任何页面
export function useAuth() {
  return useAuthStore()
}

// 供非组件代码（如 apiFetch）直接访问 token
export const authStore = useAuthStore

// AuthProvider 保留以兼容 App.tsx，实际不再需要 Context
export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

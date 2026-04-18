import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AdminUser } from '../types'

interface AuthState {
  admin: AdminUser | null
  isLoading: boolean
  login: (token: string, admin: AdminUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const stored = localStorage.getItem('admin_user')
    if (token && stored) {
      setAdmin(JSON.parse(stored) as AdminUser)
    }
    setIsLoading(false)
  }, [])

  function login(token: string, a: AdminUser) {
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(a))
    setAdmin(a)
  }

  function logout() {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{ admin, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}

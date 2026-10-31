import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { authApi, AuthApiError } from './api'
import type { AppUser } from './api'

const TOKEN_KEY = 'app_auth_token'

interface AuthContextValue {
  user: AppUser | null
  token: string | null
  loading: boolean
  login: (phone: string, password: string) => Promise<void>
  register: (phone: string, password: string, name?: string) => Promise<void>
  logout: () => void
  updateName: (name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY)
    if (!saved) { setLoading(false); return }

    authApi.getMe(saved)
      .then(res => { setToken(saved); setUser(res.data) })
      .catch(err => {
        if (err instanceof AuthApiError && err.status === 401) {
          localStorage.removeItem(TOKEN_KEY)
        } else {
          // 网络错误等暂时性问题，保留 token，下次打开再试
          setToken(saved)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (phone: string, password: string) => {
    const res = await authApi.login(phone, password)
    localStorage.setItem(TOKEN_KEY, res.data.token)
    setToken(res.data.token)
    setUser(res.data.user)
  }, [])

  const register = useCallback(async (phone: string, password: string, name?: string) => {
    const res = await authApi.register(phone, password, name)
    localStorage.setItem(TOKEN_KEY, res.data.token)
    setToken(res.data.token)
    setUser(res.data.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const updateName = useCallback(async (name: string) => {
    if (!token) return
    const res = await authApi.updateMe(token, name)
    setUser(res.data)
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateName }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

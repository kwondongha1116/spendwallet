import { useEffect, useState, createContext, useContext, ReactNode } from 'react'
import { login as apiLogin, signup as apiSignup, logout as apiLogout } from '../api/auth'
import { api } from '../api/client'

type User = { id: string; email: string; display_name: string }
type AuthContextType = {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, display_name: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // 앱 최초 로드 시 localStorage에서 복원
  useEffect(() => {
    const t = localStorage.getItem('token')
    const u = localStorage.getItem('user')
    if (t) {
      setToken(t)
      api.defaults.headers.common['Authorization'] = `Bearer ${t}`
    }
    if (u) setUser(JSON.parse(u))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await apiLogin({ email, password })
    localStorage.setItem('token', res.access_token)
    localStorage.setItem('user', JSON.stringify(res.user))
    api.defaults.headers.common['Authorization'] = `Bearer ${res.access_token}`
    setToken(res.access_token)
    setUser(res.user)
  }

  const signup = async (email: string, password: string, display_name: string) => {
    const res = await apiSignup({ email, password, display_name })
    localStorage.setItem('token', res.access_token)
    localStorage.setItem('user', JSON.stringify(res.user))
    api.defaults.headers.common['Authorization'] = `Bearer ${res.access_token}`
    setToken(res.access_token)
    setUser(res.user)
  }

  const logout = async () => {
    try { await apiLogout() } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthState() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthState must be used within AuthProvider')
  return ctx
}


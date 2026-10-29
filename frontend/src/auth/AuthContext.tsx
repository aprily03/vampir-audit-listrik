import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, clearToken, getToken, setToken } from '../lib/api'
import type { AuthUser, Role } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const roleHome: Record<Role, string> = {
  ADMIN: '/dashboard',
  AUDITOR: '/audit',
  MAINTENANCE: '/panels',
  PIMPINAN: '/executive',
}

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Dosen Admin',
  AUDITOR: 'Auditor Lapangan',
  MAINTENANCE: 'Facility Maintenance',
  PIMPINAN: 'Pimpinan Kampus',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function restore() {
      if (!getToken()) {
        if (active) setLoading(false)
        return
      }

      try {
        const response = await api.get<{ user: AuthUser }>('/me')
        if (active) setUser(response.user)
      } catch {
        clearToken()
      } finally {
        if (active) setLoading(false)
      }
    }

    void restore()

    const onUnauthorized = () => setUser(null)
    window.addEventListener('vampir:unauthorized', onUnauthorized)

    return () => {
      active = false
      window.removeEventListener('vampir:unauthorized', onUnauthorized)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<{ token: string; user: AuthUser }>('/login', {
      email,
      password,
      device_name: 'vampir-web',
    })
    setToken(response.token)
    setUser(response.user)
    return response.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } catch {
      // Token may already be invalid; local cleanup still applies.
    }
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider.')
  return context
}

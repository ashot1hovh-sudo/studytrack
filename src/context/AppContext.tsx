import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { StudentProfile } from '@/types/studytrack'

interface AppState {
  activeTab: string
  setActiveTab: (tab: string) => void
  isParentMode: boolean
  setIsParentMode: (mode: boolean) => void
  isAuthenticated: boolean
  isAuthLoading: boolean
  user: StudentProfile | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  loginError: string | null
}

const AppContext = createContext<AppState | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isParentMode, setIsParentMode] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [user, setUser] = useState<StudentProfile | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (!response.ok) {
        setIsAuthenticated(false)
        setUser(null)
        return
      }

      const data = await response.json()
      setUser(data.user)
      setIsAuthenticated(true)
    } catch {
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setIsAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoginError(null)

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (response.ok) {
      await refreshSession()
      setLoginError(null)
      return true
    }

    const data = await response.json().catch(() => null)
    setLoginError(data?.error ?? 'Не удалось войти')
    return false
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setIsAuthenticated(false)
    setUser(null)
    setIsParentMode(false)
    setActiveTab('dashboard')
    setLoginError(null)
  }

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isParentMode,
        setIsParentMode,
        isAuthenticated,
        isAuthLoading,
        user,
        login,
        logout,
        loginError,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { StudentProfile } from '@/types/studytrack'

interface AppState {
  activeTab: string
  setActiveTab: (tab: string, replace?: boolean) => void
  isParentMode: boolean
  setIsParentMode: (mode: boolean) => void
  isAuthenticated: boolean
  isAuthLoading: boolean
  user: StudentProfile | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  verifyPin: (pin: string) => Promise<{ ok: boolean; error?: string }>
  loginError: string | null
  isAdmin: boolean
}

const AppContext = createContext<AppState | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTabState] = useState('dashboard')
  const [isParentMode, setIsParentMode] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [user, setUser] = useState<StudentProfile | null>(null)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Seed initial history entry so the very first back press goes to dashboard
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    const tab = hash || 'dashboard'
    if (hash) setActiveTabState(tab)
    window.history.replaceState({ tab }, '', window.location.href)
  }, [])

  // Sync activeTab when the user presses the browser/phone back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      setActiveTabState(e.state?.tab ?? 'dashboard')
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const setActiveTab = useCallback((tab: string, replace = false) => {
    const hash = tab === 'dashboard' ? '' : '#' + tab
    const url = window.location.pathname + hash
    if (replace) {
      window.history.replaceState({ tab }, '', url)
    } else {
      window.history.pushState({ tab }, '', url)
    }
    setActiveTabState(tab)
  }, [])

  const isAdmin = user?.role === 'consultant'

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session')
      if (!response.ok) {
        // A device-limit eviction looks identical to an ordinary logout unless we
        // say so. An unexplained logout reads as a broken app and costs a support
        // message; an explained one costs nothing.
        const data = await response.json().catch(() => null)
        if (data?.code === 'session_evicted' && data?.error) {
          setLoginError(data.error)
        }
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
    setActiveTab('dashboard', true)
    setLoginError(null)
  }

  const verifyPin = async (pin: string): Promise<{ ok: boolean; error?: string }> => {
    const response = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinCode: pin }),
    })
    const data = await response.json().catch(() => null)
    if (response.ok) {
      await refreshSession()
      return { ok: true }
    }
    return { ok: false, error: data?.error ?? 'Неверный PIN-код' }
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
        verifyPin,
        loginError,
        isAdmin,
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

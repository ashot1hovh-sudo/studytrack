'use client'

/**
 * Temporary login gate for /v2: the live app's Login screen (same Supabase
 * accounts), then the v2 pages with the signed-in user in context.
 *
 * The session is held here rather than in AppProvider: AppProvider rewrites
 * history.state for its hash tabs, which the Next router needs on /v2. It is
 * mounted only around the Login screen, which needs its login().
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AppProvider, useApp } from '@/context/AppContext'
import Login from '@/components/Login'
import type { StudentProfile } from '@/types/studytrack'

type V2Session = { user: StudentProfile; logout: () => Promise<void> }
const Ctx = createContext<V2Session | null>(null)

export function useV2Session() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useV2Session outside V2SessionGate')
  return s
}

export default function V2SessionGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; user: StudentProfile | null }>({ loading: true, user: null })

  useEffect(() => {
    let alive = true
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setState({ loading: false, user: d?.user ?? null }))
      .catch(() => alive && setState({ loading: false, user: null }))
    return () => { alive = false }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    setState({ loading: false, user: null })
  }, [])

  if (state.loading) {
    return (
      <div className="min-h-screen bg-study-bg flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-study-lightgray border-t-study-brown animate-spin" />
      </div>
    )
  }

  if (!state.user) {
    return (
      <AppProvider>
        <LoginBridge onAuthed={(user) => setState({ loading: false, user })} />
      </AppProvider>
    )
  }

  return <Ctx.Provider value={{ user: state.user, logout }}>{children}</Ctx.Provider>
}

function LoginBridge({ onAuthed }: { onAuthed: (u: StudentProfile) => void }) {
  const { isAuthenticated, user } = useApp()
  useEffect(() => {
    if (isAuthenticated && user) onAuthed(user)
  }, [isAuthenticated, user, onAuthed])
  return <Login />
}

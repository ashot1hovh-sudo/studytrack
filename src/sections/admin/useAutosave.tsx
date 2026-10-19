'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

/**
 * Autosave for the ЛК «Редактор» blocks: each block saves by itself a moment
 * after the last change, one request at a time, so there is no «Сохранить»
 * button. The block's draft stays the source of truth while Iana types: the
 * server's reply never overwrites it, so a save landing mid-word can't eat
 * keystrokes. A block that unmounts (university folded, student switched)
 * sends what is still waiting.
 */
export type SaveState = { state: 'idle' | 'pending' | 'saving' | 'saved' | 'invalid' | 'error'; error?: string }

/** Lets the editor flush every block before switching views, and warn on leave. */
export type AutosaveRegistry = Map<string, { flush: () => Promise<void>; pending: () => boolean }>
export const AutosaveContext = createContext<AutosaveRegistry | null>(null)

let nextId = 0

export function useAutosave<T>(
  value: T,
  save: (v: T) => Promise<void>,
  { valid = true, delay = 700 }: { valid?: boolean; delay?: number } = {},
): SaveState & { retry: () => void } {
  const key = JSON.stringify(value)
  const [status, setStatus] = useState<SaveState>({ state: 'idle' })
  const savedKey = useRef(key)
  const latest = useRef({ value, key, valid })
  latest.current = { value, key, valid }
  const saveRef = useRef(save)
  saveRef.current = save
  const timer = useRef<number | null>(null)
  const inflight = useRef<Promise<void> | null>(null)
  const alive = useRef(true)

  const run = useCallback(async (): Promise<void> => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null }
    // One request at a time: wait for the previous one, then send the newest draft.
    while (inflight.current) await inflight.current
    const { value: v, key: k, valid: ok } = latest.current
    if (k === savedKey.current || !ok) return
    if (alive.current) setStatus({ state: 'saving' })
    // Never rejects: errors become the 'error' state.
    const p = (async () => {
      try {
        await saveRef.current(v)
        savedKey.current = k
        if (alive.current) setStatus({ state: latest.current.key === k ? 'saved' : 'pending' })
      } catch (e) {
        if (alive.current) setStatus({ state: 'error', error: (e as Error).message })
      }
    })()
    inflight.current = p
    await p
    // Another run may already have started its own request: leave that one alone.
    if (inflight.current === p) inflight.current = null
  }, [])

  useEffect(() => {
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null }
    if (key === savedKey.current) return
    if (!valid) { setStatus({ state: 'invalid' }); return }
    setStatus((s) => (s.state === 'saving' ? s : { state: 'pending' }))
    timer.current = window.setTimeout(() => { void run() }, delay)
  }, [key, valid, delay, run])

  const flush = useCallback(async () => {
    await run()
    while (inflight.current) await inflight.current
  }, [run])

  const registry = useContext(AutosaveContext)
  useEffect(() => {
    alive.current = true
    const id = `a${nextId++}`
    registry?.set(id, { flush, pending: () => latest.current.key !== savedKey.current && latest.current.valid })
    return () => {
      alive.current = false
      registry?.delete(id)
      // Folded or switched away with an edit still waiting: send it anyway.
      if (latest.current.key !== savedKey.current && latest.current.valid) void run()
    }
  }, [registry, flush, run])

  return { ...status, retry: () => { void run() } }
}

/** «Сохраняю… / Сохранено / Не сохранилось» next to a block. */
export function SaveChip({ s, invalidText = 'Не сохранено: исправьте поля' }: { s: SaveState & { retry: () => void }; invalidText?: string }) {
  if (s.state === 'idle') return null
  const base = 'inline-flex items-center gap-1 text-xs font-semibold'
  if (s.state === 'pending' || s.state === 'saving') return <span className={`${base} text-study-gray`}><Loader2 className="w-3.5 h-3.5 animate-spin" /> Сохраняю…</span>
  if (s.state === 'saved') return <span className={`${base} text-study-green`}><Check className="w-3.5 h-3.5" /> Сохранено</span>
  if (s.state === 'invalid') return <span className={`${base} text-study-red`}>{invalidText}</span>
  return (
    <span className={`${base} text-study-red`}>
      Не сохранилось: {s.error}
      <button onClick={s.retry} className="underline">Повторить</button>
    </span>
  )
}

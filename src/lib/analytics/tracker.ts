'use client'

/**
 * Time spent per section and per lesson, reported to POST /api/analytics.
 *
 * The whole student app sits at one URL, so a page-view tool can't tell «Вузы»
 * from a lesson. Instead the app names what is on screen with setView(); this
 * module counts the seconds the student is actually there and keeps one row per
 * view up to date.
 *
 * - Time counts only while the tab is visible and the student did something
 *   (mouse, keys, scroll, touch) in the last 90 s, so a tab left open overnight
 *   doesn't count. A RuTube video watched without touching anything is
 *   undercounted past that point.
 * - The running total goes out every 30 s, on every switch, and when the tab is
 *   hidden or closed (keepalive fetch). Views under 5 s are never sent.
 * - Failures are silent: analytics must never get in the student's way.
 */
import type { AnalyticsKind, AnalyticsPing } from './sections'

const TICK_S = 5
const FLUSH_EVERY_S = 30
const IDLE_MS = 90_000
const MIN_SECONDS = 5

type View = AnalyticsPing & { sent: number }

let current: View | null = null
let lastInput = 0
let elapsed = 0
let timer: ReturnType<typeof setInterval> | null = null

function uuid(): string {
  // randomUUID needs a secure context and a 2021+ browser; fall back for the rest.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function post(p: AnalyticsPing) {
  try {
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}

function flush() {
  const v = current
  if (!v || v.seconds < MIN_SECONDS || v.seconds === v.sent) return
  v.sent = v.seconds
  const { sent: _sent, ...ping } = v
  post(ping)
}

const onInput = () => { lastInput = Date.now() }
const onHide = () => { if (document.visibilityState === 'hidden') flush() }

function start() {
  if (timer) return
  lastInput = Date.now()
  timer = setInterval(() => {
    if (!current || document.visibilityState !== 'visible' || Date.now() - lastInput > IDLE_MS) return
    current.seconds += TICK_S
    elapsed += TICK_S
    if (elapsed % FLUSH_EVERY_S === 0) flush()
  }, TICK_S * 1000)
  for (const e of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) window.addEventListener(e, onInput, { passive: true })
  window.addEventListener('scroll', onInput, { passive: true, capture: true })
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', flush)
}

/** What is on screen now: a section, optionally an item inside it (a lesson). */
export function setView(section: string, item: string | null = null, title: string | null = null) {
  if (typeof window === 'undefined') return
  start()
  if (current && current.section === section && current.item === item) {
    // Same view; the lesson title often arrives after the lesson opens.
    if (title && current.title !== title) { current.title = title; current.sent = -1 }
    return
  }
  flush()
  current = { id: uuid(), kind: 'view', section, item, title, seconds: 0, sent: 0 }
  lastInput = Date.now()
}

/** A click on something locked: what free students want to open. */
export function trackLocked(section: string, item: string, title: string | null) {
  if (typeof window === 'undefined') return
  const kind: AnalyticsKind = 'paywall'
  post({ id: uuid(), kind, section, item, title, seconds: 0 })
}

/** Logout or leaving the student app: send what's left and stop counting. */
export function stopTracking() {
  flush()
  current = null
  if (timer) clearInterval(timer)
  timer = null
  for (const e of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) window.removeEventListener(e, onInput)
  window.removeEventListener('scroll', onInput, { capture: true })
  document.removeEventListener('visibilitychange', onHide)
  window.removeEventListener('pagehide', flush)
}

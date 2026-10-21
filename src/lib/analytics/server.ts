// In-app analytics, server side: writes from the student app and the reads
// behind the admin «Аналитика» page. Table public.analytics_views (service
// role only, migration 004). Server-only.

import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/lib/supabase/config'
import { hasPaidAccess } from '@/lib/api'
import { isSection, type AnalyticsPing } from './sections'

/**
 * Staff and test accounts, left out of the numbers by default (the admin page
 * has a switch). Only affects what the statistics show, never access.
 */
export const TEAM_EMAILS = new Set([
  'bigdaddy_admin@kaykitay.ru',
  'ashoth1g@163.com',
  'ashot1hovh@gmail.com',
  'ashot.sinoservices@gmail.com',
  'ianadved@yandex.ru',
  'ianadved@gmail.com',
  'a.liseno4ek@yandex.ru', // Alisa (SMM)
])

const MAX_SECONDS = 12 * 3600
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ITEM = /^[a-z0-9:_-]{1,64}$/i

function client() {
  const { url } = getSupabaseConfig()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing')
  // no-store: Next.js caches fetch() in route handlers (the ЛК gotcha).
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })
}

/** Checks a ping from the browser; null if anything is off. */
export function parsePing(body: unknown): AnalyticsPing | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const kind = b.kind === 'paywall' ? 'paywall' : b.kind === 'view' ? 'view' : null
  if (!kind || typeof b.id !== 'string' || !UUID.test(b.id) || !isSection(b.section)) return null
  const item = b.item == null ? null : typeof b.item === 'string' && ITEM.test(b.item) ? b.item : undefined
  if (item === undefined) return null
  const title = typeof b.title === 'string' ? b.title.trim().slice(0, 200) || null : null
  const seconds = typeof b.seconds === 'number' && Number.isFinite(b.seconds) ? Math.max(0, Math.min(MAX_SECONDS, Math.round(b.seconds))) : 0
  return { id: b.id, kind, section: b.section as string, item, title, seconds }
}

/**
 * One row per view. The browser resends the running total, so the row is
 * updated in place; only a larger total wins, so a late packet can't shrink it.
 * The update is scoped to the caller's own rows, and a new row takes the
 * student's access level from the database, never from the browser.
 */
export async function recordPing(studentId: string, p: AnalyticsPing) {
  const db = client()
  const now = new Date().toISOString()
  if (p.kind === 'view') {
    const { data, error } = await db
      .from('analytics_views')
      .update({ seconds: p.seconds, item_title: p.title, updated_at: now })
      .eq('id', p.id)
      .eq('student_id', studentId)
      .lte('seconds', p.seconds)
      .select('id')
    if (error) throw error
    if (data?.length) return
  }
  const { data: profile } = await db
    .from('students')
    .select('role,service_type,subscription_status,access_expires_at')
    .eq('id', studentId)
    .maybeSingle()
  if (!profile || profile.role === 'consultant') return
  const { error } = await db.from('analytics_views').insert({
    id: p.id,
    student_id: studentId,
    kind: p.kind,
    section: p.section,
    item: p.item,
    item_title: p.title,
    plan: hasPaidAccess(profile) ? 'paid' : 'free',
    seconds: p.seconds,
  })
  // 23505: the row exists already (a stale packet, or not ours). Nothing to do.
  if (error && error.code !== '23505') throw error
}

async function all<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

export type AdminView = { id: string; student_id: string; kind: 'view' | 'paywall'; section: string; item: string | null; item_title: string | null; plan: 'free' | 'paid'; seconds: number; started_at: string; updated_at: string }
export type AdminUni = { student_id: string; name: string; status: string; created_at: string }
export type AdminStudent = { id: string; name: string; email: string; paid: boolean; premium: boolean; team: boolean; createdAt: string }

/** Everything the «Аналитика» page needs. `since` limits only the views. */
export async function analyticsData(since: string | null) {
  const db = client()
  const [views, unis, students, first] = await Promise.all([
    all<AdminView>((a, b) => {
      let q = db.from('analytics_views').select('id,student_id,kind,section,item,item_title,plan,seconds,started_at,updated_at')
      if (since) q = q.gte('started_at', since)
      return q.order('started_at').order('id').range(a, b)
    }),
    all<AdminUni>((a, b) => db.from('universities').select('student_id,name,status,created_at').order('id').range(a, b)),
    all<{ id: string; email: string; full_name: string | null; role: string; service_type: string | null; subscription_status: string | null; access_expires_at: string | null; created_at: string }>(
      (a, b) => db.from('students').select('id,email,full_name,role,service_type,subscription_status,access_expires_at,created_at').order('created_at').range(a, b),
    ),
    db.from('analytics_views').select('started_at').order('started_at').limit(1),
  ])
  return {
    views,
    unis,
    students: students.map<AdminStudent>((s) => ({
      id: s.id,
      name: s.full_name?.trim() || s.email,
      email: s.email,
      paid: hasPaidAccess(s),
      premium: s.service_type === 'premium',
      team: s.role === 'consultant' || TEAM_EMAILS.has(s.email.toLowerCase()),
      createdAt: s.created_at,
    })),
    firstViewAt: (first.data?.[0]?.started_at as string | undefined) ?? null,
  }
}

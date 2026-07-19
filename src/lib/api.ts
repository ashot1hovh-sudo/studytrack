import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasSupabaseConfig } from '@/lib/supabase/config'

export function missingSupabaseEnv() {
  return !hasSupabaseConfig()
}

export function setupErrorResponse() {
  return NextResponse.json(
    { error: 'Supabase is not configured. Copy .env.example to .env.local and add your project URL/key.' },
    { status: 500 }
  )
}

/** How many devices one account may use at once. Consultants are exempt. */
const MAX_CONCURRENT_SESSIONS = 2

/**
 * Reads the session_id claim out of an access token.
 *
 * The token is only decoded, never trusted on its own — getUser() has already
 * verified it against GoTrue by the time this runs, so this is just pulling a
 * claim out of an already-validated token.
 */
function sessionIdFromToken(accessToken?: string | null): string | null {
  if (!accessToken) return null
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return null
    const json = Buffer.from(payload, 'base64url').toString('utf8')
    return (JSON.parse(json) as { session_id?: string }).session_id ?? null
  } catch {
    return null
  }
}

function sessionEvictedResponse() {
  return NextResponse.json(
    {
      error: `Вы вошли на другом устройстве. Одновременно можно использовать ${MAX_CONCURRENT_SESSIONS} устройства.`,
      code: 'session_evicted',
    },
    { status: 401 }
  )
}

/**
 * The raw access token straight out of the auth cookie.
 *
 * Deliberately not supabase.auth.getSession(): once a session row is deleted the
 * refresh token dies with it, getSession() fails its refresh and returns null, and
 * the token we need in order to explain the eviction is gone. The cookie still
 * holds it, so read the cookie.
 *
 * Shape: `sb-<ref>-auth-token` = "base64-" + base64(JSON), and supabase-ssr splits
 * it into `.0`, `.1`, … chunks once it outgrows the 4 KB cookie limit.
 */
function accessTokenFromCookies(): string | null {
  try {
    const all = cookies().getAll()
    const chunks = all
      .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

    if (chunks.length === 0) return null

    let raw = chunks.map((c) => c.value).join('')
    if (raw.startsWith('base64-')) {
      raw = Buffer.from(raw.slice('base64-'.length), 'base64').toString('utf8')
    }

    return (JSON.parse(raw) as { access_token?: string }).access_token ?? null
  } catch {
    return null
  }
}

/** Was this token's session removed by the device limit (rather than merely expired)? */
async function wasEvicted(accessToken: string | null) {
  const sessionId = sessionIdFromToken(accessToken)
  if (!sessionId) return false

  const admin = createAdminClient()
  if (!admin) return false

  const { data, error } = await admin
    .from('evicted_sessions')
    .select('session_id')
    .eq('session_id', sessionId)
    .maybeSingle()

  return !error && Boolean(data)
}

export async function getAuthenticatedUser() {
  const supabase = createClient()

  // Read the token BEFORE getUser(). On a dead session supabase-ssr's failed
  // refresh clears the auth cookie, so reading it afterwards finds nothing and
  // the eviction becomes indistinguishable from an ordinary expiry.
  const cookieToken = accessTokenFromCookies()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    // Distinguish "evicted by the device limit" from an ordinary expired session.
    // Eviction deletes the auth.sessions row, which invalidates the access token
    // immediately — so we never reach the limit check below and would otherwise
    // report a bare 401 that reads to the user as the app randomly logging them out.
    if (await wasEvicted(cookieToken)) {
      return { supabase, user: null, response: sessionEvictedResponse() }
    }

    return { supabase, user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Device limit, re-checked on every request rather than only at login.
  const admin = createAdminClient()
  if (admin) {
    const sessionId = sessionIdFromToken(cookieToken)

    const { data: allowed, error: limitError } = await admin.rpc('enforce_session_limit', {
      p_user: user.id,
      p_session: sessionId,
      p_max: MAX_CONCURRENT_SESSIONS,
    })

    // Fail open on an RPC error (function not deployed yet, DB blip). A broken
    // session check should not lock every paying customer out of the product.
    if (!limitError && allowed === false) {
      return { supabase, user: null, response: sessionEvictedResponse() }
    }
  }

  return { supabase, user, response: null }
}

/**
 * Gates the consultant/admin API surface.
 *
 * This used to compare the caller's email against a hardcoded 'admin@gmail.com'.
 * With open registration that was a privilege-escalation hole: whoever registered
 * that address first would have been handed every student's personal data.
 *
 * Authority now comes from students.role = 'consultant', which is what the schema
 * always intended. The lookup uses the service-role client so it can't be
 * influenced by the caller's own RLS context.
 */
export async function getConsultantUser() {
  const auth = await getAuthenticatedUser()
  if (auth.response || !auth.user) return auth

  const forbidden = {
    ...auth,
    response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
  }

  const admin = createAdminClient()
  if (!admin) {
    // Without the service-role key the role can't be verified. Deny rather than
    // fall back to a weaker check.
    return forbidden
  }

  const { data: profile, error } = await admin
    .from('students')
    .select('role')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (error || profile?.role !== 'consultant') return forbidden

  return auth
}

/** Access is sold once and covers this many years. */
export const ACCESS_WINDOW_YEARS = 2

export function accessExpiryFromNow(now = new Date()) {
  const expiry = new Date(now)
  expiry.setFullYear(expiry.getFullYear() + ACCESS_WINDOW_YEARS)
  return expiry.toISOString()
}

/**
 * Is this profile entitled to paid content right now?
 *
 * A null access_expires_at means no expiry — staff, and anyone who bought before
 * the window existed. Only an expiry that has actually passed revokes access.
 */
export function hasPaidAccess(profile: {
  service_type?: string | null
  subscription_status?: string | null
  access_expires_at?: string | null
} | null) {
  if (!profile) return false

  const entitled = profile.service_type === 'premium' || profile.subscription_status === 'active'
  if (!entitled) return false

  if (!profile.access_expires_at) return true
  return new Date(profile.access_expires_at).getTime() > Date.now()
}

/**
 * Gates paid content.
 *
 * This exists because the paywall used to be client-side only: the lesson route
 * checked that you were logged in and nothing else, so any free account could
 * fetch every paid lesson straight from the API. The lock icon was decoration.
 *
 * The lookup uses the service-role client so the caller's own RLS context cannot
 * influence the answer — same reasoning as getConsultantUser.
 */
export async function getEntitledUser() {
  const auth = await getAuthenticatedUser()
  if (auth.response || !auth.user) return auth

  const denied = {
    ...auth,
    response: NextResponse.json(
      { error: 'Этот материал доступен после активации доступа.', code: 'payment_required' },
      { status: 403 }
    ),
  }

  const admin = createAdminClient()
  if (!admin) return denied

  const { data: profile, error } = await admin
    .from('students')
    .select('service_type,subscription_status,access_expires_at')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (error || !hasPaidAccess(profile)) return denied

  return auth
}

const ruMonths = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК']

export function formatRuDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatRuShortDate(value?: string | null) {
  if (!value) return undefined
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return undefined

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function splitDeadlineDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return {
    date: String(date.getDate()).padStart(2, '0'),
    month: ruMonths[date.getMonth()],
  }
}

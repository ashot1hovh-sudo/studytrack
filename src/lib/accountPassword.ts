// Login passwords set by the admin, kept so Ashot and Iana can look them up
// later (Supabase Auth stores only a hash). Encrypted at rest with
// LK_SECRET_KEY, table public.account_passwords (service role only).
// Server-only.

import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/lib/supabase/config'
import { decryptSecret, encryptSecret } from '@/lib/lk/secret'

export const MIN_PASSWORD_LENGTH = 6
export const MAX_PASSWORD_LENGTH = 72 // bcrypt ignores anything longer

function client() {
  const { url } = getSupabaseConfig()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing')
  // no-store: Next.js caches fetch() in route handlers, so a read right after
  // a password change could return the old one.
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })
}

export function passwordError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Пароль должен быть минимум ${MIN_PASSWORD_LENGTH} символов`
  if (password.length > MAX_PASSWORD_LENGTH) return `Пароль должен быть не длиннее ${MAX_PASSWORD_LENGTH} символов`
  return null
}

export async function saveAccountPassword(studentId: string, password: string) {
  const { error } = await client()
    .from('account_passwords')
    .upsert({ student_id: studentId, password_enc: encryptSecret(password), updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

/** null when the password was never saved here (self-registered, imported, or created before this table). */
export async function getAccountPassword(studentId: string): Promise<{ password: string; updatedAt: string } | null> {
  const { data, error } = await client()
    .from('account_passwords')
    .select('password_enc, updated_at')
    .eq('student_id', studentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return { password: decryptSecret(data.password_enc), updatedAt: data.updated_at }
}

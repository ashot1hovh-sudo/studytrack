import { NextResponse } from 'next/server'
import { missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'

/**
 * Confirms a freshly registered account with the 6-digit code from the
 * confirmation email. The email also contains a magic link that does the same
 * thing; this is the path for people whose mail client mangles or strips links.
 *
 * On success Supabase sets the session cookies, so the user is signed in
 * immediately — no separate login step.
 */
export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const body = await request.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const token = String(body?.token ?? '').replace(/\s/g, '')

  if (!email || !token) {
    return NextResponse.json({ error: 'Email и код обязательны' }, { status: 400 })
  }

  const supabase = createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })

  if (error) {
    // Expired and wrong codes are deliberately reported the same way, so the
    // response can't be used to probe which codes were ever valid.
    return NextResponse.json(
      { error: 'Неверный или истёкший код. Запросите новый.' },
      { status: 401 }
    )
  }

  return NextResponse.json({ ok: true })
}

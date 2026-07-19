import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Marks the intro tour as seen for the calling account.
 *
 * Idempotent: only the first completion is recorded, so a replay via ?tour=1
 * does not rewrite the original timestamp (which is the interesting one — it
 * tells you when they actually onboarded).
 *
 * Writes through the service-role client because students has no UPDATE policy
 * for its owner, deliberately: letting a client write its own profile row is how
 * subscription_status and role become self-serve.
 */
export async function POST() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { user, response } = await getAuthenticatedUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Сервисный ключ не настроен' }, { status: 500 })
  }

  const { error } = await admin
    .from('students')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', user.id)
    .is('onboarding_completed_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

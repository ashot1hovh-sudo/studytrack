import { NextResponse } from 'next/server'
import { getAuthenticatedUser, hasPaidAccess, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  // Role comes from the students row, not from a hardcoded email. The old
  // special case here handed 'consultant' to whoever held one specific address.
  const { data: student } = await supabase
    .from('students')
    .select('id,email,full_name,role,service_type,subscription_status,access_expires_at,onboarding_completed_at')
    .eq('id', user.id)
    .maybeSingle()

  // An expired window reads as 'inactive' to the client, so the UI relocks itself
  // without needing to know the expiry rules. The server gate (getEntitledUser)
  // is the real enforcement — this only keeps the two from disagreeing.
  const entitled = hasPaidAccess(student)
  const rawStatus = student?.subscription_status ?? 'trial'

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: student?.full_name ?? user.email ?? 'Студент',
      role: student?.role ?? 'student',
      // Fall back to the *least* privileged state. These previously defaulted to
      // premium/active, so a user with no profile row got paid access for free.
      serviceType: student?.service_type ?? 'diy',
      subscriptionStatus: rawStatus === 'active' && !entitled ? 'inactive' : rawStatus,
      accessExpiresAt: student?.access_expires_at ?? null,
      // Per account, not per browser: the tour should follow the user across
      // devices and not be swallowed by whoever used this browser first.
      onboardingCompleted: Boolean(student?.onboarding_completed_at),
      // pin_code deliberately not returned: the browser has no use for it, and a
      // secret sent where it isn't needed is one that leaks via a screenshot or
      // a bug report later.
    },
  })
}

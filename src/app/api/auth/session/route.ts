import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  // Role comes from the students row, not from a hardcoded email. The old
  // special case here handed 'consultant' to whoever held one specific address.
  const { data: student } = await supabase
    .from('students')
    .select('id,email,full_name,role,service_type,subscription_status,pin_code')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: student?.full_name ?? user.email ?? 'Студент',
      role: student?.role ?? 'student',
      // Fall back to the *least* privileged state. These previously defaulted to
      // premium/active, so a user with no profile row got paid access for free.
      serviceType: student?.service_type ?? 'diy',
      subscriptionStatus: student?.subscription_status ?? 'trial',
      pinCode: student?.pin_code ?? null,
    },
  })
}

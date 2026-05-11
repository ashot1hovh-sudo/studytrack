import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  if (user.email === 'admin@gmail.com') {
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: 'Admin',
        role: 'consultant',
        serviceType: 'premium',
        subscriptionStatus: 'active',
        pinCode: null,
      },
    })
  }

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
      serviceType: student?.service_type ?? 'premium',
      subscriptionStatus: student?.subscription_status ?? 'active',
      pinCode: student?.pin_code ?? null,
    },
  })
}

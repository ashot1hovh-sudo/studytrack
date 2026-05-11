import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')
  const fullName = String(body?.fullName ?? '').trim()

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: 'Email, пароль и имя обязательны' },
      { status: 400 }
    )
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Пароль должен быть минимум 6 символов' },
      { status: 400 }
    )
  }

  // Check if email already exists in students table
  const { data: existingUser } = await admin
    .from('students')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingUser) {
    return NextResponse.json(
      { error: 'Этот email уже зарегистрирован' },
      { status: 409 }
    )
  }

  // Create user in Supabase Auth with email auto-confirmed (no SMTP needed)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Не удалось создать аккаунт' },
      { status: 500 }
    )
  }

  const studentId = authData.user.id

  // Create DIY student profile
  const { error: profileError } = await admin.from('students').insert({
    id: studentId,
    email,
    full_name: fullName,
    role: 'student',
    service_type: 'diy',
    subscription_status: 'trial',
    pin_code: null,
  })

  if (profileError) {
    // Rollback: delete auth user if profile creation failed
    await admin.auth.admin.deleteUser(studentId)
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: 'Регистрация успешна. Проверьте email для подтверждения аккаунта.',
  })
}

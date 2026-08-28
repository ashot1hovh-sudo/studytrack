import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { escapeHtml, notifyTelegram } from '@/lib/telegram'

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
  const acceptedTerms = body?.acceptedTerms === true
  const acceptedAgreement = body?.acceptedAgreement === true

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: 'Email, пароль и имя обязательны' },
      { status: 400 }
    )
  }

  // Enforced server-side, not just by the disabled submit button: consent has to
  // be provable, and a client-side-only check proves nothing. Both consents are
  // mandatory: the personal-data consent (Согласие + Политика конфиденциальности)
  // and acceptance of the Пользовательское соглашение.
  if (!acceptedTerms) {
    return NextResponse.json(
      { error: 'Необходимо дать согласие на обработку персональных данных' },
      { status: 400 }
    )
  }

  if (!acceptedAgreement) {
    return NextResponse.json(
      { error: 'Необходимо принять пользовательское соглашение' },
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

  // Sign up through the normal (anon) client rather than the admin API: admin
  // createUser never sends a confirmation email, whatever GoTrue is configured
  // to do. signUp triggers the branded confirmation template, which carries both
  // a magic link and a 6-digit code.
  const supabase = createClient()
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? 'Не удалось создать аккаунт' },
      { status: 500 }
    )
  }

  // GoTrue returns a decoy user with an empty identities array when the address
  // is already registered, so signUp cannot be used to enumerate accounts. Treat
  // that as "already exists" rather than creating a duplicate profile row.
  if (authData.user.identities && authData.user.identities.length === 0) {
    return NextResponse.json(
      { error: 'Этот email уже зарегистрирован' },
      { status: 409 }
    )
  }

  const studentId = authData.user.id

  // Create DIY student profile
  const now = new Date().toISOString()
  const { error: profileError } = await admin.from('students').insert({
    id: studentId,
    email,
    full_name: fullName,
    role: 'student',
    service_type: 'diy',
    subscription_status: 'trial',
    pin_code: null,
    // Both mandatory consents are given together at registration, so this single
    // timestamp records acceptance of the whole legal package (Согласие на
    // обработку ПД, Политика конфиденциальности, Пользовательское соглашение).
    terms_accepted_at: now,
    // The marketing opt-in was removed from registration; nobody opts in here.
    marketing_consent: false,
    marketing_consent_at: null,
  })

  if (profileError) {
    // Rollback: delete auth user if profile creation failed
    await admin.auth.admin.deleteUser(studentId)
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    )
  }

  // Fire-and-forget owner notification. notifyTelegram swallows every failure
  // and is time-bounded, so awaiting it cannot delay or break the signup. Fires
  // at registration submit — before email confirmation — because this is the only
  // place the free students row is created.
  const signupTime = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(new Date(now))

  await notifyTelegram(
    [
      '🎉 <b>Новая регистрация StudyTrack</b>',
      `📧 ${escapeHtml(email)}`,
      `👤 ${escapeHtml(fullName)}`,
      `📅 ${escapeHtml(signupTime)} (МСК)`,
    ].join('\n')
  )

  // The account exists but is unconfirmed: the user must enter the 6-digit code
  // from the email (or follow its link) before they can sign in.
  return NextResponse.json({
    ok: true,
    needsConfirmation: true,
    message: 'Мы отправили код подтверждения на вашу почту.',
  })
}

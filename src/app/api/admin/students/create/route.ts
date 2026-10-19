import { NextResponse } from 'next/server'
import { accessExpiryFromNow, getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { passwordError, saveAccountPassword } from '@/lib/accountPassword'

const defaultDocumentsPackage = [
  'Аттестат о среднем образовании',
  'Справка о здоровье',
  'Перевод документов',
  'Рекомендательное письмо',
  'Мотивационное письмо',
  'Копия паспорта',
]

const validPrograms = new Set(['language_year', 'bachelor', 'master'])

export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

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
  // The admin form now sends only email + password. students.full_name is
  // NOT NULL, so fall back to the part of the email before @ (same rule as
  // supabase-fix-orphan-student.sql); the real name is set later in the ЛК.
  const fullName = String(body?.fullName ?? '').trim() || email.split('@')[0]
  // Defaults to 'diy' so a manually created account matches a self-registered
  // one. This route predates the DIY pivot and used to hard-code premium/active,
  // which would have handed every manually created student a free paid
  // subscription. Premium is now opt-in.
  // access: 'trial' (free account) | 'paid' (bought the 2-year access, same as
  // a PIN activation) | 'premium' (personal support). serviceType is the older
  // field, still accepted.
  const access = body?.access === 'paid' || body?.access === 'premium' ? body.access : body?.serviceType === 'premium' ? 'premium' : 'trial'
  const serviceType = access === 'premium' ? 'premium' : 'diy'
  const subscriptionStatus = access === 'trial' ? 'trial' : 'active'
  const accessExpiresAt = access === 'paid' ? accessExpiryFromNow() : null
  const age = body?.age ? Number(body.age) : null
  const program = String(body?.program ?? 'bachelor')
  const universities: string[] = Array.isArray(body?.universities)
    ? body.universities.map((name: unknown) => String(name).trim()).filter(Boolean)
    : []
  const documents: string[] = Array.isArray(body?.documents)
    ? body.documents.map((name: unknown) => String(name).trim()).filter(Boolean)
    : defaultDocumentsPackage

  if (!email || !password) {
    return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 })
  }

  const invalidPassword = passwordError(password)
  if (invalidPassword) {
    return NextResponse.json({ error: invalidPassword }, { status: 400 })
  }

  if (!validPrograms.has(program)) {
    return NextResponse.json({ error: 'Неверная программа обучения' }, { status: 400 })
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Не удалось создать пользователя' }, { status: 500 })
  }

  const studentId = authData.user.id

  const { error: profileError } = await admin.from('students').insert({
    id: studentId,
    email,
    full_name: fullName,
    age,
    program,
    role: 'student',
    service_type: serviceType,
    subscription_status: subscriptionStatus,
    access_expires_at: accessExpiresAt,
    pin_code: null,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(studentId)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // Keep a copy for the admin. The account works without it, so a failure
  // here is reported, not fatal.
  let passwordWarning: string | null = null
  try {
    await saveAccountPassword(studentId, password)
  } catch (err) {
    passwordWarning = `Аккаунт создан, но пароль не сохранился в админке (${(err as Error).message}). Запишите его.`
  }

  // The default document package is consultant-era onboarding. DIY students get
  // one only if the caller asked for it explicitly — document upload is off.
  const fallbackDocuments = serviceType === 'premium' ? defaultDocumentsPackage : []
  const uniqueDocuments = Array.from(new Set(documents.length > 0 ? documents : fallbackDocuments))

  const documentRows = uniqueDocuments.map((name, index) => ({
    student_id: studentId,
    name,
    status: 'not_started',
    order_index: index + 1,
  }))

  const universityRows = universities.map((name, index) => ({
    student_id: studentId,
    name,
    status: 'planned',
    order_index: index + 1,
  }))

  if (documentRows.length > 0) {
    const { error: documentsError } = await admin.from('documents').insert(documentRows)
    if (documentsError) return NextResponse.json({ error: documentsError.message }, { status: 500 })
  }

  if (universityRows.length > 0) {
    const { error: universitiesError } = await admin.from('universities').insert(universityRows)
    if (universitiesError) return NextResponse.json({ error: universitiesError.message }, { status: 500 })
  }

  return NextResponse.json({
    student: {
      id: studentId,
      email,
      fullName,
      age,
      program,
      documentsTotal: documentRows.length,
      documentsCompleted: 0,
      documentsPendingReview: 0,
      universitiesTotal: universityRows.length,
      urgentDeadlines: 0,
    },
    passwordWarning,
  })
}

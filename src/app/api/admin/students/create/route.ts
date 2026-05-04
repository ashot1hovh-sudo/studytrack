import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const fullName = String(body?.fullName ?? '').trim()
  const age = body?.age ? Number(body.age) : null
  const program = String(body?.program ?? 'bachelor')
  const universities: string[] = Array.isArray(body?.universities)
    ? body.universities.map((name: unknown) => String(name).trim()).filter(Boolean)
    : []
  const documents: string[] = Array.isArray(body?.documents)
    ? body.documents.map((name: unknown) => String(name).trim()).filter(Boolean)
    : defaultDocumentsPackage

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: 'Email, пароль и имя обязательны' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Пароль должен быть минимум 6 символов' }, { status: 400 })
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
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(studentId)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  const uniqueDocuments = Array.from(new Set(documents.length > 0 ? documents : defaultDocumentsPackage))

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

  const { error: documentsError } = await admin.from('documents').insert(documentRows)
  if (documentsError) return NextResponse.json({ error: documentsError.message }, { status: 500 })

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
  })
}

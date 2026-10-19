import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAccountPassword, passwordError, saveAccountPassword } from '@/lib/accountPassword'
import { MissingSecretKeyError } from '@/lib/lk/secret'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store' }

// GET /api/admin/students/:studentId/password → { password: string | null, updatedAt }
// password is null when it was never saved by the admin (self-registered or older account).
export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response

  try {
    const saved = await getAccountPassword(params.studentId)
    return NextResponse.json({ password: saved?.password ?? null, updatedAt: saved?.updatedAt ?? null }, { headers: noStore })
  } catch (err) {
    // MissingSecretKeyError carries a readable Russian message; others are raw.
    const message = err instanceof MissingSecretKeyError ? err.message : `Не удалось прочитать пароль: ${(err as Error).message}`
    return NextResponse.json({ error: message }, { status: 500, headers: noStore })
  }
}

// POST { password } sets a new login password right away (no email, no
// confirmation) and saves the encrypted copy for the admin.
export async function POST(request: Request, { params }: { params: { studentId: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })

  const body = await request.json().catch(() => null)
  const password = typeof body?.password === 'string' ? body.password : ''
  const invalid = passwordError(password)
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 })

  const { data: student } = await admin.from('students').select('role').eq('id', params.studentId).maybeSingle()
  if (!student) return NextResponse.json({ error: 'Студент не найден' }, { status: 404 })
  if (student.role === 'consultant') return NextResponse.json({ error: 'Пароль администратора здесь не меняется' }, { status: 403 })

  const { error: authError } = await admin.auth.admin.updateUserById(params.studentId, { password })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  try {
    await saveAccountPassword(params.studentId, password)
  } catch (err) {
    // The login already uses the new password; only the admin copy failed.
    return NextResponse.json(
      { error: `Пароль изменён, но не сохранился в админке: ${(err as Error).message}. Запишите его.`, changed: true },
      { status: 500, headers: noStore }
    )
  }

  return NextResponse.json({ password, updatedAt: new Date().toISOString() }, { headers: noStore })
}

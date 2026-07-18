import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(request: Request) {
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

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('id')

  if (!studentId) {
    return NextResponse.json({ error: 'ID студента обязателен' }, { status: 400 })
  }

  // Prevent deleting admin
  const { data: student } = await admin
    .from('students')
    .select('email,role')
    .eq('id', studentId)
    .maybeSingle()

  if (student?.role === 'consultant') {
    return NextResponse.json({ error: 'Нельзя удалить администратора' }, { status: 403 })
  }

  // Delete from Supabase Auth first
  const { error: authError } = await admin.auth.admin.deleteUser(studentId)
  if (authError) {
    return NextResponse.json(
      { error: authError.message ?? 'Не удалось удалить пользователя из auth' },
      { status: 500 }
    )
  }

  // Delete from students table (cascades to universities, documents, etc.)
  const { error: dbError } = await admin
    .from('students')
    .delete()
    .eq('id', studentId)

  if (dbError) {
    return NextResponse.json(
      { error: dbError.message ?? 'Не удалось удалить профиль студента' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, message: 'Пользователь удалён' })
}

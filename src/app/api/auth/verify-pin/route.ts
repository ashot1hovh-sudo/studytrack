import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const body = await request.json().catch(() => null)
  const pinCode = String(body?.pinCode ?? '').trim()

  if (!pinCode) {
    return NextResponse.json({ error: 'Введите PIN-код' }, { status: 400 })
  }

  const { data: student, error } = await supabase
    .from('students')
    .select('id,pin_code,service_type')
    .eq('id', user.id)
    .single()

  if (error || !student) {
    return NextResponse.json({ error: 'Профиль не найден' }, { status: 404 })
  }

  if (!student.pin_code) {
    return NextResponse.json({ error: 'PIN-код ещё не установлен. Обратитесь к консультанту.' }, { status: 404 })
  }

  if (student.pin_code !== pinCode) {
    return NextResponse.json({ error: 'Неверный PIN-код' }, { status: 401 })
  }

  // Activate subscription using service role to bypass RLS
  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Сервисный ключ не настроен' }, { status: 500 })
  }

  const { error: updateError } = await admin
    .from('students')
    .update({ subscription_status: 'active' })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Доступ активирован!' })
}

import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  // Verify the caller is the consultant (auth check only)
  const { response } = await getConsultantUser()
  if (response) return response

  const body = await request.json().catch(() => null)
  const studentId = String(body?.studentId ?? '')
  const subscriptionStatus = String(body?.subscriptionStatus ?? '')
  const pinCode = body?.pinCode !== undefined ? String(body.pinCode) : undefined

  if (!studentId) {
    return NextResponse.json({ error: 'ID студента обязателен' }, { status: 400 })
  }

  if (!['trial', 'active', 'inactive'].includes(subscriptionStatus)) {
    return NextResponse.json({ error: 'Неверный статус подписки' }, { status: 400 })
  }

  // Use service role client to bypass RLS — consultant UPDATE policy is missing on students table
  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Сервисный ключ Supabase не настроен' }, { status: 500 })
  }

  const updateData: Record<string, unknown> = { subscription_status: subscriptionStatus }
  if (pinCode !== undefined) updateData.pin_code = pinCode || null

  const { error: updateError } = await admin
    .from('students')
    .update(updateData)
    .eq('id', studentId)

  if (updateError?.message.includes('pin_code')) {
    // pin_code column not yet added — update only subscription_status
    const { error: fallbackError } = await admin
      .from('students')
      .update({ subscription_status: subscriptionStatus })
      .eq('id', studentId)

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, warning: 'pin_code column missing — run migration' })
  }

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

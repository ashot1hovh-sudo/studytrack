import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { BANK_COLUMNS, serializeBankRow } from '@/lib/universityBank'

// Map incoming camelCase fields to DB columns. Only these may be updated.
const FIELD_MAP: Record<string, string> = {
  universityName: 'university_name',
  program: 'program',
  city: 'city',
  link: 'link',
  arwu: 'arwu',
  chinaRank: 'china_rank',
  tuition: 'tuition',
  examRequirements: 'exam_requirements',
  deadline: 'deadline',
  dormCost: 'dorm_cost',
  notes: 'notes',
  verifiedBy: 'verified_by',
}

// PATCH /api/admin/university-bank/[id] — edit a bank record.
// Any edit re-stamps verified_at to now: the freshness indicator is meant to
// answer "when did we last confirm this row's data", and an edit IS that
// confirmation.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Некорректный id' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 })
  }

  const updates: Record<string, string | null> = {}
  for (const [key, column] of Object.entries(FIELD_MAP)) {
    if (!(key in body)) continue
    const s = String((body as Record<string, unknown>)[key] ?? '').trim()
    updates[column] = s === '' ? null : s
  }

  if ('university_name' in updates && !updates.university_name) {
    return NextResponse.json({ error: 'Название вуза не может быть пустым' }, { status: 400 })
  }
  if ('program' in updates && !updates.program) {
    return NextResponse.json({ error: 'Программа не может быть пустой' }, { status: 400 })
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 })
  }

  updates.verified_at = new Date().toISOString()
  ;(updates as Record<string, unknown>).updated_at = new Date().toISOString()

  const { data, error } = await admin
    .from('university_bank')
    .update(updates)
    .eq('id', id)
    .select(BANK_COLUMNS)
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Такой вуз с этой программой уже есть в базе.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ record: serializeBankRow(data) })
}

// DELETE /api/admin/university-bank/[id] — remove a bank record.
// shortlist_items.bank_id is ON DELETE SET NULL, so already-built shortlists
// keep their snapshot rows untouched.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const id = Number(params.id)
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Некорректный id' }, { status: 400 })
  }

  const { error } = await admin.from('university_bank').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

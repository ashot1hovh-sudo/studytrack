import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { SHORTLIST_ITEM_COLUMNS, serializeShortlistItem } from '@/lib/universityBank'

async function touchShortlist(admin: ReturnType<typeof createAdminClient>, shortlistId: string) {
  if (!admin) return
  await admin
    .from('student_shortlists')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', shortlistId)
}

// POST /api/admin/shortlists/[id]/items — add a bank record to the shortlist
// as a SNAPSHOT. The snapshot is read server-side from the bank row so the
// stored copy is authoritative, not whatever the client happened to hold.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const shortlistId = params.id
  const body = await request.json().catch(() => null)
  const bankId = Number(body?.bankId)

  if (!Number.isFinite(bankId)) {
    return NextResponse.json({ error: 'Нужен bankId' }, { status: 400 })
  }

  // Make sure the shortlist exists (FK would catch it, but a clean 404 is nicer).
  const { data: shortlist, error: shortlistError } = await admin
    .from('student_shortlists')
    .select('id')
    .eq('id', shortlistId)
    .maybeSingle()

  if (shortlistError) return NextResponse.json({ error: shortlistError.message }, { status: 500 })
  if (!shortlist) return NextResponse.json({ error: 'Шорт-лист не найден' }, { status: 404 })

  const { data: bank, error: bankError } = await admin
    .from('university_bank')
    .select('id,university_name,program,city,link,arwu,china_rank,tuition,exam_requirements,deadline,dorm_cost,notes')
    .eq('id', bankId)
    .maybeSingle()

  if (bankError) return NextResponse.json({ error: bankError.message }, { status: 500 })
  if (!bank) return NextResponse.json({ error: 'Запись в базе не найдена' }, { status: 404 })

  // Don't add the same bank row twice to one shortlist.
  const { data: existing, error: existingError } = await admin
    .from('shortlist_items')
    .select('id')
    .eq('shortlist_id', shortlistId)
    .eq('bank_id', bankId)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
  if (existing) {
    return NextResponse.json({ error: 'Уже в этом шорт-листе' }, { status: 409 })
  }

  const snapshot = {
    shortlist_id: shortlistId,
    bank_id: bank.id,
    university_name: bank.university_name,
    program: bank.program,
    city: bank.city,
    link: bank.link,
    arwu: bank.arwu,
    china_rank: bank.china_rank,
    tuition: bank.tuition,
    exam_requirements: bank.exam_requirements,
    deadline: bank.deadline,
    dorm_cost: bank.dorm_cost,
    notes: bank.notes,
  }

  const { data, error } = await admin
    .from('shortlist_items')
    .insert(snapshot)
    .select(SHORTLIST_ITEM_COLUMNS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await touchShortlist(admin, shortlistId)

  return NextResponse.json({ item: serializeShortlistItem(data) }, { status: 201 })
}

// DELETE /api/admin/shortlists/[id]/items?itemId=<id> — remove one item.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const itemId = Number(new URL(request.url).searchParams.get('itemId'))
  if (!Number.isFinite(itemId)) {
    return NextResponse.json({ error: 'Нужен itemId' }, { status: 400 })
  }

  const { error } = await admin
    .from('shortlist_items')
    .delete()
    .eq('id', itemId)
    .eq('shortlist_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await touchShortlist(admin, params.id)

  return NextResponse.json({ ok: true })
}

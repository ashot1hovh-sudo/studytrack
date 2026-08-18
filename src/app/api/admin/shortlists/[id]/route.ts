import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { SHORTLIST_ITEM_COLUMNS, serializeShortlistItem } from '@/lib/universityBank'

// GET /api/admin/shortlists/[id] — one shortlist plus its (snapshot) items.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const { data: shortlist, error } = await admin
    .from('student_shortlists')
    .select('id,student_name,parent_name,created_by,created_at,updated_at')
    .eq('id', params.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!shortlist) return NextResponse.json({ error: 'Шорт-лист не найден' }, { status: 404 })

  const { data: items, error: itemsError } = await admin
    .from('shortlist_items')
    .select(SHORTLIST_ITEM_COLUMNS)
    .eq('shortlist_id', params.id)
    .order('added_at', { ascending: true })

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  return NextResponse.json({
    shortlist: {
      id: shortlist.id,
      studentName: shortlist.student_name,
      parentName: shortlist.parent_name,
      createdBy: shortlist.created_by,
      createdAt: shortlist.created_at,
      updatedAt: shortlist.updated_at,
    },
    items: (items ?? []).map(serializeShortlistItem),
  })
}

// PATCH /api/admin/shortlists/[id] — rename student / parent.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const updates: Record<string, string | null> = {}

  if ('studentName' in (body ?? {})) {
    const name = String(body.studentName ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Имя студента не может быть пустым' }, { status: 400 })
    updates.student_name = name
  }
  if ('parentName' in (body ?? {})) {
    const parent = String(body.parentName ?? '').trim()
    updates.parent_name = parent || null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await admin
    .from('student_shortlists')
    .update(updates)
    .eq('id', params.id)
    .select('id,student_name,parent_name,created_by,created_at,updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    shortlist: {
      id: data.id,
      studentName: data.student_name,
      parentName: data.parent_name,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    },
  })
}

// DELETE /api/admin/shortlists/[id] — remove the shortlist and its items
// (shortlist_items cascades on the FK).
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const { error } = await admin.from('student_shortlists').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

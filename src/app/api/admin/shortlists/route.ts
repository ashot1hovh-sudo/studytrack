import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'

type ShortlistRow = {
  id: string
  student_name: string
  parent_name: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// GET /api/admin/shortlists — list all shortlists with their item counts.
export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const { data: shortlists, error } = await admin
    .from('student_shortlists')
    .select('id,student_name,parent_name,created_by,created_at,updated_at')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (shortlists ?? []).map((s: ShortlistRow) => s.id)
  const counts = new Map<string, number>()

  if (ids.length > 0) {
    const { data: items, error: itemsError } = await admin
      .from('shortlist_items')
      .select('shortlist_id')
      .in('shortlist_id', ids)

    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

    for (const item of items ?? []) {
      const key = (item as { shortlist_id: string }).shortlist_id
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }

  return NextResponse.json({
    shortlists: (shortlists ?? []).map((s: ShortlistRow) => ({
      id: s.id,
      studentName: s.student_name,
      parentName: s.parent_name,
      createdBy: s.created_by,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      itemCount: counts.get(s.id) ?? 0,
    })),
  })
}

// POST /api/admin/shortlists — create a shortlist for a student.
export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const studentName = String(body?.studentName ?? '').trim()
  const parentName = String(body?.parentName ?? '').trim()
  const createdBy = String(body?.createdBy ?? '').trim()

  if (!studentName) {
    return NextResponse.json({ error: 'Укажите имя студента' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('student_shortlists')
    .insert({
      student_name: studentName,
      parent_name: parentName || null,
      created_by: createdBy || null,
    })
    .select('id,student_name,parent_name,created_by,created_at,updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    {
      shortlist: {
        id: data.id,
        studentName: data.student_name,
        parentName: data.parent_name,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        itemCount: 0,
      },
    },
    { status: 201 }
  )
}

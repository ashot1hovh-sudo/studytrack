import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { serializeClientUniversity } from '@/lib/crm'

// POST /api/crm/clients/[id]/universities — add a university to a client.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const universityName = String(body?.universityName ?? '').trim()
  if (!universityName) return NextResponse.json({ error: 'Нужно название вуза' }, { status: 400 })

  const program = String(body?.program ?? '').trim() || null
  const source = body?.universitySource === 'manual' ? 'manual' : 'explorer'

  // Skip if this exact university is already on the client.
  const { data: existing } = await admin
    .from('crm_client_universities')
    .select('id')
    .eq('client_id', params.id)
    .ilike('university_name', universityName)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Этот вуз уже добавлен' }, { status: 409 })
  }

  const { data, error } = await admin
    .from('crm_client_universities')
    .insert({ client_id: params.id, university_name: universityName, program, university_source: source })
    .select('id,client_id,university_name,program,university_source,added_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Touch the client so its updated_at (and list ordering) stays fresh.
  await admin.from('crm_clients').update({ updated_at: new Date().toISOString() }).eq('id', params.id)

  return NextResponse.json({ university: serializeClientUniversity(data) }, { status: 201 })
}

// DELETE /api/crm/clients/[id]/universities?uniId=<id> — remove one university.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const uniId = Number(new URL(request.url).searchParams.get('uniId'))
  if (!Number.isFinite(uniId)) return NextResponse.json({ error: 'Нужен uniId' }, { status: 400 })

  const { error } = await admin
    .from('crm_client_universities')
    .delete()
    .eq('id', uniId)
    .eq('client_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('crm_clients').update({ updated_at: new Date().toISOString() }).eq('id', params.id)

  return NextResponse.json({ ok: true })
}

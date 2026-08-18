import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { CLIENT_COLUMNS, CLIENT_FIELD_MAP, serializeClient, serializeClientUniversity } from '@/lib/crm'

// PATCH /api/crm/clients/[id] — update core fields and/or the full blocks array.
// The client sends whatever changed; blocks round-trip as one owned object
// (matches the prototype — no server-side per-block diffing).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const [key, column] of Object.entries(CLIENT_FIELD_MAP)) {
    if (!(key in body)) continue
    const value = (body as Record<string, unknown>)[key]

    if (key === 'blocks') {
      updates[column] = Array.isArray(value) ? value : []
    } else if (key === 'anketaDone') {
      updates[column] = !!value
    } else if (key === 'name') {
      const name = String(value ?? '').trim()
      if (!name) return NextResponse.json({ error: 'Имя не может быть пустым' }, { status: 400 })
      updates[column] = name
    } else if (value === null || value === '') {
      // stage/program are NOT NULL — never null them; other fields may clear.
      updates[column] = column === 'stage' || column === 'program' ? undefined : null
      if (updates[column] === undefined) delete updates[column]
    } else {
      updates[column] = String(value)
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('crm_clients')
    .update(updates)
    .eq('id', params.id)
    .select(CLIENT_COLUMNS)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return the client with its universities so client state stays consistent.
  const { data: unis } = await admin
    .from('crm_client_universities')
    .select('id,client_id,university_name,program,university_source,added_at')
    .eq('client_id', params.id)
    .order('added_at', { ascending: true })

  return NextResponse.json({ client: serializeClient(data, (unis ?? []).map(serializeClientUniversity)) })
}

// DELETE /api/crm/clients/[id] — remove a client (universities cascade).
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const { error } = await admin.from('crm_clients').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

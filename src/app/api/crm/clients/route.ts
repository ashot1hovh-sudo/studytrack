import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CLIENT_COLUMNS,
  autoDeadlineIso,
  defaultBlocks,
  serializeClient,
  serializeClientUniversity,
  type CrmClientUniversity,
} from '@/lib/crm'

// GET /api/crm/clients — every client with its universities + blocks.
export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const { data: clients, error } = await admin
    .from('crm_clients')
    .select(CLIENT_COLUMNS)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = (clients ?? []).map((c: any) => c.id)
  const byClient = new Map<string, CrmClientUniversity[]>()

  if (ids.length > 0) {
    const { data: unis, error: uniError } = await admin
      .from('crm_client_universities')
      .select('id,client_id,university_name,program,university_source,added_at')
      .in('client_id', ids)
      .order('added_at', { ascending: true })

    if (uniError) return NextResponse.json({ error: uniError.message }, { status: 500 })

    for (const row of unis ?? []) {
      const key = (row as any).client_id as string
      if (!byClient.has(key)) byClient.set(key, [])
      byClient.get(key)!.push(serializeClientUniversity(row))
    }
  }

  return NextResponse.json({
    clients: (clients ?? []).map((c: any) => serializeClient(c, byClient.get(c.id) ?? [])),
  })
}

// POST /api/crm/clients — create a client, seeded with the 4 default blocks.
export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { user, response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const name = String(body?.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Укажите имя студента' }, { status: 400 })

  const record = {
    name,
    parent_name: String(body?.parentName ?? '').trim() || null,
    telegram_id: String(body?.telegramId ?? '').trim() || null,
    stage: 'anketa',
    // New client starts in «Анкета отправлена» with an automatic 10-day timer.
    stage_deadline: autoDeadlineIso('anketa'),
    program: 'bachelor',
    blocks: defaultBlocks(),
    created_by: user?.id ?? null,
  }

  const { data, error } = await admin.from('crm_clients').insert(record).select(CLIENT_COLUMNS).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ client: serializeClient(data, []) }, { status: 201 })
}

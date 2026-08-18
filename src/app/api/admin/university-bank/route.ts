import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { BANK_COLUMNS, serializeBankRow } from '@/lib/universityBank'

// GET /api/admin/university-bank?q=<search>
// Returns bank rows, optionally filtered by university / program / city.
export async function GET(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''

  let query = admin.from('university_bank').select(BANK_COLUMNS)

  if (q) {
    // Escape PostgREST's `or` metacharacters so a stray comma/paren in the
    // query can't break out of the filter expression.
    const safe = q.replace(/[,()*]/g, ' ')
    query = query.or(
      `university_name.ilike.%${safe}%,program.ilike.%${safe}%,city.ilike.%${safe}%`
    )
  }

  const { data, error } = await query.order('university_name', { ascending: true }).limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ records: (data ?? []).map(serializeBankRow) })
}

// POST /api/admin/university-bank — create a new bank record.
export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  const universityName = String(body?.universityName ?? '').trim()
  const program = String(body?.program ?? '').trim()

  if (!universityName || !program) {
    return NextResponse.json({ error: 'Университет и программа обязательны' }, { status: 400 })
  }

  const str = (value: unknown) => {
    const s = String(value ?? '').trim()
    return s === '' ? null : s
  }

  const record = {
    university_name: universityName,
    program,
    city: str(body?.city),
    link: str(body?.link),
    arwu: str(body?.arwu),
    china_rank: str(body?.chinaRank),
    tuition: str(body?.tuition),
    exam_requirements: str(body?.examRequirements),
    deadline: str(body?.deadline),
    dorm_cost: str(body?.dormCost),
    notes: str(body?.notes),
    verified_by: str(body?.verifiedBy),
    verified_at: new Date().toISOString(),
  }

  const { data, error } = await admin
    .from('university_bank')
    .insert(record)
    .select(BANK_COLUMNS)
    .single()

  if (error) {
    // Unique index on (lower(university_name), lower(program)).
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Такой вуз с этой программой уже есть в базе.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ record: serializeBankRow(data) }, { status: 201 })
}

import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { BadRequestError, getLkStore, NotFoundError, toPublic } from '@/lib/lk/store'
import { buildDemoLk } from '@/lib/lk/demo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Whose ЛК: your own, or (consultant only) any student's via ?student=<id>,
 * which is how Iana sees exactly what the family sees.
 */
async function resolveTarget(request: Request) {
  const { user, response } = await getAuthenticatedUser()
  if (response) return { response }
  const admin = createAdminClient()
  if (!admin) return { response: NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing' }, { status: 500 }) }

  const { data: me } = await admin.from('students').select('id,role').eq('id', user.id).maybeSingle()
  const asked = new URL(request.url).searchParams.get('student')
  const isConsultant = me?.role === 'consultant'
  if (asked && !isConsultant) return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  if (!asked && isConsultant) return { response: NextResponse.json({ error: 'Откройте ЛК студента из админки', code: 'choose_student' }, { status: 400 }) }
  return { admin, studentId: asked ?? user.id, preview: !!asked }
}

// GET /api/lk: the family's ЛК.
export async function GET(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const t = await resolveTarget(request)
  if (t.response) return t.response

  const { data: profile } = await t.admin.from('students').select('id,full_name,service_type').eq('id', t.studentId).maybeSingle()
  if (!profile) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Without сопровождение the family gets a demo built from their «Вузы» tracker.
  // A consultant's preview always shows the real ЛК.
  if (profile.service_type !== 'premium' && !t.preview) {
    const { data: tracker } = await t.admin.from('universities').select('name,city,major,deadline').eq('student_id', t.studentId).order('order_index', { ascending: true })
    return NextResponse.json({
      preview: false,
      demo: true,
      student: { id: profile.id, fullName: profile.full_name },
      lk: toPublic(await buildDemoLk(profile.id, tracker ?? [])),
    })
  }

  return NextResponse.json({
    preview: t.preview,
    student: { id: profile.id, fullName: profile.full_name },
    lk: toPublic(await getLkStore().get(t.studentId)),
  })
}

// POST { action: 'stage', uniId, itemId, stage } | { action: 'password', uniId }
// uniId 'common' (COMMON_ID) = the checklist shared by all universities.
// A consultant's preview can reveal passwords but never moves anything.
export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const t = await resolveTarget(request)
  if (t.response) return t.response
  const body = await request.json().catch(() => null)
  const store = getLkStore()

  if (!t.preview) {
    const { data: me } = await t.admin.from('students').select('service_type').eq('id', t.studentId).maybeSingle()
    if (me?.service_type !== 'premium') return NextResponse.json({ error: 'Демо-версия: изменения не сохраняются' }, { status: 403 })
  }

  try {
    if (body?.action === 'password' && typeof body.uniId === 'string') {
      return NextResponse.json({ password: await store.getPassword(t.studentId, body.uniId) }, { headers: { 'Cache-Control': 'no-store' } })
    }
    if (body?.action === 'stage' && typeof body.uniId === 'string' && typeof body.itemId === 'string' && typeof body.stage === 'string') {
      if (t.preview) return NextResponse.json({ error: 'В режиме просмотра изменения не сохраняются' }, { status: 403 })
      return NextResponse.json({ lk: toPublic(await store.familyStage(t.studentId, body.uniId, body.itemId, body.stage)) })
    }
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 })
    if (err instanceof BadRequestError) return NextResponse.json({ error: err.message }, { status: 400 })
    throw err
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

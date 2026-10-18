import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { normalizeInternal, normalizeItems, normalizePayments, normalizeProfile, normalizeUni, strOrNull } from '@/lib/lk/normalize'
import { MissingSecretKeyError } from '@/lib/lk/secret'
import { getLkStore, NotFoundError, toPublic } from '@/lib/lk/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/admin/lk/:studentId: the student's ЛК with internal notes, passwords replaced by hasPassword.
export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response
  return NextResponse.json({ lk: toPublic(await getLkStore().get(params.studentId), { internal: true }) })
}

// POST { action: 'subtitle', subtitle }
//    | { action: 'profile', profile: { track, major } }
//    | { action: 'payments', payments: { total, entries: [{ id?, date, amount, note }] } }
//    | { action: 'internal', internal: { budget, telegram, notes } }
//    | { action: 'add', uni }
//    | { action: 'save', uni, base, password? }   password: omitted = keep, '' = clear
//    | { action: 'common', items, base }           the checklist shared by all universities
//    | { action: 'delete', id } | { action: 'move', id, dir: -1 | 1 }
//    | { action: 'password', id }                  reveal for Iana
export async function POST(request: Request, { params }: { params: { studentId: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response

  const body = await request.json().catch(() => null)
  const store = getLkStore()
  const sid = params.studentId
  const ok = async (p: Promise<Parameters<typeof toPublic>[0]>) => NextResponse.json({ lk: toPublic(await p, { internal: true }) })

  try {
    switch (body?.action) {
      case 'subtitle':
        return ok(store.setSubtitle(sid, strOrNull(body.subtitle, 120)))
      case 'profile': {
        const p = normalizeProfile(body.profile)
        return ok(store.setProfile(sid, { track: p.track, major: p.major }))
      }
      case 'payments':
        return ok(store.setPayments(sid, normalizePayments(body.payments)))
      case 'internal':
        return ok(store.setInternal(sid, normalizeInternal(body.internal)))
      case 'add':
        return ok(store.addUni(sid, normalizeUni({ ...body.uni, id: undefined })))
      case 'save': {
        if (typeof body.uni?.id !== 'string') return NextResponse.json({ error: 'uni.id required' }, { status: 400 })
        const password = typeof body.password === 'string' ? body.password.slice(0, 200) : undefined
        return ok(store.saveUni(sid, normalizeUni(body.uni), body.base ? normalizeUni(body.base) : null, password))
      }
      case 'common':
        return ok(store.saveCommon(sid, normalizeItems(body.items), Array.isArray(body.base) ? normalizeItems(body.base) : null))
      case 'delete':
        if (typeof body.id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })
        return ok(store.deleteUni(sid, body.id))
      case 'move':
        if (typeof body.id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })
        return ok(store.moveUni(sid, body.id, body.dir === -1 ? -1 : 1))
      case 'password':
        if (typeof body.id !== 'string') return NextResponse.json({ error: 'id required' }, { status: 400 })
        return NextResponse.json({ password: await store.getPassword(sid, body.id) }, { headers: { 'Cache-Control': 'no-store' } })
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 })
    if (err instanceof MissingSecretKeyError) return NextResponse.json({ error: err.message }, { status: 500 })
    throw err
  }
}

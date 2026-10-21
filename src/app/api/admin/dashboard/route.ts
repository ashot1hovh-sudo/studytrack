import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { getLkStore, toPublic } from '@/lib/lk/store'
import type { LkDataPublic } from '@/lib/lk/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/admin/dashboard: every student's ЛК for Iana's dashboard, with her
// internal fields and the change log. Read-only; names and emails come from
// /api/admin/students, which the admin page has already loaded.
export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response
  const all = await getLkStore().all()
  const lk: Record<string, LkDataPublic> = Object.fromEntries(
    Object.entries(all).map(([id, d]) => [id, toPublic(d, { internal: true })]),
  )
  return NextResponse.json({ lk, at: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
}

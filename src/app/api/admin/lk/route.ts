import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { getLkStore } from '@/lib/lk/store'
import { progressAll, type LkCard } from '@/lib/lk/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/admin/lk: what Iana's student cards show, for every student with a ЛК.
export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response
  const all = await getLkStore().all()
  const cards: Record<string, LkCard> = Object.fromEntries(
    Object.entries(all).map(([id, d]) => [id, { ...d.profile, unis: d.unis.length, progress: progressAll(d) }]),
  )
  return NextResponse.json({ cards })
}

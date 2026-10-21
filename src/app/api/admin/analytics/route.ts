import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { analyticsData } from '@/lib/analytics/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/admin/analytics?days=30: views for the period, plus every tracked
// university and every account, for the admin «Аналитика» page. All the
// numbers are worked out in the browser. Consultant only.
export async function GET(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response

  const days = Number(new URL(request.url).searchParams.get('days'))
  const since = Number.isFinite(days) && days > 0 ? new Date(Date.now() - days * 86400000).toISOString() : null
  try {
    const data = await analyticsData(since)
    return NextResponse.json({ ...data, since, at: new Date().toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('analytics: read failed', e)
    return NextResponse.json({ error: 'Не удалось загрузить аналитику' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { parsePing, recordPing } from '@/lib/analytics/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/analytics: the student app reports time on a section or lesson,
// or a click on something locked (src/lib/analytics/tracker.ts).
export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { user, response } = await getAuthenticatedUser()
  if (response || !user) return response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ping = parsePing(await request.json().catch(() => null))
  if (!ping) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  try {
    await recordPing(user.id, ping)
  } catch (e) {
    console.error('analytics: record failed', e)
    return NextResponse.json({ error: 'Not saved' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}

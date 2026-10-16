import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { getLkCatalog } from '@/lib/lk/catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/admin/lk/catalog: universities Iana can pick in the ЛК editor.
export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()
  const { response } = await getConsultantUser()
  if (response) return response
  return NextResponse.json({ universities: await getLkCatalog() })
}

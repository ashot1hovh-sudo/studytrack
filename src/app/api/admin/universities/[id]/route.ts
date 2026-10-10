import { NextResponse } from 'next/server'
import { formatRuDate, getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response
  // Service-role client after the consultant check: the live database has no
  // consultant INSERT policy on universities, so writes through the
  // consultant's own session failed with an RLS error.
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })

  const { name, status, deadline, portalUrl, consultantNote } = await request.json()

  const { data, error } = await supabase
    .from('universities')
    .update({
      name,
      status,
      deadline: deadline || null,
      portal_url: portalUrl || null,
      consultant_note: consultantNote || null,
    })
    .eq('id', params.id)
    .select('id,name,status,deadline,portal_url,consultant_note')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    university: {
      id: data.id,
      name: data.name,
      status: data.status,
      deadline: formatRuDate(data.deadline),
      rawDeadline: data.deadline,
      portalUrl: data.portal_url ?? '',
      consultantNote: data.consultant_note ?? '',
    },
  })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response
  // Service-role client after the consultant check: the live database has no
  // consultant INSERT policy on universities, so writes through the
  // consultant's own session failed with an RLS error.
  const supabase = createAdminClient()
  if (!supabase) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })

  const { error } = await supabase.from('universities').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

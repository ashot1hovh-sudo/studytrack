import { NextResponse } from 'next/server'
import { formatRuDate, getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, response } = await getConsultantUser()
  if (response) return response

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

  const { supabase, response } = await getConsultantUser()
  if (response) return response

  const { error } = await supabase.from('universities').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { formatRuDate, getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function GET(_request: Request, { params }: { params: { studentId: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, response } = await getConsultantUser()
  if (response) return response

  const { data, error } = await supabase
    .from('universities')
    .select('id,name,status,deadline,portal_url,consultant_note')
    .eq('student_id', params.studentId)
    .order('order_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    universities: (data ?? []).map((university) => ({
      id: university.id,
      name: university.name,
      status: university.status,
      deadline: formatRuDate(university.deadline),
      rawDeadline: university.deadline,
      portalUrl: university.portal_url ?? '',
      consultantNote: university.consultant_note ?? '',
    })),
  })
}

export async function POST(request: Request, { params }: { params: { studentId: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, response } = await getConsultantUser()
  if (response) return response

  const { name, status, deadline, portalUrl, consultantNote } = await request.json()

  if (!name) {
    return NextResponse.json({ error: 'Название вуза обязательно' }, { status: 400 })
  }

  const { data: maxOrder } = await supabase
    .from('universities')
    .select('order_index')
    .eq('student_id', params.studentId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('universities')
    .insert({
      student_id: params.studentId,
      name,
      status: status || 'planned',
      deadline: deadline || null,
      portal_url: portalUrl || null,
      consultant_note: consultantNote || null,
      order_index: (maxOrder?.order_index ?? 0) + 1,
    })
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

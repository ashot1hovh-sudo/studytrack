import { NextResponse } from 'next/server'
import { formatRuDate, getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const { data, error } = await supabase
    .from('universities')
    .select('id,name,status,deadline,portal_url,consultant_note,university_history(event_date,event,order_index)')
    .eq('student_id', user.id)
    .order('order_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    universities: (data ?? []).map((university) => ({
      id: university.id,
      name: university.name,
      status: university.status,
      deadline: formatRuDate(university.deadline),
      portalUrl: university.portal_url ?? '',
      consultantNote: university.consultant_note ?? undefined,
      history: (university.university_history ?? [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((item) => ({ date: formatRuDate(item.event_date), event: item.event })),
    })),
  })
}

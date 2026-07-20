import { NextResponse } from 'next/server'
import { formatRuDate, getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncStudentDocuments } from '@/lib/studentDocuments'

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  let { data, error } = await supabase
    .from('universities')
    .select('id,name,status,deadline,portal_url,price,exam_requirements,city,major,consultant_note,university_history(event_date,event,order_index)')
    .eq('student_id', user.id)
    .order('order_index', { ascending: true })

  if (error?.message.includes('price') || error?.message.includes('exam_requirements') || error?.message.includes('city') || error?.message.includes('major')) {
    const fallback = await supabase
      .from('universities')
      .select('id,name,status,deadline,portal_url,consultant_note,university_history(event_date,event,order_index)')
      .eq('student_id', user.id)
      .order('order_index', { ascending: true })

    data = fallback.data?.map((university) => ({
      ...university,
      price: null,
      exam_requirements: null,
      city: null,
      major: null,
    })) ?? null
    error = fallback.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    universities: (data ?? []).map((university) => ({
      id: university.id,
      name: university.name,
      status: university.status,
      deadline: formatRuDate(university.deadline),
      rawDeadline: university.deadline,
      portalUrl: university.portal_url ?? '',
      price: university.price ?? null,
      examRequirements: university.exam_requirements ?? null,
      city: university.city ?? null,
      major: university.major ?? null,
      consultantNote: university.consultant_note ?? undefined,
      history: (university.university_history ?? [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((item) => ({ date: formatRuDate(item.event_date), event: item.event })),
    })),
  })
}

export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })

  const { name, deadline, price, examRequirements, city, major, portalUrl } = await request.json()
  if (!name) return NextResponse.json({ error: 'Название вуза обязательно' }, { status: 400 })

  const { data: maxOrder } = await supabase
    .from('universities')
    .select('order_index')
    .eq('student_id', user.id)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await admin
    .from('universities')
    .insert({
      student_id: user.id,
      name,
      status: 'planned',
      deadline: deadline || null,
      price: price || null,
      exam_requirements: examRequirements || null,
      city: city || null,
      major: major || null,
      portal_url: portalUrl || null,
      order_index: (maxOrder?.order_index ?? 0) + 1,
    })
    .select('id,name,status,deadline,portal_url,price,exam_requirements,city,major,consultant_note')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Seed the standard document checklist and reschedule it around the new
  // deadline. Deliberately not fatal: the university was created, and failing
  // the whole request over the checklist would lose that.
  const sync = await syncStudentDocuments(admin, user.id)

  return NextResponse.json({
    documentsChanged: !sync.error,
    university: {
      id: data.id,
      name: data.name,
      status: data.status,
      deadline: formatRuDate(data.deadline),
      rawDeadline: data.deadline,
      portalUrl: data.portal_url ?? '',
      price: data.price ?? null,
      examRequirements: data.exam_requirements ?? null,
      city: data.city ?? null,
      major: data.major ?? null,
      consultantNote: data.consultant_note ?? undefined,
      history: [],
    },
  })
}

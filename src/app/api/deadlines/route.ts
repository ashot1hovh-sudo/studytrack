import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse, splitDeadlineDate } from '@/lib/api'

function isUpcoming(value?: string | null) {
  if (!value) return false
  const date = new Date(`${value}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date >= today
}

function isUrgent(value: string) {
  const date = new Date(`${value}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntil >= 0 && daysUntil <= 14
}

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const [
    { data: manualDeadlines, error: manualError },
    { data: documents, error: documentsError },
    { data: universities, error: universitiesError },
  ] = await Promise.all([
    supabase
      .from('deadlines')
      .select('id,title,date,university_name,context,is_urgent')
      .eq('student_id', user.id),
    supabase
      .from('documents')
      .select('id,name,deadline,status')
      .eq('student_id', user.id)
      .neq('status', 'completed'),
    supabase
      .from('universities')
      .select('id,name,deadline,status')
      .eq('student_id', user.id),
  ])

  const error = manualError ?? documentsError ?? universitiesError
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = [
    ...(manualDeadlines ?? []).filter((deadline) => isUpcoming(deadline.date)).map((deadline) => ({
      id: Number(deadline.id),
      dateValue: deadline.date,
      title: deadline.title,
      university: deadline.university_name,
      context: deadline.context ?? '',
      isUrgent: deadline.is_urgent,
    })),
    ...(documents ?? []).filter((document) => isUpcoming(document.deadline)).map((document) => ({
      id: 100000 + Number(document.id),
      dateValue: document.deadline!,
      title: document.name,
      university: 'Документы',
      context: 'Загрузить документ до дедлайна.',
      isUrgent: isUrgent(document.deadline!),
    })),
    ...(universities ?? [])
      .filter((university) => university.status !== 'enrolled' && university.status !== 'rejected')
      .filter((university) => isUpcoming(university.deadline))
      .map((university) => ({
        id: 200000 + Number(university.id),
        dateValue: university.deadline!,
        title: university.name,
        university: 'Заявка в вуз',
        context: 'Дедлайн подачи или обновления заявки.',
        isUrgent: isUrgent(university.deadline!),
      })),
  ].sort((a, b) => a.dateValue.localeCompare(b.dateValue))

  return NextResponse.json({
    deadlines: rows.map((deadline) => ({
      id: deadline.id,
      ...splitDeadlineDate(deadline.dateValue),
      title: deadline.title,
      university: deadline.university,
      context: deadline.context,
      isUrgent: deadline.isUrgent,
    })),
  })
}

import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse, splitDeadlineDate } from '@/lib/api'
import { TEMPLATES_BY_KEY } from '@/lib/documentTemplates'

export type DeadlineKind = 'document' | 'university' | 'interview' | 'exam' | 'custom'

/** Kinds a student may create. Document and university dates come from their own sections. */
const CREATABLE_KINDS = ['interview', 'exam', 'custom'] as const

function hasDate(value?: string | null): value is string {
  return Boolean(value)
}

/**
 * Past due.
 *
 * These used to be filtered out entirely, which meant a student who had fallen
 * behind saw an empty calendar — the emptiest it ever looks is exactly when
 * they are most behind. Overdue items are now kept and shown first.
 */
function isOverdue(value: string) {
  const date = new Date(`${value}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
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
      .select('id,title,date,university_name,context,is_urgent,kind')
      .eq('student_id', user.id),
    supabase
      .from('documents')
      .select('id,name,deadline,status,template_key,lead_time_days,universities(name)')
      .eq('student_id', user.id)
      .neq('status', 'completed')
      // Soft-deleted standard documents must not reappear as deadlines.
      .is('deleted_at', null),
    supabase
      .from('universities')
      .select('id,name,deadline,status')
      .eq('student_id', user.id),
  ])

  const error = manualError ?? documentsError ?? universitiesError
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = [
    ...(manualDeadlines ?? []).filter((deadline) => hasDate(deadline.date)).map((deadline) => ({
      id: Number(deadline.id),
      dateValue: deadline.date,
      title: deadline.title,
      university: deadline.university_name,
      context: deadline.context ?? '',
      isUrgent: deadline.is_urgent,
      isOverdue: isOverdue(deadline.date),
      kind: (deadline.kind ?? 'custom') as DeadlineKind,
      // Only student-created rows can be removed from the calendar; a document
      // or university date is deleted at its source, not here.
      canDelete: true,
    })),
    ...(documents ?? []).filter((document) => hasDate(document.deadline)).map((document) => {
      const template = document.template_key ? TEMPLATES_BY_KEY.get(document.template_key) : undefined
      // Many-to-one embeds come back as an object, not an array.
      const target = Array.isArray(document.universities)
        ? document.universities[0]
        : document.universities

      return {
        id: 100000 + Number(document.id),
        dateValue: document.deadline!,
        title: document.name,
        // Per-university documents are named identically across universities —
        // two «Мотивационное письмо» rows are indistinguishable without this.
        university: target?.name ? `Документы · ${target.name}` : 'Документы',
        // The catalogue hint explains *why* the date is what it is, which is
        // the whole point of a lead time. Falls back for hand-added documents.
        context: template?.hint ?? 'Подготовить документ до дедлайна.',
        isUrgent: isUrgent(document.deadline!),
        isOverdue: isOverdue(document.deadline!),
        kind: 'document' as DeadlineKind,
        canDelete: false,
      }
    }),
    ...(universities ?? [])
      .filter((university) => university.status !== 'enrolled' && university.status !== 'rejected')
      .filter((university) => hasDate(university.deadline))
      .map((university) => ({
        id: 200000 + Number(university.id),
        dateValue: university.deadline!,
        title: university.name,
        university: 'Заявка в вуз',
        context: 'Дедлайн подачи или обновления заявки.',
        isUrgent: isUrgent(university.deadline!),
        isOverdue: isOverdue(university.deadline!),
        kind: 'university' as DeadlineKind,
        canDelete: false,
      })),
  ].sort((a, b) => {
    // Overdue first — they need action today, whatever their date says.
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    return a.dateValue.localeCompare(b.dateValue)
  })

  return NextResponse.json({
    deadlines: rows.map((deadline) => ({
      id: deadline.id,
      ...splitDeadlineDate(deadline.dateValue),
      // The calendar needs to group by day, which the split display fields
      // (date/month) can't express.
      dateValue: deadline.dateValue,
      title: deadline.title,
      university: deadline.university,
      context: deadline.context,
      isUrgent: deadline.isUrgent,
      isOverdue: deadline.isOverdue,
      kind: deadline.kind,
      canDelete: deadline.canDelete,
    })),
  })
}

/**
 * Adds a student-created calendar event — собеседование, экзамен, or anything
 * else they want to track alongside the derived document/university dates.
 */
export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const body = await request.json().catch(() => null)
  const title = String(body?.title ?? '').trim()
  const date = String(body?.date ?? '').trim()
  const kind = String(body?.kind ?? 'custom')
  const universityName = String(body?.universityName ?? '').trim()
  const context = String(body?.context ?? '').trim()

  if (!title) return NextResponse.json({ error: 'Название обязательно' }, { status: 400 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Укажите дату' }, { status: 400 })
  }
  if (!CREATABLE_KINDS.includes(kind as (typeof CREATABLE_KINDS)[number])) {
    return NextResponse.json({ error: 'Неизвестный тип события' }, { status: 400 })
  }

  // .select() so an RLS rejection surfaces as an error instead of a cheerful
  // 200 over an insert that wrote nothing.
  const { data, error } = await supabase
    .from('deadlines')
    .insert({
      student_id: user.id,
      title,
      date,
      kind,
      // university_name is NOT NULL on this table and predates free-form events.
      university_name: universityName || (kind === 'interview' ? 'Собеседование' : kind === 'exam' ? 'Экзамен' : 'Моё событие'),
      context: context || null,
      is_urgent: false,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) {
    return NextResponse.json({ error: 'Событие не удалось создать' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import type { StageStatus } from '@/types/studytrack'

function makeStage(id: number, name: string, status: StageStatus, description: string) {
  return { id, name, status, description }
}

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const [
    { data: manualStages, error: stagesError },
    { data: documents, error: documentsError },
    { data: universities, error: universitiesError },
  ] = await Promise.all([
    supabase
      .from('roadmap_stages')
      .select('id,stage_name,status,description')
      .eq('student_id', user.id)
      .order('order_index', { ascending: true }),
    supabase
      .from('documents')
      .select('status')
      .eq('student_id', user.id),
    supabase
      .from('universities')
      .select('status')
      .eq('student_id', user.id),
  ])

  const error = stagesError ?? documentsError ?? universitiesError
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if ((manualStages ?? []).length > 0) {
    return NextResponse.json({
      stages: (manualStages ?? []).map((stage) => ({
        id: stage.id,
        name: stage.stage_name,
        status: stage.status,
        description: stage.description ?? '',
      })),
    })
  }

  const docs = documents ?? []
  const unis = universities ?? []
  const docsComplete = docs.length > 0 && docs.every((document) => document.status === 'completed')
  const hasUploadedDocs = docs.some((document) => document.status === 'uploaded' || document.status === 'completed')
  const hasApplications = unis.some((university) => university.status !== 'planned')
  const hasResponse = unis.some((university) => ['response', 'enrolled', 'rejected'].includes(university.status))
  const hasEnrollment = unis.some((university) => university.status === 'enrolled')

  const stages = [
    makeStage(
      1,
      'Подготовка документов',
      docsComplete ? 'completed' : 'current',
      hasUploadedDocs ? 'Документы загружаются и проверяются.' : 'Нужно загрузить первый пакет документов.'
    ),
    makeStage(
      2,
      'Подача заявок',
      hasApplications ? 'completed' : docsComplete ? 'current' : 'pending',
      docsComplete ? 'Можно подавать заявки в выбранные вузы.' : 'Этап откроется после готовности документов.'
    ),
    makeStage(
      3,
      'Ожидание ответов',
      hasResponse ? 'completed' : hasApplications ? 'current' : 'pending',
      hasApplications ? 'Заявки отправлены, ожидаем ответы.' : 'Этап начнется после подачи заявок.'
    ),
    makeStage(
      4,
      'Зачисление',
      hasEnrollment ? 'completed' : hasResponse ? 'current' : 'pending',
      hasResponse ? 'Проверяем ответы вузов и подтверждаем место.' : 'Этап начнется после ответа университета.'
    ),
    makeStage(
      5,
      'Виза и релокация',
      hasEnrollment ? 'current' : 'pending',
      hasEnrollment ? 'Следующий шаг: подготовка визы и переезда.' : 'Этап откроется после зачисления.'
    ),
  ]

  return NextResponse.json({ stages })
}

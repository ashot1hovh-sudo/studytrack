import { NextResponse } from 'next/server'
import { formatRuShortDate, getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { getStorageFileName } from '@/lib/documents'
import { createAdminClient } from '@/lib/supabase/admin'

function mapDocument(document: any) {
  return {
    id: document.id,
    name: document.name,
    status: document.status,
    deadline: formatRuShortDate(document.deadline),
    rawDeadline: document.deadline,
    fileUrl: document.file_url ?? undefined,
    fileName: getStorageFileName(document.file_url),
    uploadedAt: formatRuShortDate(document.uploaded_at),
    reviewComment: document.review_comment ?? '',
    reviewFileUrl: document.review_file_url ?? null,
    reviewFileName: getStorageFileName(document.review_file_url),
  }
}

export async function GET(_request: Request, { params }: { params: { studentId: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })

  const { data, error } = await admin
    .from('documents')
    .select('id,name,status,deadline,file_url,uploaded_at,review_comment,review_file_url,order_index')
    .eq('student_id', params.studentId)
    .order('order_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ documents: (data ?? []).map(mapDocument) })
}

export async function POST(request: Request, { params }: { params: { studentId: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })

  const { name, deadline, reviewComment } = await request.json()
  if (!name) return NextResponse.json({ error: 'Название документа обязательно' }, { status: 400 })

  const { data: maxOrder } = await admin
    .from('documents')
    .select('order_index')
    .eq('student_id', params.studentId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await admin
    .from('documents')
    .insert({
      student_id: params.studentId,
      name,
      status: 'not_started',
      deadline: deadline || null,
      review_comment: reviewComment || null,
      order_index: (maxOrder?.order_index ?? 0) + 1,
    })
    .select('id,name,status,deadline,file_url,uploaded_at,review_comment,review_file_url,order_index')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ document: mapDocument(data) })
}

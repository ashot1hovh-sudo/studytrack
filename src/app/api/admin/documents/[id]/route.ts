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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })

  const { name, status, deadline, reviewComment } = await request.json()

  const { data, error } = await admin
    .from('documents')
    .update({
      name,
      status,
      deadline: deadline || null,
      review_comment: reviewComment || null,
    })
    .eq('id', params.id)
    .select('id,name,status,deadline,file_url,uploaded_at,review_comment,review_file_url,order_index')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ document: mapDocument(data) })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { response } = await getConsultantUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })

  const { error } = await admin.from('documents').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

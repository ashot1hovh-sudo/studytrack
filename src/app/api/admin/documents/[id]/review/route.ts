import { NextResponse } from 'next/server'
import { formatRuShortDate, getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { getStorageFileName } from '@/lib/documents'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])

function safeFileName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, response } = await getConsultantUser()
  if (response) return response

  const contentType = request.headers.get('content-type') ?? ''
  let decision = ''
  let reviewComment = ''
  let reviewFile: File | null = null

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    decision = String(formData.get('decision') ?? '')
    reviewComment = String(formData.get('reviewComment') ?? '')
    const file = formData.get('reviewFile')
    reviewFile = file instanceof File && file.size > 0 ? file : null
  } else {
    const body = await request.json()
    decision = body.decision
    reviewComment = body.reviewComment ?? ''
  }

  const status = decision === 'approve' ? 'completed' : 'in_progress'

  if (!['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'Некорректное решение' }, { status: 400 })
  }

  const { data: existingDocument, error: existingError } = await supabase
    .from('documents')
    .select('id,student_id,review_file_url')
    .eq('id', params.id)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
  if (!existingDocument) return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })

  let reviewFileUrl: string | null | undefined

  if (reviewFile) {
    if (!ALLOWED_TYPES.has(reviewFile.type)) {
      return NextResponse.json({ error: 'Можно прикрепить только PDF, JPG или PNG' }, { status: 400 })
    }

    if (reviewFile.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Файл должен быть меньше 10 МБ' }, { status: 400 })
    }

    if (existingDocument.review_file_url) {
      await supabase.storage.from('documents').remove([existingDocument.review_file_url])
    }

    const filename = safeFileName(reviewFile.name) || 'review-file'
    reviewFileUrl = `${existingDocument.student_id}/${existingDocument.id}/review-${Date.now()}-${filename}`

    const { error: uploadError } = await supabase.storage.from('documents').upload(reviewFileUrl, reviewFile, {
      contentType: reviewFile.type,
      upsert: true,
    })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const updatePayload: Record<string, string | null> = {
    status,
    review_comment: reviewComment || null,
  }

  if (decision === 'approve') {
    updatePayload.review_file_url = null
  } else if (reviewFileUrl !== undefined) {
    updatePayload.review_file_url = reviewFileUrl
  }

  let { data: document, error } = await supabase
    .from('documents')
    .update(updatePayload)
    .eq('id', params.id)
    .select('id,name,status,deadline,file_url,uploaded_at,review_comment,review_file_url')
    .single()

  if (error?.message.includes('review_comment')) {
    const fallback = await supabase
      .from('documents')
      .update({ status })
      .eq('id', params.id)
      .select('id,name,status,deadline,file_url,uploaded_at')
      .single()

    document = fallback.data ? { ...fallback.data, review_comment: null, review_file_url: null } : null
    error = fallback.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!document) return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })

  return NextResponse.json({
    document: {
      id: document.id,
      name: document.name,
      status: document.status,
      deadline: formatRuShortDate(document.deadline),
      fileUrl: document.file_url,
      fileName: getStorageFileName(document.file_url),
      uploadedAt: formatRuShortDate(document.uploaded_at),
      reviewComment: document.review_comment,
      reviewFileUrl: document.review_file_url,
      reviewFileName: getStorageFileName(document.review_file_url),
    },
  })
}

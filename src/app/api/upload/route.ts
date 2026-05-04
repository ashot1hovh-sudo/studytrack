import { NextResponse } from 'next/server'
import { formatRuShortDate, getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
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

export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const formData = await request.formData()
  const documentId = String(formData.get('documentId') ?? '')
  const file = formData.get('file')

  if (!documentId) {
    return NextResponse.json({ error: 'Не выбран документ' }, { status: 400 })
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Не выбран файл' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Можно загрузить только PDF, JPG или PNG' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Файл должен быть меньше 10 МБ' }, { status: 400 })
  }

  const { data: document, error: documentError } = await supabase
    .from('documents')
    .select('id,name,file_url')
    .eq('id', documentId)
    .eq('student_id', user.id)
    .maybeSingle()

  if (documentError) {
    return NextResponse.json({ error: documentError.message }, { status: 500 })
  }

  if (!document) {
    return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
  }

  if (document.file_url) {
    await supabase.storage.from('documents').remove([document.file_url])
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'file'
  const filename = safeFileName(file.name) || `document.${extension}`
  const storagePath = `${user.id}/${document.id}/${Date.now()}-${filename}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    const message = uploadError.message.toLowerCase().includes('bucket not found')
      ? 'Storage bucket documents не найден. Запустите supabase-storage.sql в Supabase SQL Editor.'
      : uploadError.message

    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { data: updatedDocument, error: updateError } = await supabase
    .from('documents')
    .update({
      status: 'uploaded',
      file_url: storagePath,
      uploaded_at: new Date().toISOString(),
      review_comment: null,
    })
    .eq('id', document.id)
    .eq('student_id', user.id)
    .select('id,name,status,deadline,file_url,uploaded_at,review_comment')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    document: {
      id: updatedDocument.id,
      name: updatedDocument.name,
      status: updatedDocument.status,
      deadline: formatRuShortDate(updatedDocument.deadline),
      fileUrl: updatedDocument.file_url,
      fileName: getStorageFileName(updatedDocument.file_url),
      uploadedAt: formatRuShortDate(updatedDocument.uploaded_at),
      reviewComment: updatedDocument.review_comment,
    },
  })
}

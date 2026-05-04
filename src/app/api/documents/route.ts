import { NextResponse } from 'next/server'
import { formatRuShortDate, getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { getStorageFileName } from '@/lib/documents'

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  let { data, error } = await supabase
    .from('documents')
    .select('id,name,status,deadline,file_url,uploaded_at,review_comment,review_file_url')
    .eq('student_id', user.id)
    .order('order_index', { ascending: true })

  if (error?.message.includes('review_comment')) {
    const fallback = await supabase
      .from('documents')
      .select('id,name,status,deadline,file_url,uploaded_at')
      .eq('student_id', user.id)
      .order('order_index', { ascending: true })

    data = fallback.data?.map((document) => ({ ...document, review_comment: null, review_file_url: null })) ?? null
    error = fallback.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    documents: (data ?? []).map((document) => ({
      id: document.id,
      name: document.name,
      status: document.status,
      deadline: formatRuShortDate(document.deadline),
      fileUrl: document.file_url ?? undefined,
      fileName: getStorageFileName(document.file_url),
      uploadedAt: formatRuShortDate(document.uploaded_at),
      reviewComment: document.review_comment,
      reviewFileUrl: document.review_file_url,
      reviewFileName: getStorageFileName(document.review_file_url),
    })),
  })
}

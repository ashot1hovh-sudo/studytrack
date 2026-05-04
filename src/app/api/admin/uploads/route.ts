import { NextResponse } from 'next/server'
import { formatRuShortDate, getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { getStorageFileName } from '@/lib/documents'

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, response } = await getConsultantUser()
  if (response) return response

  let { data, error } = await supabase
    .from('documents')
    .select('id,name,status,deadline,file_url,uploaded_at,review_comment,review_file_url,students(id,email,full_name)')
    .in('status', ['uploaded'])
    .order('uploaded_at', { ascending: false })

  if (error?.message.includes('review_comment')) {
    const fallback = await supabase
      .from('documents')
      .select('id,name,status,deadline,file_url,uploaded_at,students(id,email,full_name)')
      .in('status', ['uploaded'])
      .order('uploaded_at', { ascending: false })

    data = fallback.data?.map((document) => ({ ...document, review_comment: null, review_file_url: null })) ?? null
    error = fallback.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    uploads: (data ?? []).map((document) => {
      const student = Array.isArray(document.students) ? document.students[0] : document.students
      return {
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
        student: {
          id: student?.id ?? '',
          email: student?.email ?? '',
          fullName: student?.full_name ?? 'Клиент',
        },
      }
    }),
  })
}

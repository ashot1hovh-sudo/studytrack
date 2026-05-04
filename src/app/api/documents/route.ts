import { NextResponse } from 'next/server'
import { formatRuShortDate, getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { getStorageFileName } from '@/lib/documents'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  let { data, error } = await supabase
    .from('documents')
    .select('id,name,status,deadline,file_url,uploaded_at,target_university_id,review_comment,review_file_url,universities(name)')
    .eq('student_id', user.id)
    .order('order_index', { ascending: true })

  if (error?.message.includes('review_comment') || error?.message.includes('target_university_id')) {
    const fallback = await supabase
      .from('documents')
      .select('id,name,status,deadline,file_url,uploaded_at')
      .eq('student_id', user.id)
      .order('order_index', { ascending: true })

    data = fallback.data?.map((document) => ({
      ...document,
      target_university_id: null,
      universities: [],
      review_comment: null,
      review_file_url: null,
    })) ?? null
    error = fallback.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    documents: (data ?? []).map((document) => {
      const university = Array.isArray(document.universities) ? document.universities[0] : null

      return {
        id: document.id,
        name: document.name,
        status: document.status,
        deadline: formatRuShortDate(document.deadline),
        fileUrl: document.file_url ?? undefined,
        fileName: getStorageFileName(document.file_url),
        uploadedAt: formatRuShortDate(document.uploaded_at),
        targetUniversityId: document.target_university_id ?? null,
        targetUniversityName: university?.name ?? null,
        reviewComment: document.review_comment,
        reviewFileUrl: document.review_file_url,
        reviewFileName: getStorageFileName(document.review_file_url),
      }
    }),
  })
}

export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })

  const { name, deadline, targetUniversityId } = await request.json()
  if (!name) return NextResponse.json({ error: 'Название документа обязательно' }, { status: 400 })

  const { data: maxOrder } = await supabase
    .from('documents')
    .select('order_index')
    .eq('student_id', user.id)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await admin
    .from('documents')
    .insert({
      student_id: user.id,
      name,
      status: 'not_started',
      deadline: deadline || null,
      target_university_id: targetUniversityId ? Number(targetUniversityId) : null,
      order_index: (maxOrder?.order_index ?? 0) + 1,
    })
    .select('id,name,status,deadline,file_url,uploaded_at,target_university_id,review_comment,review_file_url,universities(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const university = Array.isArray(data.universities) ? data.universities[0] : data.universities

  return NextResponse.json({
    document: {
      id: data.id,
      name: data.name,
      status: data.status,
      deadline: formatRuShortDate(data.deadline),
      fileUrl: data.file_url ?? undefined,
      fileName: getStorageFileName(data.file_url),
      uploadedAt: formatRuShortDate(data.uploaded_at),
      targetUniversityId: data.target_university_id ?? null,
      targetUniversityName: university?.name ?? null,
      reviewComment: data.review_comment,
      reviewFileUrl: data.review_file_url,
      reviewFileName: getStorageFileName(data.review_file_url),
    },
  })
}

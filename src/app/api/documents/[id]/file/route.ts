import { NextResponse } from 'next/server'
import { formatRuShortDate, getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const { data: document, error } = await supabase
    .from('documents')
    .select('file_url')
    .eq('id', params.id)
    .eq('student_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!document?.file_url) {
    return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from('documents')
    .createSignedUrl(document.file_url, 60)

  if (signedUrlError) {
    return NextResponse.json({ error: signedUrlError.message }, { status: 500 })
  }

  return NextResponse.json({ url: data.signedUrl })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const { data: document, error } = await supabase
    .from('documents')
    .select('id,file_url')
    .eq('id', params.id)
    .eq('student_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!document) {
    return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
  }

  if (document.file_url) {
    const { error: removeError } = await supabase.storage.from('documents').remove([document.file_url])
    if (removeError) {
      return NextResponse.json({ error: removeError.message }, { status: 500 })
    }
  }

  const { data: updatedDocument, error: updateError } = await supabase
    .from('documents')
    .update({
      status: 'in_progress',
      file_url: null,
      uploaded_at: null,
    })
    .eq('id', document.id)
    .eq('student_id', user.id)
    .select('id,name,status,deadline,file_url,uploaded_at')
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
      fileUrl: null,
      fileName: null,
      uploadedAt: null,
    },
  })
}

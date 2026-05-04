import { NextResponse } from 'next/server'
import { getConsultantUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, response } = await getConsultantUser()
  if (response) return response

  const { data: document, error } = await supabase
    .from('documents')
    .select('file_url')
    .eq('id', params.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!document?.file_url) return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })

  const { data, error: signedUrlError } = await supabase.storage
    .from('documents')
    .createSignedUrl(document.file_url, 60)

  if (signedUrlError) return NextResponse.json({ error: signedUrlError.message }, { status: 500 })

  return NextResponse.json({ url: data.signedUrl })
}

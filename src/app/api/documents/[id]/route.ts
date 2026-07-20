import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const body = await request.json().catch(() => ({}))
  const { status, deadline } = body as { status?: string; deadline?: string | null }

  const patch: Record<string, unknown> = {}
  if (status !== undefined) patch.status = status
  if (deadline !== undefined) {
    patch.deadline = deadline || null
    // The student picked this date, so automatic rescheduling leaves it alone
    // from now on — otherwise the next university deadline change would quietly
    // overwrite their own planning.
    patch.deadline_manual = true
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Нечего обновлять' }, { status: 400 })
  }

  const { error } = await supabase
    .from('documents')
    .update(patch)
    .eq('id', params.id)
    .eq('student_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const { data: document, error: readError } = await supabase
    .from('documents')
    .select('id,file_url,template_key')
    .eq('id', params.id)
    .eq('student_id', user.id)
    .maybeSingle()

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
  if (!document) return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })

  // The stored file goes first either way, or the object is orphaned in storage
  // with nothing left pointing at it.
  if (document.file_url) {
    const { error: removeError } = await supabase.storage.from('documents').remove([document.file_url])
    if (removeError) return NextResponse.json({ error: removeError.message }, { status: 500 })
  }

  // Standard documents are marked deleted rather than removed. Seeding decides
  // what to create by looking for an existing row with the same template_key,
  // so a hard delete here would be undone by the next reseed — the student
  // deletes Видео визитка, adds a university, and it is back.
  //
  // Hand-added documents have no template_key and nothing reseeds them, so
  // there is nothing to remember and the row goes for real.
  //
  // .select() on both paths: a write that matched nothing is not an error in
  // PostgREST, and reporting that as success is how the missing DELETE policy
  // stayed invisible.
  const query = document.template_key
    ? supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString(), file_url: null, uploaded_at: null })
    : supabase.from('documents').delete()

  const { data: affected, error } = await query
    .eq('id', document.id)
    .eq('student_id', user.id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!affected?.length) {
    return NextResponse.json({ error: 'Документ не удалось удалить' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

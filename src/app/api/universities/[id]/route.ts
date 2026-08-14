import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncStudentDocuments } from '@/lib/studentDocuments'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const body = await request.json().catch(() => ({}))
  const { status, deadline, major, examRequirements, portalUrl, price, city } = body as {
    status?: string
    deadline?: string | null
    major?: string | null
    examRequirements?: string | null
    portalUrl?: string | null
    price?: string | null
    city?: string | null
  }

  // Only the keys actually sent are written, so a status change can't blank the
  // deadline — and with it every document deadline derived from that date.
  const patch: Record<string, unknown> = {}
  if (status !== undefined) patch.status = status
  if (deadline !== undefined) patch.deadline = deadline || null
  if (major !== undefined) patch.major = major || null
  if (examRequirements !== undefined) patch.exam_requirements = examRequirements || null
  if (portalUrl !== undefined) patch.portal_url = portalUrl || null
  if (price !== undefined) patch.price = price || null
  if (city !== undefined) patch.city = city || null

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Нечего обновлять' }, { status: 400 })
  }

  const { error } = await supabase
    .from('universities')
    .update(patch)
    .eq('id', params.id)
    .eq('student_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // A moved deadline moves every document deadline derived from it.
  if (deadline !== undefined) {
    const admin = createAdminClient()
    if (admin) await syncStudentDocuments(admin, user.id)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
  }

  // Note the order. This university's documents are *identified* first but
  // deleted last, because documents.target_university_id is ON DELETE SET NULL:
  // once the university is gone the link is gone with it, and there is no way
  // left to find them. Deleting them before the university would instead throw
  // away the student's documents if the university delete then failed.
  const { data: ownDocuments } = await admin
    .from('documents')
    .select('id')
    .eq('student_id', user.id)
    .eq('target_university_id', params.id)

  // Scoped by student_id as well as id: the id alone would let one student
  // delete another's university if RLS ever regressed.
  //
  // .select() so the deleted rows come back and can be counted. A DELETE that
  // matches nothing is not an error in PostgREST, so without this a missing RLS
  // policy reports 200 while the row stays exactly where it was.
  const { data: deleted, error } = await supabase
    .from('universities')
    .delete()
    .eq('id', params.id)
    .eq('student_id', user.id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!deleted?.length) {
    return NextResponse.json(
      { error: 'Вуз не найден или его не удалось удалить' },
      { status: 404 }
    )
  }

  // The university is gone; now remove the documents that belonged to it. The
  // FK has already nulled their target_university_id, so they are addressed by
  // the ids captured above — otherwise this university's мотивационное письмо
  // would survive as a second *shared* letter and collide with the real one on
  // the unique index.
  const orphanedIds = (ownDocuments ?? []).map((document) => document.id)
  if (orphanedIds.length) {
    const { error: documentsError } = await admin
      .from('documents')
      .delete()
      .eq('student_id', user.id)
      .in('id', orphanedIds)

    if (documentsError) {
      return NextResponse.json({ error: documentsError.message }, { status: 500 })
    }
  }

  // The earliest deadline may have just moved, so the shared documents are
  // rescheduled against whichever university is now first.
  await syncStudentDocuments(admin, user.id)

  return NextResponse.json({ ok: true })
}

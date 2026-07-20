import { NextResponse } from 'next/server'
import { getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

/**
 * Removes a student-created calendar event.
 *
 * Only rows in `deadlines` are reachable here. Document and university dates
 * are derived at read time and have no row to delete — they are removed by
 * deleting the document or the university itself.
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const { data: deleted, error } = await supabase
    .from('deadlines')
    .delete()
    .eq('id', params.id)
    .eq('student_id', user.id)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!deleted?.length) {
    return NextResponse.json({ error: 'Событие не найдено' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

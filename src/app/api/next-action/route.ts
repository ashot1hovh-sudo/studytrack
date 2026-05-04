import { NextResponse } from 'next/server'
import { formatRuShortDate, getAuthenticatedUser, missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function GET() {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { supabase, user, response } = await getAuthenticatedUser()
  if (response) return response

  const { data, error } = await supabase
    .from('next_actions')
    .select('id,title,deadline,action_button_text')
    .eq('student_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    action: data
      ? {
          id: data.id,
          title: data.title,
          deadline: formatRuShortDate(data.deadline),
          actionButtonText: data.action_button_text,
        }
      : null,
  })
}

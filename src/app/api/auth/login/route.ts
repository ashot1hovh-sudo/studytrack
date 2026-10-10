import { NextResponse } from 'next/server'
import { missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { email, password } = await request.json()
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.code === 'email_not_confirmed') {
      return NextResponse.json({ error: 'Email не подтверждён. Проверьте почту.' }, { status: 401 })
    }
    // Network failure / auth server down is not a wrong password: saying so sent
    // people (and us) chasing passwords while the server was unreachable.
    if (error.status === undefined || error.status === 0 || error.status >= 500 || /fetch failed|network|timeout/i.test(error.message)) {
      return NextResponse.json({ error: 'Сервер авторизации недоступен. Попробуйте через минуту.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Неверный email или пароль' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}

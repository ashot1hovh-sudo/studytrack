import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { email } = await request.json().catch(() => ({}))
  if (!email) {
    return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })
  }

  const supabase = createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: String(email).trim(),
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/login`,
    },
  })

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'Не удалось отправить письмо' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: 'Письмо отправлено. Проверьте почту.',
  })
}

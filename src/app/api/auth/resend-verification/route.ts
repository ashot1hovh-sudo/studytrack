import { NextResponse } from 'next/server'
import { missingSupabaseEnv, setupErrorResponse } from '@/lib/api'
import { createClient } from '@/lib/supabase/server'

/**
 * Re-sends the signup confirmation email.
 *
 * This used to generate a link with the admin API and push it through Resend.
 * Auth email now goes out from the self-hosted GoTrue via Timeweb SMTP using the
 * branded template, so it just asks Supabase to resend — one sender, one
 * template, and no personal data leaving Russia.
 */
export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const body = await request.json().catch(() => null)
  const email = String(body?.email ?? '').trim().toLowerCase()

  if (!email) {
    return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })
  }

  const supabase = createClient()
  const { error } = await supabase.auth.resend({ type: 'signup', email })

  if (error) {
    // Rate limiting is the common failure here; GoTrue throttles resends per
    // address, and telling the user to wait is more useful than a generic error.
    const tooMany = error.status === 429 || /rate|seconds/i.test(error.message)
    return NextResponse.json(
      {
        error: tooMany
          ? 'Слишком часто. Подождите минуту и попробуйте снова.'
          : 'Не удалось отправить письмо',
      },
      { status: tooMany ? 429 : 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: 'Письмо отправлено. Проверьте почту, включая папку «Спам».',
  })
}

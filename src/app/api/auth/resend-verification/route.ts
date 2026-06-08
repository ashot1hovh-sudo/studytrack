import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendConfirmationEmail } from '@/lib/email'
import { missingSupabaseEnv, setupErrorResponse } from '@/lib/api'

export async function POST(request: Request) {
  if (missingSupabaseEnv()) return setupErrorResponse()

  const { email } = await request.json().catch(() => ({}))
  if (!email) {
    return NextResponse.json({ error: 'Email обязателен' }, { status: 400 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Сервисный ключ не настроен' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: String(email).trim(),
    options: { redirectTo: `${appUrl}/login` },
  })

  if (linkError || !linkData?.properties?.action_link) {
    return NextResponse.json(
      { error: 'Не удалось сгенерировать ссылку подтверждения' },
      { status: 500 }
    )
  }

  const { error: sendError } = await sendConfirmationEmail(email, linkData.properties.action_link)

  if (sendError) {
    return NextResponse.json(
      { error: 'Не удалось отправить письмо' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    message: 'Письмо отправлено. Проверьте почту.',
  })
}

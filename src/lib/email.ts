import { Resend } from 'resend'

// Construct the client lazily inside the function, not at module load. The
// Resend constructor throws when RESEND_API_KEY is absent, and `next build`
// imports every route module during "collecting page data" — a module-level
// client would crash the build in any environment without the key at build
// time (e.g. the Timeweb Docker build, where env vars are runtime-only).
export async function sendConfirmationEmail(email: string, confirmationUrl: string) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  return resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'Подтвердите ваш email — StudyTrack',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
        <h1 style="font-size:22px;font-weight:700;color:#1a1a1a;margin-bottom:8px;">Добро пожаловать в StudyTrack!</h1>
        <p style="font-size:15px;color:#555;line-height:1.6;margin-bottom:24px;">
          Нажмите на кнопку ниже, чтобы подтвердить ваш email и войти в аккаунт.
        </p>
        <a href="${confirmationUrl}"
           style="display:inline-block;background:#8B5E3C;color:#fff;font-size:15px;font-weight:600;
                  padding:14px 28px;border-radius:12px;text-decoration:none;">
          Подтвердить email
        </a>
        <p style="font-size:12px;color:#aaa;margin-top:32px;">
          Если вы не регистрировались в StudyTrack — просто проигнорируйте это письмо.
        </p>
      </div>
    `,
  })
}

/**
 * Best-effort Telegram notification.
 *
 * Fire-and-forget by contract: it never throws and never lets a slow or failed
 * send affect the caller. The caller may `await` it safely — every failure is
 * swallowed here, and a hung request is bounded by an internal timeout.
 *
 * Env is read INSIDE the function on purpose. The Timeweb Docker image runs
 * `next build` with no env vars present; a module-scope read that assumed them
 * has killed the build before. Never hoist these to module scope.
 */
export async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  // Not configured (e.g. build time, or env not set yet) — do nothing, quietly.
  if (!token || !chatId) return

  // Bound the request so a slow/hanging Telegram API can't stall the caller,
  // even when awaited.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`notifyTelegram: Telegram API responded ${res.status}`, detail)
    }
  } catch (err) {
    console.error('notifyTelegram: request failed', err)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Escapes the five characters that matter for Telegram's HTML parse_mode, so a
 * user-supplied name/email can't break the message or inject markup.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

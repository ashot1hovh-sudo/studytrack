import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getSupabaseConfig, hasSupabaseConfig } from '@/lib/supabase/config'

/**
 * Lands the magic link / "Подтвердить и войти" button from the auth emails.
 *
 * The email links here rather than to GoTrue's own `/auth/v1/verify`, because
 * that endpoint finishes by redirecting to SITE_URL with the session in the URL
 * *fragment* (`#access_token=…`). A fragment never reaches the server, and this
 * app reads its session from server-set cookies — so the tokens arrived in the
 * browser, nothing consumed them, and the user landed back on the login screen
 * holding a perfectly valid session they couldn't use.
 *
 * Here the token hash is redeemed server-side instead: verifyOtp sets the auth
 * cookies on the redirect response, so `/` sees an authenticated user.
 */
/**
 * Redirects with a *relative* Location, which RFC 7231 allows and every browser
 * resolves against the address it actually requested.
 *
 * Building an absolute URL here needs the app's public origin, and nothing in
 * the container knows it: NEXT_PUBLIC_APP_URL is typed into a hosting panel by
 * hand (this deploy's copy has no scheme, which threw and made every
 * confirmation a 500), and `request.nextUrl.origin` behind Timeweb's proxy is
 * the internal bind address — it sent real users to https://0.0.0.0:3000/ with
 * a perfectly valid session cookie. Staying relative removes the question.
 */
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } })
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null

  const failed = (reason: string) => redirectTo(`/?auth=${reason}`)

  if (!hasSupabaseConfig()) return failed('setup')
  if (!tokenHash || !type) return failed('invalid')

  // The cookies verifyOtp writes have to land on *this* response, so the client
  // is bound to it directly rather than going through the shared server client.
  const response = redirectTo('/')
  const { url, key } = getSupabaseConfig()

  const supabase = createServerClient(url!, key!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  // Expired and already-used links are reported the same way, so the response
  // can't be used to probe which links were ever valid (same rule as verify-otp).
  if (error) return failed('expired')

  return response
}

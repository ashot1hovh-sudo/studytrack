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
 * Where to send the browser afterwards.
 *
 * NEXT_PUBLIC_APP_URL is set by hand in a hosting panel, so it can easily be a
 * bare host with no scheme — which makes `new URL()` throw and turns every
 * confirmation into a 500. It is validated rather than trusted, and the request's
 * own origin is the fallback.
 */
function resolveOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      // Fall through to the request origin.
    }
  }
  return request.nextUrl.origin
}

export async function GET(request: NextRequest) {
  const origin = resolveOrigin(request)
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null

  const failed = (reason: string) =>
    NextResponse.redirect(new URL(`/?auth=${reason}`, origin))

  if (!hasSupabaseConfig()) return failed('setup')
  if (!tokenHash || !type) return failed('invalid')

  // The cookies verifyOtp writes have to land on *this* response, so the client
  // is bound to it directly rather than going through the shared server client.
  const response = NextResponse.redirect(new URL('/', origin))
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

import { NextResponse, type NextRequest } from 'next/server'

// The CRM (clients.kaykitay.ru) and the student app (app.kaykitay.ru) are the
// same Next deployment. This middleware host-guards so the CRM surface only
// exists on its own subdomain and is invisible on the public app — a student
// can't reach it even by accident.
//
// Lives at src/middleware.ts (not the project root): this app keeps its App
// Router under src/app, so Next only detects middleware here. (The old root
// middleware.ts was never actually executed — auth has always worked by reading
// cookies inside the route handlers, so nothing depended on it.)
//
// Deliberately a pure guard + passthrough: it does NOT touch sessions, so the
// live student app behaves exactly as before. The CRM does not need session
// refresh to work — its API gates on the auth cookie like every other route.
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const path = request.nextUrl.pathname

  const isClientsSubdomain = host.startsWith('clients.')
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1')
  const crmAllowedHere = isClientsSubdomain || isLocal

  const isCrmPath = path === '/crm' || path.startsWith('/crm/') || path.startsWith('/api/crm')

  // Hide the CRM entirely on the public app host (and anywhere that isn't the
  // clients subdomain or local dev).
  if (isCrmPath && !crmAllowedHere) {
    return new NextResponse('Not found', { status: 404 })
  }

  // On the clients subdomain the CRM is the whole app — send the root to it.
  // (Local dev is left alone so the student app stays reachable at /.)
  if (isClientsSubdomain && path === '/') {
    return NextResponse.redirect(new URL('/crm', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

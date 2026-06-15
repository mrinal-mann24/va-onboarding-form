import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Next.js 16 renamed `middleware` -> `proxy`. This gate blocks every page
// unless the VA has logged in (the `va_auth` cookie is set by /api/login).
const PUBLIC_PATHS = ['/login', '/api/login']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  const loggedIn = request.cookies.get('va_auth')?.value === '1'

  // Already logged in but visiting /login -> send to the form.
  if (loggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (!loggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
}

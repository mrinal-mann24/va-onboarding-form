import { NextResponse } from 'next/server'

// Verifies the shared VA passcode server-side and sets an httpOnly cookie.
// The passcode lives in VA_ACCESS_CODE (.env) and is never sent to the browser.
export async function POST(request: Request) {
  const { code } = await request.json().catch(() => ({ code: '' }))
  const expected = process.env.VA_ACCESS_CODE

  if (!expected) {
    return NextResponse.json(
      { error: 'Login is not configured. Set VA_ACCESS_CODE in .env.' },
      { status: 500 }
    )
  }

  if (typeof code !== 'string' || code !== expected) {
    return NextResponse.json({ error: 'Wrong passcode.' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('va_auth', '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 12, // 12 hours
  })
  return res
}

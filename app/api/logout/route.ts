import { NextResponse } from 'next/server'

// Clears the auth cookie and bounces back to the login page.
export async function POST(request: Request) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('va_auth', '', { path: '/', maxAge: 0 })
  return res
}

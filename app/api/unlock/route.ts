import { NextRequest, NextResponse } from 'next/server'
import { authCookieValue } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD
  if (!sitePassword) return NextResponse.json({ ok: true }) // gate disabled

  const { password } = await req.json()
  if (password !== sitePassword) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set('cl_auth', await authCookieValue(sitePassword), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return res
}

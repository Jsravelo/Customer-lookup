import { NextRequest, NextResponse } from 'next/server'
import { authCookieValue } from '@/lib/auth'

// Site-wide password gate. Inactive until SITE_PASSWORD is set in the
// environment — so local dev and un-configured deploys behave as before.
export async function middleware(req: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD
  if (!sitePassword) return NextResponse.next()

  const cookie = req.cookies.get('cl_auth')?.value
  if (cookie === (await authCookieValue(sitePassword))) return NextResponse.next()

  // APIs get a 401; pages get the unlock screen
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Locked — enter the site password first' }, { status: 401 })
  }
  const url = req.nextUrl.clone()
  url.pathname = '/unlock'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    // Everything except static assets, the unlock page, and the unlock API
    '/((?!_next/|unlock|api/unlock|icon.png|favicon.ico|zenmaid-logo.svg).*)',
  ],
}

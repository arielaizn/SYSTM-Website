import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, verifySession } from './lib/admin-token';

// Optimistic gate for /admin: signature and expiry only (no database call, per the Next docs). The real check,
// including the session version, runs in every page and server action (lib/admin-session.ts).
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // The install manifest and the service worker are fetched by the browser itself, before and without a session.
  if (pathname === '/admin/sw.js' || pathname === '/admin/manifest.webmanifest') return NextResponse.next();
  const isLogin = pathname === '/admin/login' || pathname === '/admin/login/';
  const session = await verifySession(req.cookies.get(COOKIE)?.value, process.env.ADMIN_SESSION_SECRET);

  let res: NextResponse;
  if (!session && !isLogin) {
    const url = new URL('/admin/login', req.nextUrl);
    if (pathname !== '/admin' && pathname !== '/admin/') url.searchParams.set('next', pathname);
    res = NextResponse.redirect(url);
  } else if (session && isLogin) {
    res = NextResponse.redirect(new URL('/admin', req.nextUrl));
  } else {
    res = NextResponse.next();
  }
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export const config = { matcher: ['/admin', '/admin/:path*'] };

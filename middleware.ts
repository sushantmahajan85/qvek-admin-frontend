import { NextResponse, type NextRequest } from 'next/server';

// Public pages: legal/store-compliance routes that must load without a session.
// Also matched with a trailing slash and for nested paths (e.g. /privacy/foo).
const PUBLIC_PATHS = ['/login', '/delete-account', '/privacy'];

function isPublic(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return PUBLIC_PATHS.some((pub) => p === pub || p.startsWith(pub + '/'));
}

export function middleware(req: NextRequest) {
  const authed = req.cookies.get('qvek_admin')?.value === '1';
  const path = req.nextUrl.pathname;
  const isLogin = path.replace(/\/+$/, '') === '/login';
  if (!authed && !isPublic(path)) return NextResponse.redirect(new URL('/login', req.url));
  if (authed && isLogin) return NextResponse.redirect(new URL('/dashboard', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|images/|assets/).*)'],
};

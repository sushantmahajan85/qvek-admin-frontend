import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const authed = req.cookies.get('qvek_admin')?.value === '1';
  const isLogin = req.nextUrl.pathname === '/login';
  if (!authed && !isLogin) return NextResponse.redirect(new URL('/login', req.url));
  if (authed && isLogin) return NextResponse.redirect(new URL('/dashboard', req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/).*)'],
};

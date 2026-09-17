import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
];

const ADMIN_PATHS = [
  '/admin',
];

export default auth(async function middleware(request: any) {
  const session = request.auth;
  const pathname = request.nextUrl.pathname;

  // Allow static files with extensions (e.g. /newgen-logo.png, /favicon.ico)
  if (/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$/i.test(pathname)) {
    return NextResponse.next();
  }

  // Allow public paths
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Require auth
  if (!session?.user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only path protection
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  if (isAdminPath && session.user.role !== 'admin') {
    // Redirect agents to their own dashboard
    return NextResponse.redirect(new URL('/agent/dashboard', request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - files with extensions (.png, .svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

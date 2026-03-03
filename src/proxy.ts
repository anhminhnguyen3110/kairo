import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

const SKIP_PATTERNS = [
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/api\/auth\//,
  /^\/api\/proxy\//,
  /\.(?:svg|png|jpg|jpeg|gif|ico|webp|woff2?|ttf|eot)$/i,
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SKIP_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('access_token')?.value;
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!accessToken && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (accessToken && isPublicPath) {
    return NextResponse.redirect(new URL('/threads', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp|woff2?|ttf|eot)).*)',
  ],
};

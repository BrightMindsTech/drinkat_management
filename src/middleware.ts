import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequestWithAuth } from 'next-auth/middleware';
import { applyRateLimit } from '@/lib/rate-limit-edge';

/** Paths that must stay reachable without a session (cron, health, login). */
function isPublicApiPath(pathname: string): boolean {
  return (
    pathname.startsWith('/api/health/ready') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/auth/')
  );
}

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const limited = applyRateLimit(req);
    if (limited) return limited;
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        // Let dashboard pages load and retry session client-side — avoids false logouts from edge blips.
        if (pathname.startsWith('/dashboard')) return true;
        if (!pathname.startsWith('/api/')) {
          return !!token;
        }
        if (isPublicApiPath(pathname)) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    // All APIs — auth enforced here so new routes cannot ship without login by mistake.
    '/api/:path*',
  ],
};

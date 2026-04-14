import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/employees/:path*',
    '/api/advances/:path*',
    '/api/salary/:path*',
    '/api/upload/:path*',
    '/api/checklists/:path*',
    '/api/assignments/:path*',
    '/api/qc/:path*',
    '/api/reports/:path*',
    '/api/departments/:path*',
    '/api/leave/:path*',
    '/api/forms/:path*',
    '/api/ratings/:path*',
    '/api/chat/:path*',
  ],
};

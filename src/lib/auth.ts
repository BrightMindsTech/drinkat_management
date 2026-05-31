import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import * as bcrypt from 'bcryptjs';
import { prisma } from './prisma';

/** Active users stay signed in until explicit sign-out (sliding refresh via updateAge). */
const SESSION_MAX_AGE_SEC = 365 * 24 * 60 * 60;
const SESSION_UPDATE_AGE_SEC = 24 * 60 * 60;

const useSecureCookies =
  process.env.NEXTAUTH_URL?.startsWith('https://') ?? process.env.NODE_ENV === 'production';

function resolveAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (secret) return secret;
  // Local dev only — production Workers must set NEXTAUTH_SECRET via wrangler secret.
  return 'dev-insecure-nextauth-secret';
}

export const authOptions: NextAuthOptions = {
  // Required in production; OpenNext copies Worker secrets into process.env per request init.
  secret: resolveAuthSecret(),
  trustHost: true,
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SEC, updateAge: SESSION_UPDATE_AGE_SEC },
  jwt: { maxAge: SESSION_MAX_AGE_SEC },
  useSecureCookies,
  cookies: {
    sessionToken: {
      name: useSecureCookies ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        maxAge: SESSION_MAX_AGE_SEC,
      },
    },
  },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
          include: { employee: { select: { status: true } } },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        if (user.employee?.status === 'terminated') return null;
        const branch = user.branchId ? await prisma.branch.findUnique({ where: { id: user.branchId } }) : null;
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          branchId: user.branchId ?? undefined,
          branchName: branch?.name,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.branchId = user.branchId;
        token.branchName = user.branchName;
      }
      // Sliding expiry: active users stay signed in until explicit sign-out.
      const now = Math.floor(Date.now() / 1000);
      token.exp = now + SESSION_MAX_AGE_SEC;
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { branchId?: string }).branchId = token.branchId as string | undefined;
        (session.user as { branchName?: string }).branchName = token.branchName as string | undefined;
      }
      return session;
    },
  },
};

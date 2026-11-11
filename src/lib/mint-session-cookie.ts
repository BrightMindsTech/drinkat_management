import { encode } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import {
  getAuthSecret,
  SESSION_MAX_AGE_SEC,
  sessionTokenCookieName,
} from '@/lib/auth';

export type SessionCookieUser = {
  id: string;
  email: string;
  role: string;
  branchId?: string | null;
  branchName?: string | null;
};

export async function mintSessionJwt(user: SessionCookieUser): Promise<string> {
  return encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId ?? undefined,
      branchName: user.branchName ?? undefined,
    },
    secret: getAuthSecret(),
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function applySessionCookie(user: SessionCookieUser): Promise<void> {
  const value = await mintSessionJwt(user);
  const jar = await cookies();
  jar.set(sessionTokenCookieName(), value, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: sessionTokenCookieName().startsWith('__Secure-'),
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

type AuthRouteContext = { params: Promise<{ nextauth: string[] }> };

function isJsonSyntaxError(error: unknown): boolean {
  return error instanceof SyntaxError && /JSON/i.test(error.message);
}

async function handleAuth(req: NextRequest, context: AuthRouteContext) {
  try {
    return await handler(req, context);
  } catch (error) {
    if (isJsonSyntaxError(error)) {
      console.warn('[auth] rejected empty or invalid JSON body', {
        path: req.nextUrl.pathname,
        method: req.method,
      });
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }
    throw error;
  }
}

export const GET = handleAuth;
export const POST = handleAuth;

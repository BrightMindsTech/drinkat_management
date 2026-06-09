import { isTransientDbError } from '@/lib/prisma-retry';
import { logErrorThrottled } from '@/lib/log-throttle';

/** Safe error detail for API JSON (no stack traces in production). */
export function apiErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export function apiErrorResponse(
  logTag: string,
  e: unknown,
  fallback: string,
  status = 500
): Response {
  if (e instanceof Response) return e;
  const transient = isTransientDbError(e);
  if (transient) {
    logErrorThrottled(`api:${logTag}`, () => console.error(`[${logTag}] transient`, e), 5 * 60 * 1000);
  } else {
    console.error(`[${logTag}]`, e);
  }
  const detail = apiErrorMessage(e);
  return Response.json(
    {
      error: transient
        ? 'The server is busy — your app will retry automatically. Please wait a moment.'
        : fallback,
      retryable: transient,
      detail: process.env.NODE_ENV === 'production' ? undefined : detail,
    },
    { status: transient ? 503 : status }
  );
}

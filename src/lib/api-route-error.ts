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
  console.error(`[${logTag}]`, e);
  const detail = apiErrorMessage(e);
  return Response.json(
    {
      error: fallback,
      detail: process.env.NODE_ENV === 'production' ? undefined : detail,
    },
    { status }
  );
}

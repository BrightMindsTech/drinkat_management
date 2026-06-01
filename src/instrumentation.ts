/** Server-side SSR/route errors — visible in Cloudflare Workers Logs (unlike client error.tsx console.error). */
export async function onRequestError(
  error: { digest?: string } & Error,
  request: { path: string; method: string },
  context: { routePath: string; routeType: string }
): Promise<void> {
  console.error(
    '[ssr-request-error]',
    JSON.stringify({
      message: error.message,
      digest: error.digest ?? null,
      path: request.path,
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
    })
  );
}

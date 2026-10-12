# Unauthenticated API redirects (Phase 1 accepted behavior)

`src/middleware.ts` wraps `/api/:path*` with NextAuth `withAuth`.

If there is no session token and the path is not public (`/api/health/ready`, `/api/cron/*`, `/api/auth/*`, `/api/client-error`), the edge middleware **redirects to login (HTTP 307)** instead of returning JSON `401`.

This is existing middleware behavior. Phase 1 acceptance documented it. Do not rewrite working middleware unless a later authorization explicitly standardizes unauthenticated APIs to `401`.

Authenticated callers who fail `requireOwner` / `requireQc` / `requireCapability` receive **403** (not 500).

# Deploy & database health

## Before you deploy

```bash
npm run verify
```

This checks Prisma runtime selection and ensures `src/lib/prisma.ts` does not use React `cache()` for the D1 client (that pattern caused a full-site outage: login “invalid credentials”, frozen dashboard).

## Deploy

```bash
npm run deploy
```

Deploy runs `verify:prisma`, builds, uploads to Cloudflare, then **five consecutive** `GET /api/health/ready` checks. Deploy fails if any return `db: false`.

## If users cannot log in (everyone affected)

1. Open `https://<your-worker>/api/health/ready`
   - `{"ok":true,"db":true}` → database layer is fine; check passwords / accounts.
   - `{"ok":false,"db":false}` → database connection broken; check recent deploys and `src/lib/prisma.ts`.
2. Check Cloudflare Worker logs for `[health/ready]` or `[cron/time-clock] database health failed`.
3. Do **not** reintroduce `cache()` from `react` in `prisma.ts` — use the `WeakMap` + Cloudflare request context pattern.

## Production monitoring

Every 5 minutes the Worker cron runs `/api/cron/time-clock`, which includes a `prisma.user.count()` probe. Failures are logged as `[cron/time-clock] database health failed`.

## Stability: rate limits & API coverage

- **Middleware** applies to **all** `/api/*` routes (login required except `/api/auth/*`, `/api/health/ready`, `/api/cron/*`).
- **Rate limits** (per IP, per minute): login ~25, writes ~90, reads ~240, heavy routes (reports, geofence) ~45. Returns **429** with `Retry-After` instead of crashing the Worker.
- UI button locks are still useful; server limits protect against spam taking the app down.

/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    /** Set via `npm run cf:upload-cron-secret` or Cloudflare dashboard; required for scheduled /api/cron/time-clock. */
    CRON_SECRET?: string;
    /** Public Worker URL for cron self-fetch (must not use https://internal/). */
    WORKER_PUBLIC_URL?: string;
    DB: D1Database;
    /** Employee / QC uploads (R2). Prefer `UPLOADS`; Wrangler CLI may use `drinkat_management_uploads`. */
    UPLOADS?: R2Bucket;
    drinkat_management_uploads?: R2Bucket;
  }
}

export {};

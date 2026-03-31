/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    /** Employee / QC uploads (R2). Prefer `UPLOADS`; Wrangler CLI may use `drinkat_management_uploads`. */
    UPLOADS?: R2Bucket;
    drinkat_management_uploads?: R2Bucket;
  }
}

export {};

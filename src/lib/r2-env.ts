/**
 * R2 binding: `UPLOADS` in wrangler.jsonc, or `drinkat_management_uploads` if Wrangler CLI added that name.
 */
export function getR2UploadsBucket(env: CloudflareEnv): R2Bucket | undefined {
  const e = env as CloudflareEnv & { drinkat_management_uploads?: R2Bucket };
  return e.UPLOADS ?? e.drinkat_management_uploads;
}

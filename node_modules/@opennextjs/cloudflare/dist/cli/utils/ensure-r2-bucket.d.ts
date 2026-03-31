/**
 * Creates an R2 bucket if it doesn't already exist
 *
 * If no auth credentials are available, falls back to wrangler login for OAuth authentication.
 *
 * @param projectDir The project directory to detect the package manager
 * @param bucketName The name of the R2 bucket to create
 * @returns An object indicating success with the bucket name, or failure
 */
export declare function ensureR2Bucket(projectDir: string, bucketName: string, jurisdiction?: string): Promise<{
    success: true;
    bucketName: string;
} | {
    success: false;
    error: string;
}>;

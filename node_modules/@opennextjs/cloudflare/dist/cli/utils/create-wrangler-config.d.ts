/**
 * Gets the path to the Wrangler configuration file if it exists.
 *
 * @param appDir The directory to check for the Wrangler config file
 * @returns The path to Wrangler config file if it exists, undefined otherwise
 */
export declare function findWranglerConfig(appDir: string): string | undefined;
/**
 * Creates a wrangler.jsonc config file in the target directory for the project.
 *
 * If a wrangler.jsonc file already exists it will be overridden.
 *
 * The function attempts to create an R2 bucket for incremental cache. If bucket creation
 * fails (e.g., user not authenticated or R2 not enabled), a configuration without caching
 * will be created instead.
 *
 * @param projectDir The target directory for the project
 * @param defaultCompatDate The default YYYY-MM-DD compatibility date to use in the config (used if fetching the latest workerd version date fails)
 * @returns An object containing a `cachingEnabled` which indicates whether caching has been set up during the wrangler
 *          config file creation or not
 */
export declare function createWranglerConfigFile(projectDir: string, defaultCompatDate?: string): Promise<{
    cachingEnabled: boolean;
}>;

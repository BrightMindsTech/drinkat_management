/**
 * Finds the path to the OpenNext configuration file if it exists.
 *
 * @param appDir The directory to check for the open-next.config.ts file
 * @returns The full path to open-next.config.ts if it exists, undefined otherwise
 */
export declare function findOpenNextConfig(appDir: string): string | undefined;
/**
 * Creates an `open-next.config.ts` file for the application.
 *
 * @param appDir The Next.js application root directory
 * @param options.cache Whether to set up caching
 * @returns The path to the created configuration file
 */
export declare function createOpenNextConfigFile(appDir: string, options: {
    cache: boolean;
}): string;

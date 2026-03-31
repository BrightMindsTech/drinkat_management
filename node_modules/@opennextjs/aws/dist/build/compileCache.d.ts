import * as buildHelper from "./helper.js";
/**
 * Compiles the cache adapter.
 *
 * @param options Build options.
 * @param format Output format.
 * @returns An object containing the paths to the compiled cache and composable cache files.
 */
export declare function compileCache(options: buildHelper.BuildOptions, format?: "cjs" | "esm"): {
    cache: string;
    composableCache: string;
};

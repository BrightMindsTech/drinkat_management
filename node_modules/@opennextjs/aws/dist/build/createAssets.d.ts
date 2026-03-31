import type { TagCacheMetaFile } from "../types/cache.js";
import * as buildHelper from "./helper.js";
/**
 * Copy the static assets to the output folder
 *
 * WARNING: `useBasePath` should be set to `false` when the output file is used.
 *
 * @param options OpenNext build options
 * @param useBasePath whether to copy files into the to Next.js configured basePath
 */
export declare function createStaticAssets(options: buildHelper.BuildOptions, { useBasePath }?: {
    useBasePath?: boolean | undefined;
}): void;
/**
 * Create the cache assets.
 *
 * @param options Build options.
 * @returns Whether the tag cache is used, and the meta files collected.
 */
export declare function createCacheAssets(options: buildHelper.BuildOptions): {
    useTagCache: boolean;
    metaFiles: TagCacheMetaFile[];
};

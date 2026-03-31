import type { CacheHandlerValue, IncrementalCacheContext, IncrementalCacheValue } from "../types/cache";
export declare const SOFT_TAG_PREFIX = "_N_T_/";
export default class Cache {
    get(key: string, options?: boolean | {
        fetchCache?: boolean;
        kindHint?: "app" | "pages" | "fetch";
        tags?: string[];
        softTags?: string[];
        kind?: "FETCH";
    }): Promise<CacheHandlerValue | null>;
    getFetchCache(key: string, softTags?: string[], tags?: string[]): Promise<CacheHandlerValue | null>;
    getIncrementalCache(key: string): Promise<CacheHandlerValue | null>;
    set(key: string, data?: IncrementalCacheValue, ctx?: IncrementalCacheContext): Promise<void>;
    revalidateTag(tags: string | string[]): Promise<void>;
    private updateTagsOnSet;
    private extractRevalidateForSet;
}

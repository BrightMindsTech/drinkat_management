import type { CacheValue, OriginalTagCacheWriteInput, WithLastModified } from "../types/overrides";
export declare function hasBeenRevalidated(key: string, tags: string[], cacheEntry: WithLastModified<CacheValue<any>>): Promise<boolean>;
export declare function getTagsFromValue(value?: CacheValue<"cache">): string[];
export declare function writeTags(tags: (string | OriginalTagCacheWriteInput)[]): Promise<void>;

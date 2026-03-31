import type { ComposableCacheEntry } from "../types/cache";
declare const _default: {
    get(cacheKey: string): Promise<{
        value: import("stream/web").ReadableStream<any>;
        tags: string[];
        stale: number;
        timestamp: number;
        expire: number;
        revalidate: number;
    } | undefined>;
    set(cacheKey: string, pendingEntry: Promise<ComposableCacheEntry>): Promise<void>;
    refreshTags(): Promise<void>;
    /**
     * The signature has changed in Next.js 16
     * - Before Next.js 16, the method takes `...tags: string[]`
     * - From Next.js 16, the method takes `tags: string[]`
     */
    getExpiration(...tags: string[] | string[][]): Promise<number>;
    /**
     * This method is only used before Next.js 16
     */
    expireTags(...tags: string[]): Promise<void>;
    receiveExpiredTags(...tags: string[]): Promise<void>;
};
export default _default;

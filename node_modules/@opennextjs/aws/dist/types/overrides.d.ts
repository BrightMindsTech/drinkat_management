import type { Readable } from "node:stream";
import type { Extension, Meta, StoredComposableCacheEntry } from "./cache";
import type { BaseEventOrResult, BaseOverride, InternalEvent, InternalResult, Origin, ResolvedRoute, StreamCreator, WaitUntil } from "./open-next";
export interface QueueMessage {
    MessageDeduplicationId: string;
    MessageBody: {
        host: string;
        url: string;
        lastModified: number;
        eTag: string;
    };
    MessageGroupId: string;
}
export interface Queue {
    send(message: QueueMessage): Promise<void>;
    name: string;
}
/**
 * Resolves assets in the routing layer.
 */
export interface AssetResolver {
    name: string;
    /**
     * Called by the routing layer to check for a matching static asset.
     *
     * @param event
     * @returns an `InternalResult` when an asset is found a the path from the event, undefined otherwise.
     */
    maybeGetAssetResult?: (event: InternalEvent) => Promise<InternalResult | undefined> | undefined;
}
export type CachedFile = {
    type: "redirect";
    props?: Object;
    meta?: Meta;
} | {
    type: "page";
    html: string;
    json: Object;
    meta?: Meta;
} | {
    type: "app";
    html: string;
    rsc: string;
    meta?: Meta;
    segmentData?: Record<string, string>;
} | {
    type: "route";
    body: string;
    meta?: Meta;
};
export type CachedFetchValue = {
    kind: "FETCH";
    data: {
        headers: {
            [k: string]: string;
        };
        body: string;
        url: string;
        status?: number;
        tags?: string[];
    };
    tags?: string[];
};
export type WithLastModified<T> = {
    lastModified?: number;
    value?: T;
    /**
     * If set to true, we will not check the tag cache for this entry.
     * `revalidateTag` and `revalidatePath` may not work as expected.
     */
    shouldBypassTagCache?: boolean;
};
export type CacheEntryType = Extension;
export type CacheValue<CacheType extends CacheEntryType> = (CacheType extends "fetch" ? CachedFetchValue : CacheType extends "cache" ? CachedFile : StoredComposableCacheEntry) & {
    /**
     * This is available for page cache entry, but only at runtime.
     */
    revalidate?: number | false;
};
export type IncrementalCache = {
    get<CacheType extends CacheEntryType = "cache">(key: string, cacheType?: CacheType): Promise<WithLastModified<CacheValue<CacheType>> | null>;
    set<CacheType extends CacheEntryType = "cache">(key: string, value: CacheValue<CacheType>, isFetch?: CacheType): Promise<void>;
    delete(key: string): Promise<void>;
    name: string;
};
type BaseTagCache = {
    name: string;
};
/**
 * On get :
We have to check for every tag (after reading the incremental cache) that they have not been revalidated.

In DynamoDB, this would require 1 GetItem per tag (including internal one), more realistically 1 BatchGetItem per get (In terms of pricing, it would be billed as multiple single GetItem)

On set :
We don't have to do anything here

On revalidateTag for each tag :
We have to update a single entry for this tag

Pros :
- No need to prepopulate DDB
- Very little write

Cons :
- Might be slower on read
- One page request (i.e. GET request) could require to check a lot of tags (And some of them multiple time when used with the fetch cache)
- Almost impossible to do automatic cdn revalidation by itself
*/
export type NextModeTagCache = BaseTagCache & {
    mode: "nextMode";
    getLastRevalidated(tags: string[]): Promise<number>;
    hasBeenRevalidated(tags: string[], lastModified?: number): Promise<boolean>;
    writeTags(tags: string[]): Promise<void>;
    getPathsByTags?: (tags: string[]) => Promise<string[]>;
};
export interface OriginalTagCacheWriteInput {
    tag: string;
    path: string;
    revalidatedAt?: number;
}
/**
 * On get :
We just check for the cache key in the tag cache. If it has been revalidated we just return null, otherwise we continue

On set :
We have to write both the incremental cache and check the tag cache for non existing tag/key combination. For non existing tag/key combination, we have to add them

On revalidateTag for each tag :
We have to update every possible combination for the requested tag

Pros :
- Very fast on read
- Only one query per get (On DynamoDB it's a lot cheaper)
- Can allow for automatic cdn invalidation on revalidateTag

Cons :
- Lots of write on set and revalidateTag
- Needs to be prepopulated at build time to work properly
 */
export type OriginalTagCache = BaseTagCache & {
    mode?: "original";
    getByTag(tag: string): Promise<string[]>;
    getByPath(path: string): Promise<string[]>;
    getLastModified(path: string, lastModified?: number): Promise<number>;
    writeTags(tags: OriginalTagCacheWriteInput[]): Promise<void>;
};
export type TagCache = NextModeTagCache | OriginalTagCache;
export type WrapperHandler<E extends BaseEventOrResult = InternalEvent, R extends BaseEventOrResult = InternalResult> = (handler: OpenNextHandler<E, R>, converter: Converter<E, R>) => Promise<(...args: any[]) => any>;
export type Wrapper<E extends BaseEventOrResult = InternalEvent, R extends BaseEventOrResult = InternalResult> = BaseOverride & {
    wrapper: WrapperHandler<E, R>;
    supportStreaming: boolean;
    edgeRuntime?: boolean;
};
export type OpenNextHandlerOptions = {
    streamCreator?: StreamCreator;
    waitUntil?: WaitUntil;
};
export type OpenNextHandler<E extends BaseEventOrResult = InternalEvent, R extends BaseEventOrResult = InternalResult> = (event: E, options?: OpenNextHandlerOptions) => Promise<R>;
export type Converter<E extends BaseEventOrResult = InternalEvent, R extends BaseEventOrResult = InternalResult> = BaseOverride & {
    convertFrom: (event: any) => Promise<E>;
    convertTo: (result: R, originalRequest?: any) => Promise<any>;
};
export type Warmer = BaseOverride & {
    invoke: (warmerId: string) => Promise<void>;
};
export type ImageLoader = BaseOverride & {
    load: (url: string) => Promise<{
        body?: Readable;
        contentType?: string;
        cacheControl?: string;
    }>;
};
export type OriginResolver = BaseOverride & {
    resolve: (path: string) => Promise<Origin | false>;
};
export type ProxyExternalRequest = BaseOverride & {
    proxy: (event: InternalEvent) => Promise<InternalResult>;
};
type CDNPath = {
    initialPath: string;
    rawPath: string;
    resolvedRoutes: ResolvedRoute[];
};
export type CDNInvalidationHandler = BaseOverride & {
    invalidatePaths: (paths: CDNPath[]) => Promise<void>;
};
export {};

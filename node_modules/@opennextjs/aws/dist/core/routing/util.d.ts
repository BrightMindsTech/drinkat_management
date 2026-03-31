import type { OutgoingHttpHeaders } from "node:http";
import type { IncomingMessage } from "../../http/index.js";
import { OpenNextNodeResponse } from "../../http/openNextResponse.js";
import type { FunctionsConfigManifest, MiddlewareManifest } from "../../types/next-types";
import type { InternalEvent, InternalResult, RoutingResult, StreamCreator } from "../../types/open-next.js";
import { ReadableStream } from "node:stream/web";
/**
 *
 * @__PURE__
 */
export declare function isExternal(url?: string, host?: string): boolean;
export declare function convertFromQueryString(query: string): Record<string, string | string[]>;
/**
 *
 * @__PURE__
 */
export declare function getUrlParts(url: string, isExternal: boolean): {
    hostname: string;
    pathname: string;
    protocol: string;
    queryString: string;
};
/**
 * Creates an URL to a Next page
 *
 * @param baseUrl Used to get the origin
 * @param path The pathname
 * @returns The Next URL considering the basePath
 *
 * @__PURE__
 */
export declare function constructNextUrl(baseUrl: string, path: string): string;
/**
 *
 * @__PURE__
 */
export declare function convertRes(res: OpenNextNodeResponse): InternalResult;
/**
 * Make sure that multi-value query parameters are transformed to
 * ?key=value1&key=value2&... so that Next converts those parameters
 * to an array when reading the query parameters
 * query should be properly encoded before using this function
 * @__PURE__
 */
export declare function convertToQueryString(query: Record<string, string | string[]>): string;
/**
 * Given a raw query string, returns a record with key value-array pairs
 * similar to how multiValueQueryStringParameters are structured
 * @__PURE__
 */
export declare function convertToQuery(querystring: string): Record<string, string | string[]>;
/**
 *
 * @__PURE__
 */
export declare function getMiddlewareMatch(middlewareManifest: MiddlewareManifest, functionsManifest?: FunctionsConfigManifest): RegExp[];
/**
 *
 * @__PURE__
 */
export declare function escapeRegex(str: string, { isPath }?: {
    isPath?: boolean;
}): string;
/**
 *
 * @__PURE__
 */
export declare function unescapeRegex(str: string): string;
/**
 * @__PURE__
 */
export declare function convertBodyToReadableStream(method: string, body?: string | Buffer): ReadableStream<any> | undefined;
/**
 *
 * @__PURE__
 */
export declare function fixCacheHeaderForHtmlPages(internalEvent: InternalEvent, headers: OutgoingHttpHeaders): void;
/**
 *
 * @__PURE__
 */
export declare function fixSWRCacheHeader(headers: OutgoingHttpHeaders): void;
/**
 *
 * @__PURE__
 */
export declare function addOpenNextHeader(headers: OutgoingHttpHeaders): void;
/**
 *
 * @__PURE__
 */
export declare function revalidateIfRequired(host: string, rawPath: string, headers: OutgoingHttpHeaders, req?: IncomingMessage): Promise<void>;
/**
 *
 * @__PURE__
 */
export declare function fixISRHeaders(headers: OutgoingHttpHeaders): void;
/**
 *
 * @param internalEvent
 * @param headers
 * @param responseStream
 * @returns
 * @__PURE__
 */
export declare function createServerResponse(routingResult: RoutingResult, headers: Record<string, string | string[] | undefined>, responseStream?: StreamCreator): OpenNextNodeResponse;
export declare function invalidateCDNOnRequest(params: RoutingResult, headers: OutgoingHttpHeaders): Promise<void>;
/**
 * Normalizes the Location header to either be a relative path or a full URL.
 * If the Location header is relative to the origin, it will return a relative path.
 * If it is an absolute URL, it will return the full URL.
 * Redirects from Next config query parameters are encoded using `stringifyQs`
 * Redirects from the middleware the query parameters are not encoded.
 *
 * @param location The Location header value
 * @param baseUrl The base URL to use for relative paths (i.e the original request URL)
 * @param encodeQuery Optional flag to indicate if query parameters should be encoded in the Location header
 * @returns An absolute or relative Location header value
 */
export declare function normalizeLocationHeader(location: string, baseUrl: string, encodeQuery?: boolean): string;

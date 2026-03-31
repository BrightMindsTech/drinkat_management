import type http from "node:http";
export declare const parseHeaders: (headers?: http.OutgoingHttpHeader[] | http.OutgoingHttpHeaders) => Record<string, string>;
export declare const convertHeader: (header: http.OutgoingHttpHeader) => string;
/**
 * Parses a (comma-separated) list of Set-Cookie headers
 *
 * @param cookies A comma-separated list of Set-Cookie headers or a list of Set-Cookie headers
 * @returns A list of Set-Cookie header
 */
export declare function parseSetCookieHeader(cookies: string | string[] | null | undefined): string[];
/**
 *
 * Get the query object from an iterable of [key, value] pairs
 * @param it - The iterable of [key, value] pairs
 * @returns The query object
 */
export declare function getQueryFromIterator(it: Iterable<[string, string]>): Record<string, string | string[]>;

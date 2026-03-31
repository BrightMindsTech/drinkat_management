export declare function removeUndefinedFromQuery(query: Record<string, string | string[] | undefined>): Record<string, string | string[]>;
/**
 * Extract the host from the headers (default to "on")
 *
 * @param headers
 * @returns The host
 */
export declare function extractHostFromHeaders(headers: Record<string, string>): string;
/**
 * Get the query object from an URLSearchParams
 *
 * @param searchParams
 * @returns
 */
export declare function getQueryFromSearchParams(searchParams: URLSearchParams): Record<string, string | string[]>;

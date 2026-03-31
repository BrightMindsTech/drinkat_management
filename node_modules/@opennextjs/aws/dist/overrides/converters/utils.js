import { getQueryFromIterator } from "../../http/util.js";
export function removeUndefinedFromQuery(query) {
    const newQuery = {};
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
            newQuery[key] = value;
        }
    }
    return newQuery;
}
/**
 * Extract the host from the headers (default to "on")
 *
 * @param headers
 * @returns The host
 */
export function extractHostFromHeaders(headers) {
    return headers["x-forwarded-host"] ?? headers.host ?? "on";
}
/**
 * Get the query object from an URLSearchParams
 *
 * @param searchParams
 * @returns
 */
export function getQueryFromSearchParams(searchParams) {
    return getQueryFromIterator(searchParams.entries());
}

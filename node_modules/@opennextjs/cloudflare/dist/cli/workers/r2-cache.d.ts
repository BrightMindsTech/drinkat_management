/**
 * This worker writes a cache entry to R2.
 *
 * It handles POST requests to /populate with:
 * - `x-opennext-cache-key`: the R2 object key (header, required).
 * - request body: the cache value to store (required).
 *
 * The worker validates the R2 binding and request body, then writes the entry
 * to R2.
 *
 * This is used by the `populate-cache` command to bypass REST API rate limits when populating large caches.
 */
import { type CachePopulateEnv } from "./r2-cache-types.js";
/**
 * Worker fetch handler.
 *
 * Routes `POST /populate` to the cache population logic.
 * Validates the R2 binding, request metadata, and request body, then writes the entry to R2.
 *
 * Response format:
 * - 200 with `{ success: true }` on success.
 * - 4xx/5xx with `{ success: false, error, code }` on failure.
 * - 404 for unmatched routes.
 */
declare const _default: {
    fetch(request: Request, env: CachePopulateEnv): Promise<Response>;
};
export default _default;

import type { InternalEvent, InternalResult, MiddlewareEvent } from "../../types/open-next.js";
type Middleware = (request: Request) => Response | Promise<Response>;
type MiddlewareLoader = () => Promise<{
    default: Middleware;
}>;
/**
 *
 * @param internalEvent the internal event
 * @param initialSearch the initial query string as it was received in the handler
 * @param middlewareLoader Only used for unit test
 * @returns `Promise<MiddlewareEvent | InternalResult>`
 */
export declare function handleMiddleware(internalEvent: InternalEvent, initialSearch: string, middlewareLoader?: MiddlewareLoader): Promise<MiddlewareEvent | InternalResult>;
export {};

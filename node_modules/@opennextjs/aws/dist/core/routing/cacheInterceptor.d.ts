import type { InternalEvent, InternalResult, MiddlewareEvent } from "../../types/open-next";
export declare function cacheInterceptor(event: MiddlewareEvent): Promise<InternalEvent | InternalResult>;

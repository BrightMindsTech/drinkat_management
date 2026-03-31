import type { InternalEvent, InternalResult } from "../types/open-next.js";
import type { OpenNextHandlerOptions } from "../types/overrides.js";
export declare const handler: (...args: any[]) => any;
export declare function defaultHandler(event: InternalEvent, options?: OpenNextHandlerOptions): Promise<InternalResult>;

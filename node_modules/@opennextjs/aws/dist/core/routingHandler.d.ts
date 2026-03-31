import type { InternalEvent, InternalResult, RoutingResult } from "../types/open-next";
import type { AssetResolver } from "../types/overrides";
export declare const MIDDLEWARE_HEADER_PREFIX = "x-middleware-response-";
export declare const MIDDLEWARE_HEADER_PREFIX_LEN: number;
export declare const INTERNAL_HEADER_PREFIX = "x-opennext-";
export declare const INTERNAL_HEADER_INITIAL_URL = "x-opennext-initial-url";
export declare const INTERNAL_HEADER_LOCALE = "x-opennext-locale";
export declare const INTERNAL_HEADER_RESOLVED_ROUTES = "x-opennext-resolved-routes";
export declare const INTERNAL_HEADER_REWRITE_STATUS_CODE = "x-opennext-rewrite-status-code";
export declare const INTERNAL_EVENT_REQUEST_ID = "x-opennext-request-id";
export default function routingHandler(event: InternalEvent, { assetResolver }: {
    assetResolver?: AssetResolver;
}): Promise<InternalResult | RoutingResult>;

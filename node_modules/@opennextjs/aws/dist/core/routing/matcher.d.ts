import type { Header, PrerenderManifest, RedirectDefinition, RewriteDefinition } from "../../types/next-types";
import type { InternalEvent, InternalResult } from "../../types/open-next";
export declare function getNextConfigHeaders(event: InternalEvent, configHeaders?: Header[] | undefined): Record<string, string | undefined>;
/**
 * TODO: This method currently only check for the first match.
 *       It should check for all matches for `beforeFiles` and `afterFiles` rewrite
 *       See https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites
 */
export declare function handleRewrites<T extends RewriteDefinition>(event: InternalEvent, rewrites: T[]): {
    internalEvent: {
        query: Record<string, string | string[]>;
        rawPath: string;
        url: string;
        method: string;
        body?: Buffer;
        headers: Record<string, string>;
        cookies: Record<string, string>;
        remoteAddress: string;
        type: "core";
    };
    __rewrite: T | undefined;
    isExternalRewrite: boolean;
};
export declare function handleRedirects(event: InternalEvent, redirects: RedirectDefinition[]): InternalResult | undefined;
export declare function fixDataPage(internalEvent: InternalEvent, buildId: string): InternalEvent | InternalResult;
export declare function handleFallbackFalse(internalEvent: InternalEvent, prerenderManifest?: PrerenderManifest): {
    event: InternalEvent;
    isISR: boolean;
};

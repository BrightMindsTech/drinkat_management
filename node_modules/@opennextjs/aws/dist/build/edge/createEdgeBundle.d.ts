import { type Plugin } from "esbuild";
import type { MiddlewareInfo } from "../../types/next-types";
import type { IncludedConverter, IncludedOriginResolver, LazyLoadedOverride, OverrideOptions, SplittedFunctionOptions } from "../../types/open-next";
import type { OriginResolver } from "../../types/overrides.js";
import { ContentUpdater } from "../../plugins/content-updater.js";
import { type BuildOptions } from "../helper.js";
type Override = OverrideOptions & {
    originResolver?: LazyLoadedOverride<OriginResolver> | IncludedOriginResolver;
};
interface BuildEdgeBundleOptions {
    middlewareInfo?: MiddlewareInfo;
    entrypoint: string;
    outfile: string;
    options: BuildOptions;
    overrides?: Override;
    defaultConverter?: IncludedConverter;
    additionalInject?: string;
    includeCache?: boolean;
    additionalExternals?: string[];
    onlyBuildOnce?: boolean;
    name: string;
    additionalPlugins?: (contentUpdater: ContentUpdater) => Plugin[];
}
export declare function buildEdgeBundle({ middlewareInfo, entrypoint, outfile, options, defaultConverter, overrides, additionalInject, includeCache, additionalExternals, onlyBuildOnce, name, additionalPlugins: additionalPluginsFn, }: BuildEdgeBundleOptions): Promise<void>;
export declare function generateEdgeBundle(name: string, options: BuildOptions, fnOptions: SplittedFunctionOptions, additionalPlugins?: (contentUpdater: ContentUpdater) => Plugin[]): Promise<void>;
/**
 * Copy wasm files and assets into the destDir.
 */
export declare function copyMiddlewareResources(options: BuildOptions, middlewareInfo: MiddlewareInfo | undefined, destDir: string): void;
export {};

import type { Plugin } from "esbuild";
import type { MiddlewareInfo } from "../types/next-types.js";
export interface IPluginSettings {
    nextDir: string;
    middlewareInfo?: MiddlewareInfo;
    isInCloudflare?: boolean;
}
/**
 * @param opts.nextDir - The path to the .next directory
 * @param opts.middlewareInfo - Information about the middleware
 * @param opts.isInCloudflare - Whether the code runs on the cloudflare runtime
 * @returns
 */
export declare function openNextEdgePlugins({ nextDir, middlewareInfo, isInCloudflare, }: IPluginSettings): Plugin;

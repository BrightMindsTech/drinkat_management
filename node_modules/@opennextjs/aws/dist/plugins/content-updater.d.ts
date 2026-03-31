/**
 * ESBuild stops calling `onLoad` hooks after the first hook returns an updated content.
 *
 * The updater allows multiple plugins to update the content.
 */
import type { OnLoadOptions, Plugin, PluginBuild } from "esbuild";
import type { BuildOptions } from "../build/helper";
import { type Versions } from "../build/patch/codePatcher.js";
export type * from "esbuild";
/**
 * The callbacks returns either an updated content or undefined if the content is unchanged.
 */
export type Callback = (args: {
    contents: string;
    path: string;
}) => string | undefined | Promise<string | undefined>;
/**
 * The callback is called only when `contentFilter` matches the content.
 * It can be used as a fast heuristic to prevent an expensive update.
 */
export type OnUpdateOptions = OnLoadOptions & {
    contentFilter: RegExp;
};
export type Updater = OnUpdateOptions & {
    callback: Callback;
    versions?: Versions;
};
export declare class ContentUpdater {
    private buildOptions;
    updaters: Map<string, Updater[]>;
    constructor(buildOptions: BuildOptions);
    /**
     * Register a callback to update the file content.
     *
     * The callbacks are called in order of registration.
     *
     * @param name The name of the plugin (must be unique).
     * @param updaters A list of code updaters
     * @returns A noop ESBuild plugin.
     */
    updateContent(name: string, updaters: Updater[]): Plugin;
    /**
     * Returns an ESBuild plugin applying the registered updates.
     */
    get plugin(): {
        name: string;
        setup: (build: PluginBuild) => Promise<void>;
    };
}

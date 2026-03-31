/**
 * ESBuild stops calling `onLoad` hooks after the first hook returns an updated content.
 *
 * The updater allows multiple plugins to update the content.
 */
import { readFile } from "node:fs/promises";
import { isVersionInRange } from "../build/patch/codePatcher.js";
export class ContentUpdater {
    buildOptions;
    updaters = new Map();
    constructor(buildOptions) {
        this.buildOptions = buildOptions;
    }
    /**
     * Register a callback to update the file content.
     *
     * The callbacks are called in order of registration.
     *
     * @param name The name of the plugin (must be unique).
     * @param updaters A list of code updaters
     * @returns A noop ESBuild plugin.
     */
    updateContent(name, updaters) {
        if (this.updaters.has(name)) {
            throw new Error(`Plugin "${name}" already registered`);
        }
        this.updaters.set(name, updaters.filter(({ versions }) => isVersionInRange(this.buildOptions.nextVersion, versions)));
        return {
            name,
            setup() { },
        };
    }
    /**
     * Returns an ESBuild plugin applying the registered updates.
     */
    get plugin() {
        return {
            name: "aggregate-on-load",
            setup: async (build) => {
                build.onLoad({ filter: /\.(js|mjs|cjs|jsx|ts|tsx)$/ }, async (args) => {
                    const updaters = Array.from(this.updaters.values()).flat();
                    if (updaters.length === 0) {
                        return;
                    }
                    let contents = await readFile(args.path, "utf-8");
                    for (const { filter, namespace, contentFilter, callback, } of updaters) {
                        if (namespace !== undefined && args.namespace !== namespace) {
                            continue;
                        }
                        if (!args.path.match(filter)) {
                            continue;
                        }
                        if (!contents.match(contentFilter)) {
                            continue;
                        }
                        contents =
                            (await callback({ contents, path: args.path })) ?? contents;
                    }
                    return { contents };
                });
            },
        };
    }
}

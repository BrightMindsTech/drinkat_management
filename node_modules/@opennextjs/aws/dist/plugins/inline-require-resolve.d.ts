import type { Plugin } from "esbuild";
/**
 * Inlines calls to `require.resolve` in JavaScript files.
 *
 * esbuild does not statically analyse `require.resolve` calls, and the polyfill
 * does not include an implementation to handle them. This can be problematic
 * if you attempt to dynamically import a file built by esbuild that unknowingly
 * contains `require.resolve` calls, as they will throw an error during import.
 */
export declare const inlineRequireResolvePlugin: Plugin;

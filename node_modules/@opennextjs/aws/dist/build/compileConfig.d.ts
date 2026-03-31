import type { OpenNextConfig } from "../types/open-next.js";
/**
 * Compiles the OpenNext configuration.
 *
 * The configuration is always compiled for Node.js and for the edge only if needed.
 *
 * @param openNextConfigPath Path to the configuration file. Absolute or relative to cwd.
 * @param nodeExternals Coma separated list of Externals for the Node.js compilation.
 * @param compileEdge Force compiling for the edge runtime when true
 * @return The configuration and the build directory.
 */
export declare function compileOpenNextConfig(openNextConfigPath: string, { nodeExternals, compileEdge }?: {
    nodeExternals?: string | undefined;
    compileEdge?: boolean | undefined;
}): Promise<{
    config: OpenNextConfig;
    buildDir: string;
}>;
/**
 * Compiles the OpenNext configuration for Node.
 *
 * @param openNextConfigPath Path to the configuration file. Absolute or relative to cwd.
 * @param outputDir Folder where to output the compiled config file (`open-next.config.mjs`).
 * @param externals List of packages that should not be bundled.
 * @return Path to the compiled config.
 */
export declare function compileOpenNextConfigNode(openNextConfigPath: string, outputDir: string, externals: string[]): string;
/**
 * Compiles the OpenNext configuration for Edge.
 *
 * @param openNextConfigPath Path to the configuration file. Absolute or relative to cwd.
 * @param outputDir Folder where to output the compiled config file (`open-next.config.edge.mjs`).
 * @param externals List of packages that should not be bundled.
 * @return Path to the compiled config.
 */
export declare function compileOpenNextConfigEdge(openNextConfigPath: string, outputDir: string, externals: string[]): string;

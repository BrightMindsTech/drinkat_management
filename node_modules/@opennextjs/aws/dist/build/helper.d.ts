import type { BuildOptions as ESBuildOptions } from "esbuild";
import type { DefaultOverrideOptions, OpenNextConfig } from "../types/open-next.js";
export type BuildOptions = ReturnType<typeof normalizeOptions>;
export declare function normalizeOptions(config: OpenNextConfig, distDir: string, tempBuildDir: string): {
    appBuildOutputPath: string;
    appPackageJsonPath: string;
    appPath: string;
    appPublicPath: string;
    buildDir: string;
    config: OpenNextConfig;
    debug: boolean;
    minify: boolean;
    monorepoRoot: string;
    nextVersion: string;
    openNextVersion: string;
    openNextDistDir: string;
    outputDir: string;
    packager: "npm" | "pnpm" | "yarn" | "bun";
    tempBuildDir: string;
};
/**
 * Given the path to a project this function detects the project's repository root (whether the project is in a simple
 * repository or a monorepo) as well as the package manager being used.
 *
 * @param appPath The project's path
 * @returns An object containing the root of the project's repo/monorepo as well as the package manager that it uses.
 */
export declare function findPackagerAndRoot(appPath: string): {
    root: string;
    packager: "npm" | "pnpm" | "yarn" | "bun";
};
export declare function esbuildSync(esbuildOptions: ESBuildOptions, options: BuildOptions): void;
export declare function esbuildAsync(esbuildOptions: ESBuildOptions, options: BuildOptions): Promise<void>;
/**
 *  Type of the parameter of `traverseFiles` callbacks
 */
export type TraversePath = {
    absolutePath: string;
    relativePath: string;
};
/**
 * Recursively traverse files in a directory and call `callbackFn` when `conditionFn` returns true
 *
 * The callbacks are passed both the absolute and relative (to root) path to files.
 *
 * @param root - Root directory to search
 * @param conditionFn - Called to determine if `callbackFn` should be called.
 * @param callbackFn - Called when `conditionFn` returns true.
 * @param searchingDir - Directory to search (used for recursion)
 */
export declare function traverseFiles(root: string, conditionFn: (paths: TraversePath) => boolean, callbackFn: (paths: TraversePath) => void, searchingDir?: string): void;
/**
 * Recursively delete files.
 *
 * @see `traverseFiles`.
 *
 * @param root Root directory to search.
 * @param conditionFn Predicate used to delete the files.
 */
export declare function removeFiles(root: string, conditionFn: (paths: TraversePath) => boolean): void;
export declare function getHtmlPages(dotNextPath: string): Set<string>;
export declare function getBuildId(options: BuildOptions): string;
export declare function getOpenNextVersion(): string;
export declare function getNextVersion(appPath: string): string;
export type SemverOp = "=" | ">=" | "<=" | ">" | "<";
/**
 * Compare two semver versions.
 *
 * @param v1 - First version. Can be "latest", otherwise it should be a valid semver version in the format of `major.minor.patch`. Usually is the next version from the package.json without canary suffix. If minor or patch are missing, they are considered 0.
 * @param v2 - Second version. Should not be "latest", it should be a valid semver version in the format of `major.minor.patch`. If minor or patch are missing, they are considered 0.
 * @example
 *     compareSemver("2.0.0", ">=", "1.0.0") === true
 */
export declare function compareSemver(v1: string, operator: SemverOp, v2: string): boolean;
/**
 * Check if a Next.js version is supported by the Next.js team.
 * Major versions are supported for 2 years following their initial release.
 *
 * @param version - The Next.js version to check (semver format)
 * @returns true if the version is currently supported, false otherwise
 */
export declare function isNextVersionSupported(version: string): boolean;
/**
 * Check if the Next.js version is supported and handle errors/warnings.
 *
 * Note: Exits the process with code 1 if the version is not supported.
 *
 * @param options - Build options containing Next.js version
 * @param allowUnsupportedNextVersion - Whether to allow using an unmaintained Next.js version
 */
export declare function checkNextVersionSupport(nextVersion: string, allowUnsupportedNextVersion: boolean, flagName?: string): void;
export declare function copyOpenNextConfig(inputDir: string, outputDir: string, isEdge?: boolean): void;
export declare function copyEnvFile(appPath: string, packagePath: string, outputPath: string): void;
/**
 * Finds the path to the Next configuration file if it exists.
 *
 * @param appPath The directory to check for the Next config file
 * @returns An object with the full path to Next config file alongside a flag indicating whether the file is in typescript if it exists, undefined otherwise
 */
export declare function findNextConfig({ appPath, }: Pick<BuildOptions, "appPath">): {
    path: string;
    isTypescript: boolean;
} | undefined;
/**
 * Check we are in a Nextjs app by looking for the Nextjs config file.
 */
export declare function checkRunningInsideNextjsApp({ appPath, }: Pick<BuildOptions, "appPath">): void;
export declare function printNextjsVersion(options: BuildOptions): void;
export declare function printOpenNextVersion(options: BuildOptions): void;
/**
 * Populates the build directory with the compiled configuration files.
 *
 * We need to get the build relative to the cwd to find the compiled config.
 * This is needed for the case where the app is a single-version monorepo
 * and the package.json is in the root of the monorepo where the build is in
 * the app directory, but the compiled config is in the root of the monorepo.
 */
export declare function initOutputDir(options: BuildOptions): void;
/**
 * @returns Whether the edge runtime is used
 */
export declare function isEdgeRuntime(overrides: DefaultOverrideOptions | undefined): Promise<boolean | undefined>;
export declare function getPackagePath(options: BuildOptions): string;
/**
 * Returns the Next.js runtime used: "webpack" or "turbopack"
 *
 * Must be called after building the Next.js app.
 *
 * @param options
 * @returns the Next.js runtime used: "webpack" or "turbopack"
 */
export declare function getBundlerRuntime(options: BuildOptions): "webpack" | "turbopack";

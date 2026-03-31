/**
 * Copies a file and ensures the destination is writable.
 * This is necessary because copyFileSync preserves file permissions,
 * and source files may be read-only (e.g., in Bazel's node_modules).
 * Without this, subsequent patches would fail with EACCES errors.
 */
export declare function copyFileAndMakeOwnerWritable(src: string, dest: string): void;
export declare function isExcluded(srcPath: string): boolean;
interface CopyTracedFilesOptions {
    buildOutputPath: string;
    packagePath: string;
    outputDir: string;
    routes: string[];
    bundledNextServer: boolean;
    skipServerFiles?: boolean;
}
export declare function getManifests(nextDir: string): {
    buildId: string;
    config: import("../types/next-types.js").NextConfig;
    prerenderManifest: import("../types/next-types.js").PrerenderManifest | undefined;
    pagesManifest: Record<string, string>;
    appPathsManifest: Record<string, string>;
    middlewareManifest: import("../types/next-types.js").MiddlewareManifest;
    functionsConfigManifest: import("../types/next-types.js").FunctionsConfigManifest;
};
export declare function copyTracedFiles({ buildOutputPath, packagePath, outputDir, routes, bundledNextServer, skipServerFiles, }: CopyTracedFilesOptions): Promise<{
    tracedFiles: string[];
    nodePackages: Map<string, string>;
    manifests: {
        buildId: string;
        config: import("../types/next-types.js").NextConfig;
        prerenderManifest: import("../types/next-types.js").PrerenderManifest | undefined;
        pagesManifest: Record<string, string>;
        appPathsManifest: Record<string, string>;
        middlewareManifest: import("../types/next-types.js").MiddlewareManifest;
        functionsConfigManifest: import("../types/next-types.js").FunctionsConfigManifest;
    };
}>;
export {};

import type { getManifests } from "../copyTracedFiles.js";
import * as buildHelper from "../helper.js";
/**
 * Accepted formats:
 * - `">=16.0.0"`
 * - `"<=16.0.0"`
 * - `">=16.0.0 <=17.0.0"`
 *
 * **Be careful with spaces**
 */
export type Versions = `>=${number}.${number}.${number} <=${number}.${number}.${number}` | `>=${number}.${number}.${number}` | `<=${number}.${number}.${number}`;
export type PatchCodeFn = (args: {
    /**
     * The code of the file that needs to be patched
     */
    code: string;
    /**
     * The final path of the file that needs to be patched
     */
    filePath: string;
    /**
     * All files that are traced and will be included in the bundle
     */
    tracedFiles: string[];
    /**
     * Next.js manifests that are used by Next at runtime
     */
    manifests: ReturnType<typeof getManifests>;
    /**
     * OpenNext build options
     */
    buildOptions: buildHelper.BuildOptions;
}) => Promise<string>;
interface IndividualPatch {
    pathFilter: RegExp;
    contentFilter?: RegExp;
    patchCode: PatchCodeFn;
    versions?: Versions;
}
export interface CodePatcher {
    name: string;
    patches: IndividualPatch[];
}
export declare function parseVersions(versions?: Versions): {
    before?: string;
    after?: string;
};
/**
 * Check whether the version is in the range
 *
 * @param version A semver version
 * @param versionRange A version range
 * @returns whether the version satisfies the range
 */
export declare function isVersionInRange(version: string, versionRange?: Versions): boolean;
export declare function applyCodePatches(buildOptions: buildHelper.BuildOptions, tracedFiles: string[], manifests: ReturnType<typeof getManifests>, codePatcher: CodePatcher[]): Promise<void>;
export {};

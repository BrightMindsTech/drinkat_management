import * as fs from "node:fs/promises";
import logger from "../../logger.js";
import * as buildHelper from "../helper.js";
export function parseVersions(versions) {
    if (!versions) {
        return {};
    }
    // We need to use regex to extract the versions
    const versionRegex = /([<>]=)(\d+\.\d+\.\d+)/g;
    const matches = Array.from(versions.matchAll(versionRegex));
    if (matches.length === 0) {
        throw new Error("Invalid version range, no matches found");
    }
    if (matches.length > 2) {
        throw new Error("Invalid version range, too many matches found");
    }
    let after;
    let before;
    for (const match of matches) {
        const [_, operator, version] = match;
        if (operator === "<=") {
            before = version;
        }
        else {
            after = version;
        }
    }
    // Before returning we reconstruct the version string and compare it to the original
    // If they don't match we throw an error
    // We have to do this because template literal types here seems to allow for extra spaces
    // that could easily break the version comparison and allow some patch to be applied on incorrect versions
    // This might even go unnoticed
    const reconstructedVersion = `${after ? `>=${after}` : ""}${before ? `${after ? " " : ""}<=${before}` : ""}`;
    if (reconstructedVersion !== versions) {
        throw new Error("Invalid version range, the reconstructed version does not match the original");
    }
    return {
        before,
        after,
    };
}
/**
 * Check whether the version is in the range
 *
 * @param version A semver version
 * @param versionRange A version range
 * @returns whether the version satisfies the range
 */
export function isVersionInRange(version, versionRange) {
    const { before, after } = parseVersions(versionRange);
    let inRange = true;
    if (before) {
        inRange &&= buildHelper.compareSemver(version, "<=", before);
    }
    if (after) {
        inRange &&= buildHelper.compareSemver(version, ">=", after);
    }
    return inRange;
}
export async function applyCodePatches(buildOptions, tracedFiles, manifests, codePatcher) {
    logger.time("Applying code patches");
    // We first filter against the version
    // We also flatten the array of patches so that we get both the name and all the necessary patches
    const patchesToApply = codePatcher.flatMap(({ name, patches }) => {
        return patches
            .filter(({ versions }) => isVersionInRange(buildOptions.nextVersion, versions))
            .map((patch) => ({ patch, name }));
    });
    await Promise.all(tracedFiles.map(async (filePath) => {
        // We check the filename against the filter to see if we should apply the patch
        const patchMatchingPath = patchesToApply.filter(({ patch }) => {
            return filePath.match(patch.pathFilter);
        });
        if (patchMatchingPath.length === 0) {
            return;
        }
        const content = await fs.readFile(filePath, "utf-8");
        // We filter a last time against the content this time
        const patchToApply = patchMatchingPath.filter(({ patch }) => {
            if (!patch.contentFilter) {
                return true;
            }
            return content.match(patch.contentFilter);
        });
        if (patchToApply.length === 0) {
            return;
        }
        // We apply the patches
        let patchedContent = content;
        for (const { patch, name } of patchToApply) {
            logger.debug(`Applying code patch: ${name} to ${filePath}`);
            patchedContent = await patch.patchCode({
                code: patchedContent,
                filePath,
                tracedFiles,
                manifests,
                buildOptions,
            });
        }
        await fs.writeFile(filePath, patchedContent);
    }));
    logger.timeEnd("Applying code patches");
}

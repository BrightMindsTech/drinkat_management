import type { CodePatcher } from "../codePatcher.js";
/**
 * Drops `require("./node-environment-extensions/error-inspect");`
 *
 * This is to avoid pulling babel (~4MB)
 */
export declare const rule = "\nrule:\n  pattern: require(\"./node-environment-extensions/error-inspect\");\nfix: |-\n  // Removed by OpenNext\n  // require(\"./node-environment-extensions/error-inspect\");\n";
export declare const patchNodeEnvironment: CodePatcher;

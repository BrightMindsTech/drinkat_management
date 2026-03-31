import type { CodePatcher } from "../codePatcher.js";
export declare const disablePreloadingRule = "\nrule:\n  kind: statement_block\n  inside:\n    kind: if_statement\n    any:\n      - has:\n          kind: member_expression\n          pattern: this.nextConfig.experimental.preloadEntriesOnStart\n          stopBy: end\n      - has:\n          kind: binary_expression\n          pattern: appDocumentPreloading === true\n          stopBy: end\nfix:\n  '{}'\n";
export declare const removeMiddlewareManifestRule = "\nrule:\n  kind: statement_block\n  inside:\n    kind: method_definition\n    has:\n      kind: property_identifier\n      regex: ^getMiddlewareManifest$\nfix:\n  '{return null;}'\n";
export declare const emptyHandleNextImageRequestRule = "\nrule:\n  kind: assignment_expression\n  pattern: this.handleNextImageRequest = $VALUE\n  inside:\n    kind: method_definition\n    stopBy: end\n    has:\n      kind: property_identifier\n      regex: ^constructor$\n    inside:\n      kind: class_body\nfix:\n  this.handleNextImageRequest = async (req, res, parsedUrl) => false\n";
/**
 * Swaps the body for a throwing implementation
 *
 * @param methodName The name of the method
 * @returns A rule to replace the body with a `throw`
 */
export declare function createEmptyBodyRule(methodName: string): string;
export declare const patchNextServer: CodePatcher;

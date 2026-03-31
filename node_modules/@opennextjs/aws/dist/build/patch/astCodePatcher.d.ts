import { type Edit, Lang, type NapiConfig, type SgNode } from "@ast-grep/napi";
import type { PatchCodeFn } from "./codePatcher";
export type * from "@ast-grep/napi";
/**
 * fix has the same meaning as in yaml rules
 * see https://ast-grep.github.io/guide/rewrite-code.html#using-fix-in-yaml-rule
 */
export type RuleConfig = NapiConfig & {
    fix?: string;
};
/**
 * Returns the `Edit`s and `Match`es for an ast-grep rule in yaml format
 *
 * The rule must have a `fix` to rewrite the matched node.
 *
 * Tip: use https://ast-grep.github.io/playground.html to create rules.
 *
 * @param rule The rule. Either a yaml string or an instance of `RuleConfig`
 * @param root The root node
 * @param once only apply once
 * @returns A list of edits and a list of matches.
 */
export declare function applyRule(rule: string | RuleConfig, root: SgNode, { once }?: {
    once?: boolean | undefined;
}): {
    edits: Edit[];
    matches: SgNode[];
};
/**
 * Parse a file and obtain its root.
 *
 * @param path The file path
 * @param lang The language to parse. Defaults to TypeScript.
 * @returns The root for the file.
 */
export declare function parseFile(path: string, lang?: Lang): SgNode;
/**
 * Patches the code from by applying the rule.
 *
 * This function is mainly for on off edits and tests,
 * use `getRuleEdits` to apply multiple rules.
 *
 * @param code The source code
 * @param rule The astgrep rule (yaml or NapiConfig)
 * @param lang The language used by the source code
 * @param lang Whether to apply the rule only once
 * @returns The patched code
 */
export declare function patchCode(code: string, rule: string | RuleConfig, { lang, once }?: {
    lang?: Lang | undefined;
    once?: boolean | undefined;
}): string;
/**
 * @param rule
 * @param lang
 * @returns a callback applying the the rule.
 */
export declare function createPatchCode(rule: string | RuleConfig, lang?: Lang): PatchCodeFn;

import * as buildHelper from "../../helper.js";
import type { CodePatcher } from "../codePatcher";
/**
 * Creates a rule to replace `process.env.${envVar}` by `value` in the condition of if statements
 * This is used to avoid loading unnecessary deps at runtime
 * @param envVar The env var that we want to replace
 * @param value The value that we want to replace it with
 * @returns
 */
export declare const envVarRuleCreator: (envVar: string, value: string) => string;
export declare function getEnvVarsPatch(BuildOptions: buildHelper.BuildOptions): CodePatcher;

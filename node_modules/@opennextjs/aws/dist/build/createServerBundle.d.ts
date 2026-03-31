import type { Plugin } from "esbuild";
import { ContentUpdater } from "../plugins/content-updater.js";
import * as buildHelper from "./helper.js";
import { type CodePatcher } from "./patch/codePatcher.js";
interface CodeCustomization {
    additionalCodePatches?: CodePatcher[];
    additionalPlugins?: (contentUpdater: ContentUpdater) => Plugin[];
}
export declare function createServerBundle(options: buildHelper.BuildOptions, codeCustomization?: CodeCustomization): Promise<void>;
export {};

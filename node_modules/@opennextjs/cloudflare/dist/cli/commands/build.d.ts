import type yargs from "yargs";
import type { WithWranglerArgs } from "./utils/utils.js";
/**
 * Implementation of the `opennextjs-cloudflare build` command.
 *
 * @param args
 */
export declare function buildCommand(args: WithWranglerArgs<{
    skipNextBuild: boolean;
    noMinify: boolean;
    skipWranglerConfigCheck: boolean;
    openNextConfigPath: string | undefined;
    dangerouslyUseUnsupportedNextVersion: boolean;
}>): Promise<void>;
/**
 * Add the `build` command to yargs configuration.
 *
 * Consumes 1 positional parameter.
 */
export declare function addBuildCommand<T extends yargs.Argv>(y: T): yargs.Argv<{}>;

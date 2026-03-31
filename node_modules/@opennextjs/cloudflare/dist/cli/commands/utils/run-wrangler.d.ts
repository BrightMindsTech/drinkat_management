export type PackagerDetails = {
    /** The name of the package manager. */
    packager: "npm" | "pnpm" | "yarn" | "bun";
    /** The root directory of the monorepo, used to locate package.json. */
    monorepoRoot: string;
};
export type WranglerTarget = "local" | "remote";
export type WranglerCommandResult = {
    success: boolean;
    stdout: string;
    stderr: string;
};
type WranglerOptions = {
    target?: WranglerTarget;
    environment?: string;
    configPath?: string;
    logging?: "all" | "error" | "none";
    env?: Record<string, string>;
};
/**
 * Runs a wrangler command using the project's package manager.
 *
 * Spawns a synchronous child process, appending the provided arguments and any flags derived
 * from the wrangler options.
 *
 * The `.env` file loading by wrangler is disabled to let the adapter handle environment variables.
 *
 * @param options The package manager details used to invoke wrangler.
 * @param args The CLI arguments to pass to wrangler
 * @param wranglerOpts Optional configuration for the wrangler invocation.
 * @param wranglerOpts.target Whether to run wrangler in `"local"` or `"remote"` mode
 * @param wranglerOpts.environment The wrangler environment name
 * @param wranglerOpts.configPath Path to a wrangler configuration file
 * @param wranglerOpts.logging Controls stdio behavior:
 *   - `"all"` inherits stdin/stdout for interactive use,
 *   - `"error"` pipes all output and only displays it on failure,
 *   - `"none"` suppresses all output.
 *   When not specified, behaves the same as `"all"`.
 * @param wranglerOpts.env Additional environment variables to pass to the spawned process.
 * @returns The command result
 */
export declare function runWrangler(options: PackagerDetails, args: string[], wranglerOpts?: WranglerOptions): WranglerCommandResult;
export declare function isWranglerTarget(v: string | undefined): v is WranglerTarget;
export {};

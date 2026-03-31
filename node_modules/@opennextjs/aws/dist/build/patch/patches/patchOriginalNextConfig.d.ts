import * as buildHelper from "../../helper.js";
/**
 * Next 16.1.0-16.1.4 has missing fields in `required-server-files.json`:
 * - `skipTrailingSlashRedirect`
 * - `serverExternalPackages`
 *
 * This patch adds them back in by compiling and importing the user's `next.config.js` file.
 *
 * It is a regression in https://github.com/vercel/next.js/pull/86830 (16.1.0)
 * Fixed in https://github.com/vercel/next.js/pull/88733 (16.1.4)
 */
export declare function patchOriginalNextConfig(options: buildHelper.BuildOptions): Promise<void>;

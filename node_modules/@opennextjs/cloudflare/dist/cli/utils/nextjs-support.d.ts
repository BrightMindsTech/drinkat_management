import * as buildHelper from "@opennextjs/aws/build/helper.js";
/**
 * Validates that the Next.js version is supported and checks wrangler compatibility.
 *
 * Note: this function assumes that wrangler is installed.
 *
 * @param options.nextVersion The detected Next.js version string
 * @throws {Error} If the Next.js version is unsupported
 */
export declare function ensureNextjsVersionSupported({ nextVersion, }: Pick<buildHelper.BuildOptions, "nextVersion">): Promise<void>;

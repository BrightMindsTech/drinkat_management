import type { DomainLocale, i18nConfig } from "../../../types/next-types";
import type { InternalEvent, InternalResult } from "../../../types/open-next";
/**
 * @param arg an object containing the hostname and detectedLocale
 * @returns The `DomainLocale` object if a domain is detected, `undefined` otherwise
 */
export declare function detectDomainLocale({ hostname, detectedLocale, }: {
    hostname?: string;
    detectedLocale?: string;
}): DomainLocale | undefined;
/**
 *
 * @param internalEvent
 * @param i18n
 * @returns The detected locale, if `localeDetection` is set to `false` it will return the default locale **or** the domain default locale if a domain is detected.
 */
export declare function detectLocale(internalEvent: InternalEvent, i18n: i18nConfig): string;
/**
 * This function is used for OpenNext internal routing to localize the path for next config rewrite/redirects/headers and the middleware
 * @param internalEvent
 * @returns The localized path
 */
export declare function localizePath(internalEvent: InternalEvent): string;
/**
 *
 * @param internalEvent
 * In this function, for domain locale redirect we need to rely on the host to be present and correct
 * @returns `false` if no redirect is needed, `InternalResult` if a redirect is needed
 */
export declare function handleLocaleRedirect(internalEvent: InternalEvent): false | InternalResult;

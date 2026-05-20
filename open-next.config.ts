// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
// import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
	// For best results consider enabling R2 caching
	// See https://opennext.js.org/cloudflare/caching for more details
	// incrementalCache: r2IncrementalCache
	dangerous: {
		/**
		 * On Cloudflare, middleware Set-Cookie headers can override NextAuth handler cookies
		 * (wrong order → session cleared). Prefer handler cookies on auth routes.
		 * @see https://github.com/opennextjs/opennextjs-cloudflare/issues/606
		 */
		headersAndCookiesPriority(event) {
			const path = event.rawPath || new URL(event.url, "http://localhost").pathname;
			if (path.startsWith("/api/auth/")) return "handler";
			return "middleware";
		},
	},
});

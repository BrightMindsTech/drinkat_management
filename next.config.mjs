import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Only wire Wrangler/miniflare/workerd for `next dev`. `next build` runs with NODE_ENV=production
// and should not load platform-specific workerd binaries (avoids mismatches when node_modules
// was copied across OS/arch or CI environments).
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prisma publishes workerd-specific entrypoints (WASM query engine with driver adapters).
  // Without this, Next traces the Node build and OpenNext bundles library.js → native .so.node on Workers.
  // See https://opennext.js.org/cloudflare/howtos/db
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  typescript: {
    // TODO: tighten fetch Response.json() typings across components, then remove this
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

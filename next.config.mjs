import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

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

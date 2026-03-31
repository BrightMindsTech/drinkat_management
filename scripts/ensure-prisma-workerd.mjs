/**
 * OpenNext's copyWorkerdPackages skips full Prisma copies on Windows because
 * `match.groups.pkg` uses backslashes (e.g. `.prisma\\client`) while
 * serverExternalPackages uses `.prisma/client` — so the condition never matches.
 * This script mirrors copyWorkerdPackages for those packages after the build.
 */
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformPackageJson } from "../node_modules/@opennextjs/cloudflare/dist/cli/build/utils/workerd.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outRoot = path.join(root, ".open-next/server-functions/default/node_modules");
const handlerMarker = path.join(root, ".open-next/server-functions/default/handler.mjs");

if (!existsSync(handlerMarker)) {
  console.warn("[ensure-prisma-workerd] No handler.mjs — run opennextjs-cloudflare build first");
  process.exit(0);
}

async function copyWorkerdPkg(relFromNodeModules) {
  const src = path.join(root, "node_modules", ...relFromNodeModules.split("/"));
  const dst = path.join(outRoot, ...relFromNodeModules.split("/"));
  if (!existsSync(path.join(src, "package.json"))) {
    console.warn(`[ensure-prisma-workerd] Missing ${src} — run: npx prisma generate`);
    return;
  }
  await fs.cp(src, dst, { recursive: true, force: true });
  const raw = await fs.readFile(path.join(dst, "package.json"), "utf8");
  const { transformed } = transformPackageJson(JSON.parse(raw));
  await fs.writeFile(path.join(dst, "package.json"), JSON.stringify(transformed), "utf8");
  console.log(`[ensure-prisma-workerd] Copied ${relFromNodeModules} (workerd package.json)`);
}

await copyWorkerdPkg(".prisma/client");
await copyWorkerdPkg("@prisma/client");

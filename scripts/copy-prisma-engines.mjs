/**
 * OpenNext's bundler copies `node_modules/.prisma/client` JS but often omits large native
 * query-engine binaries. Cloudflare Workers (Linux) need `libquery_engine-debian-openssl-1.1.x.so.node`
 * next to the generated client — same path Prisma searches at runtime.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const engine = 'libquery_engine-debian-openssl-1.1.x.so.node';
const src = path.join(root, 'node_modules', '.prisma', 'client', engine);
const destDir = path.join(
  root,
  '.open-next',
  'server-functions',
  'default',
  'node_modules',
  '.prisma',
  'client'
);
const dest = path.join(destDir, engine);

if (!fs.existsSync(src)) {
  console.error(`[copy-prisma-engines] Missing ${src} — run: npx prisma generate`);
  process.exit(1);
}
if (!fs.existsSync(destDir)) {
  console.error('[copy-prisma-engines] Missing OpenNext output — run: opennextjs-cloudflare build');
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`[copy-prisma-engines] Copied ${engine} into .open-next server bundle.`);

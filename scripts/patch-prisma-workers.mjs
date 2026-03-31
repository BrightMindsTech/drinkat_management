/**
 * Prisma's runtime uses eval("__dirname") to resolve the query engine path. Cloudflare Workers
 * disallow eval ("Code generation from strings disallowed for this context"). Replace with plain
 * __dirname — valid in Node (local dev) and set by OpenNext on Workers.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  'node_modules/@prisma/client/runtime/library.js',
  'node_modules/@prisma/client/runtime/binary.js',
];

let changed = 0;
for (const rel of targets) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) continue;
  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes('eval("__dirname")')) continue;
  const next = s.replaceAll('eval("__dirname")', '__dirname');
  if (next !== s) {
    fs.writeFileSync(file, next);
    changed++;
    console.log(`[patch-prisma-workers] Patched ${rel}`);
  }
}
if (changed === 0) {
  console.log('[patch-prisma-workers] No changes (already patched or Prisma layout changed).');
}

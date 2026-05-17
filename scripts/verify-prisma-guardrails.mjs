#!/usr/bin/env node
/**
 * Static guardrails: prevent reintroducing the Worker Prisma outage (React cache() on D1).
 * Run in CI and before deploy (`npm run verify`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prismaPath = path.join(__dirname, '..', 'src', 'lib', 'prisma.ts');
const src = fs.readFileSync(prismaPath, 'utf8');

const errors = [];

if (/from\s+['"]react['"]/.test(src) && /\bcache\s*\(/.test(src)) {
  errors.push('prisma.ts must not import cache() from "react" (causes cross-request D1 reuse on Workers).');
}

if (!src.includes('workerPrismaByRequest') || !src.includes('WeakMap')) {
  errors.push('prisma.ts must cache Worker Prisma clients in a WeakMap keyed by Cloudflare request context.');
}

if (/getWorkerPrisma\s*=\s*cache\s*\(/.test(src)) {
  errors.push('getWorkerPrisma must not be wrapped in React cache().');
}

if (errors.length > 0) {
  console.error('FAIL: Prisma guardrails\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log('OK: Prisma guardrails (no React cache on D1 client)');

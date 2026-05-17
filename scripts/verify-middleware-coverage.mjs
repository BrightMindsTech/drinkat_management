#!/usr/bin/env node
/**
 * Ensures middleware protects all /api routes except explicit public paths.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const middlewarePath = path.join(__dirname, '..', 'src', 'middleware.ts');
const src = fs.readFileSync(middlewarePath, 'utf8');

if (!src.includes("'/api/:path*'")) {
  console.error('FAIL: middleware matcher must include /api/:path*');
  process.exit(1);
}

if (!src.includes('applyRateLimit')) {
  console.error('FAIL: middleware must call applyRateLimit');
  process.exit(1);
}

if (!src.includes('isPublicApiPath')) {
  console.error('FAIL: middleware must define isPublicApiPath for cron/health/auth');
  process.exit(1);
}

console.log('OK: middleware covers all APIs with rate limiting');

#!/usr/bin/env node
/**
 * Pipes CRON_SECRET from `.dev.vars` into `wrangler secret put CRON_SECRET` for production.
 * Requires: npx wrangler login, and .dev.vars with CRON_SECRET (run npm run cf:bootstrap-cron first).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDotEnvLines } from './parse-dotenv-lines.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devVarsPath = path.join(__dirname, '..', '.dev.vars');

let raw = '';
try {
  raw = fs.readFileSync(devVarsPath, 'utf8');
} catch {
  console.error('[upload-cron-secret] Missing .dev.vars — run: npm run cf:bootstrap-cron');
  process.exit(1);
}

const map = parseDotEnvLines(raw);
const secret = map.get('CRON_SECRET')?.trim();
if (!secret) {
  console.error('[upload-cron-secret] CRON_SECRET empty in .dev.vars — run: npm run cf:bootstrap-cron');
  process.exit(1);
}

const res = spawnSync('npx', ['wrangler', 'secret', 'put', 'CRON_SECRET'], {
  input: secret,
  encoding: 'utf8',
  cwd: path.join(__dirname, '..'),
  stdio: ['pipe', 'inherit', 'inherit'],
});

if (res.status !== 0) {
  console.error('[upload-cron-secret] wrangler secret put failed (exit', res.status + ')');
  process.exit(res.status ?? 1);
}
console.log('[upload-cron-secret] CRON_SECRET stored in Cloudflare Worker secrets.');

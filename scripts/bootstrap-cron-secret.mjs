#!/usr/bin/env node
/**
 * Ensures `.dev.vars` has a strong CRON_SECRET for local wrangler / parity with production.
 * Safe to run anytime; reuses existing secret if already set.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDotEnvLines, serializeDotEnv } from './parse-dotenv-lines.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const devVarsPath = path.join(root, '.dev.vars');

let raw = '';
try {
  raw = fs.readFileSync(devVarsPath, 'utf8');
} catch {
  raw = '';
}

const map = parseDotEnvLines(raw);
if (map.get('CRON_SECRET')?.trim()) {
  console.log('[bootstrap-cron-secret] CRON_SECRET already set in .dev.vars (unchanged).');
  process.exit(0);
}

const secret = crypto.randomBytes(32).toString('hex');
map.set('CRON_SECRET', secret);

const header =
  '# Auto-generated / updated by scripts/bootstrap-cron-secret.mjs\n# Used by Wrangler for local dev. Do not commit (.gitignore).\n';
const body = serializeDotEnv(map, ['CRON_SECRET']);
fs.writeFileSync(devVarsPath, header + body, 'utf8');
console.log('[bootstrap-cron-secret] Wrote CRON_SECRET to .dev.vars');
console.log('[bootstrap-cron-secret] Next: npm run cf:upload-cron-secret  (after wrangler login)');
console.log('[bootstrap-cron-secret] Then: npm run deploy');

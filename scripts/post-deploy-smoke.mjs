#!/usr/bin/env node
/**
 * Fails the deploy if production cannot query the database.
 * Set DEPLOY_SMOKE_URL to override the default Workers URL.
 */
const base =
  process.env.DEPLOY_SMOKE_URL?.replace(/\/$/, '') ??
  'https://drinkat-management.technologiesbrightminds.workers.dev';

const url = `${base}/api/health/ready`;
const maxAttempts = 8;
const delayMs = 3000;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function checkOnce() {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function main() {
  console.log(`[post-deploy-smoke] GET ${url}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { res, body } = await checkOnce();
      if (res.ok && body?.ok === true && body?.db === true) {
        console.log('[post-deploy-smoke] OK — database reachable');
        return;
      }
      console.warn(
        `[post-deploy-smoke] attempt ${attempt}/${maxAttempts}: HTTP ${res.status}`,
        JSON.stringify(body)
      );
    } catch (e) {
      console.warn(`[post-deploy-smoke] attempt ${attempt}/${maxAttempts}:`, e instanceof Error ? e.message : e);
    }
    if (attempt < maxAttempts) await sleep(delayMs);
  }

  console.error('[post-deploy-smoke] FAILED — deploy rolled out but /api/health/ready did not pass');
  process.exit(1);
}

main();

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

/** Back-to-back hits catch Prisma clients leaked across requests (React cache bug on Workers). */
async function checkBurst(count = 5) {
  for (let i = 0; i < count; i++) {
    const { res, body } = await checkOnce();
    if (!res.ok || body?.ok !== true || body?.db !== true) {
      return { ok: false, res, body, index: i + 1 };
    }
  }
  return { ok: true };
}

async function main() {
  console.log(`[post-deploy-smoke] GET ${url} (burst of 5 per attempt)`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const burst = await checkBurst(5);
      if (burst.ok) {
        console.log('[post-deploy-smoke] OK — database reachable (5 consecutive checks)');
        return;
      }
      console.warn(
        `[post-deploy-smoke] attempt ${attempt}/${maxAttempts}: failed on burst #${burst.index} HTTP ${burst.res?.status}`,
        JSON.stringify(burst.body)
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

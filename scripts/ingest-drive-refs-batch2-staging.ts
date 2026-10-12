/**
 * Ingest Owner Drive folders 1–5 into staging PhotoCheckReference rows.
 * Staging only. Does not enable employees or activate catalog types.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const PRODUCTION_HOST = 'drinkat-management.technologiesbrightminds.workers.dev';
const STAGING_HOST = 'drinkat-qc-staging.technologiesbrightminds.workers.dev';

function loadStagingVars() {
  const raw = readFileSync(new URL('../.dev.vars.staging', import.meta.url), 'utf8');
  const map = new Map<string, string>();
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    map.set(t.slice(0, i), t.slice(i + 1).replace(/^"|"$/g, ''));
  }
  return map;
}

const vars = loadStagingVars();
const base = (vars.get('STAGING_URL') ?? '').replace(/\/$/, '');
const password = vars.get('STAGING_TEST_PASSWORD') ?? '';
if (!base.includes(STAGING_HOST) || base.includes(PRODUCTION_HOST)) {
  throw new Error('REFUSED: not isolated staging');
}

type CookieJar = string[];

async function login(email: string): Promise<CookieJar> {
  const csrfRes = await fetch(`${base}/api/auth/csrf`, { redirect: 'manual' });
  const csrfCookies = csrfRes.headers.getSetCookie?.() ?? [];
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const cookieHeader = csrfCookies.map((c) => c.split(';')[0]).join('; ');
  const res = await fetch(`${base}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader,
      Origin: base,
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      json: 'true',
      callbackUrl: `${base}/dashboard`,
    }),
    redirect: 'manual',
  });
  const jar = [...csrfCookies, ...(res.headers.getSetCookie?.() ?? [])].map((c) => c.split(';')[0]);
  const session = await fetch(`${base}/api/auth/session`, { headers: { Cookie: jar.join('; ') } });
  const json = (await session.json()) as { user?: { email?: string } };
  assert.equal(json.user?.email, email, `login failed for ${email}: callback ${res.status}`);
  return jar;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function req(jar: CookieJar, path: string, init: RequestInit = {}, attempt = 0): Promise<{ status: number; json: unknown }> {
  const headers = new Headers(init.headers);
  headers.set('Cookie', jar.join('; '));
  if (!headers.has('Origin')) headers.set('Origin', base);
  const res = await fetch(`${base}${path}`, { ...init, headers, redirect: 'manual' });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (res.status === 429 && attempt < 8) {
    const retry = Number((json as { retryAfterSec?: number })?.retryAfterSec ?? 8);
    await sleep((retry + 1) * 1000);
    return req(jar, path, init, attempt + 1);
  }
  return { status: res.status, json };
}

type Job = {
  folder: number;
  id: string;
  name: string;
  path: string;
  typeCode: string;
  approve: boolean;
  reason: string;
};

const FRYER_APPROVE = new Set([
  '14Xu0PNIesI0eN03yNEZJl0DnqsKatERw',
  '1CQYPASV17sx4l502Abso_H_Ohj11Kdju',
  '1p40qE0O0xLwCBMyjyGw7ILEfbT-dv3u7',
  '11xC2mM8nblQlYELoLheaXl-crNH6SWBP',
  '1xeiOlRyE7klaxczpwwSPFiCqcVu3Ockq',
  '1A9hxolhKX0vlsqeEr42ui3WJ7A_ULQl7',
  '1N5XQv9R5cC5fgkyfIKeKQ89uUgGw_VHZ',
]);
const HOOD_APPROVE = new Set([
  '1RraCAYAz7ZNj_6CgCHkutzyhP6BYcLM2',
  '1oPWGfV6fFOaoKYyKdBZ2VaD-7oJakIWC',
]);
const ESPRESSO_UNAPPROVE = new Set([
  '1Rr8-frUrRX0uR9txKdklRgRH8XIPlIpg',
  '1yLWPP8iff_xmPBLm_Yi2tgFzahLjN4v1',
]);

function buildJobs(): Job[] {
  const man = JSON.parse(readFileSync('/tmp/drinkat-ref-photos/manifest.json', 'utf8')) as {
    files: { folder: number; id: string; name: string }[];
  };
  const jobs: Job[] = [];
  for (const f of man.files) {
    const path = `/tmp/drinkat-ref-photos/dl/f${f.folder}/${f.id}.jpg`;
    if (f.folder === 1) {
      jobs.push({
        ...f,
        path,
        typeCode: 'table_cleaning',
        approve: true,
        reason: 'Outdoor seating benches/tables and stairs visible',
      });
      continue;
    }
    if (f.folder === 2) {
      jobs.push({
        ...f,
        path,
        typeCode: 'shelves_cabinets_cleaning',
        approve: true,
        reason: 'Cabinets/shelves/drawers (Sunday cabinets-shelves folder)',
      });
      continue;
    }
    if (f.folder === 3) {
      jobs.push({
        ...f,
        path,
        typeCode: 'preparation_refrigerator',
        approve: false,
        reason: 'Chest freezer — catalog has no freezer type; closest kitchen cold unit left unapproved',
      });
      continue;
    }
    if (f.folder === 4) {
      const mismatch = ESPRESSO_UNAPPROVE.has(f.id);
      jobs.push({
        ...f,
        path,
        typeCode: 'espresso_machine_cleaning',
        approve: !mismatch,
        reason: mismatch
          ? 'Powder drink dispenser interior, not espresso/grinder/PulyCaff'
          : 'Espresso machine, grinder, or PulyCaff backflush',
      });
      continue;
    }
    if (f.folder === 5) {
      if (HOOD_APPROVE.has(f.id)) {
        jobs.push({
          ...f,
          path,
          typeCode: 'ventilation_extractor_cleaning',
          approve: true,
          reason: 'Kitchen extractor hood — provisional type, refs only, type stays inactive',
        });
        continue;
      }
      const fryer = FRYER_APPROVE.has(f.id);
      jobs.push({
        ...f,
        path,
        typeCode: 'fryer_cleanliness',
        approve: fryer,
        reason: fryer
          ? 'Fryer vat/baskets clearly visible'
          : 'Mismatch (laptop screenshot, solid-red, stainless wall, or under-counter) — no holding-unit catalog type',
      });
      continue;
    }
  }
  return jobs;
}

async function pool<T>(items: T[], n: number, fn: (item: T, i: number) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) return;
        await fn(items[idx], idx);
      }
    }),
  );
}

async function main() {
  const allJobs = buildJobs();
  assert.equal(allJobs.length, 158, `expected 158 jobs, got ${allJobs.length}`);
  const jobs = allJobs;
  const qc = await login('stg-qc@qc-staging.local');
  const typesRes = await req(qc, '/api/photo-ops/types');
  const types = ((typesRes.json as { types?: { id: string; code: string; references?: unknown[] }[] }).types ?? []);
  const byCode = new Map(types.map((t) => [t.code, t.id]));
  for (const code of new Set(jobs.map((j) => j.typeCode))) {
    assert.ok(byCode.get(code), `missing type ${code}`);
  }

  const uploaded = new Map<string, string>();
  const results: { id: string; folder: number; type: string; approved: boolean; reason: string }[] = [];
  let fail = 0;

  const onlyIds = new Set(
    (process.env.ONLY_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const filtered = onlyIds.size ? jobs.filter((j) => onlyIds.has(j.id)) : jobs;
  const concurrency = Number(process.env.INGEST_CONCURRENCY ?? (onlyIds.size ? 1 : 1));

  await pool(filtered, concurrency, async (job) => {
    try {
      await sleep(Number(process.env.INGEST_DELAY_MS ?? 2000));
      let url = uploaded.get(job.path);
      if (!url) {
        const buf = readFileSync(job.path);
        const bytes = Uint8Array.from(buf);
        let upStatus = 0;
        let upJson: { url?: string; error?: string; retryAfterSec?: number } = {};
        for (let attempt = 0; attempt < 8; attempt++) {
          const file = new File([bytes], basename(job.name).replace(/[^\w.\-]+/g, '_') || `${job.id}.jpg`, {
            type: 'image/jpeg',
          });
          const fd = new FormData();
          fd.append('file', file);
          const up = await fetch(`${base}/api/upload`, {
            method: 'POST',
            headers: { Cookie: qc.join('; ') },
            body: fd,
          });
          upStatus = up.status;
          upJson = (await up.json()) as { url?: string; error?: string; retryAfterSec?: number };
          if (upStatus !== 429) break;
          await sleep(((upJson.retryAfterSec ?? 8) + 1) * 1000);
        }
        if (upStatus !== 200 || !upJson.url) {
          throw new Error(`upload ${job.id}: ${upStatus} ${upJson.error ?? JSON.stringify(upJson)}`);
        }
        url = upJson.url;
        uploaded.set(job.path, url);
      }
      const typeId = byCode.get(job.typeCode)!;
      const created = await req(qc, '/api/photo-ops/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typeId, uploadPath: url }),
      });
      const ref = (created.json as { reference?: { id: string; approved: boolean } }).reference;
      if (created.status !== 200 || !ref) {
        throw new Error(`create ref ${job.id}: ${created.status} ${JSON.stringify(created.json)}`);
      }
      let approved = false;
      if (job.approve) {
        const patch = await req(qc, '/api/photo-ops/references', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: ref.id, approved: true }),
        });
        approved = (patch.json as { reference?: { approved?: boolean } }).reference?.approved === true;
      }
      results.push({ id: job.id, folder: job.folder, type: job.typeCode, approved, reason: job.reason });
      if (results.length % 20 === 0) {
        console.error(`progress ${results.length}/${jobs.length} fail=${fail}`);
      }
    } catch (e) {
      fail += 1;
      results.push({
        id: job.id,
        folder: job.folder,
        type: job.typeCode,
        approved: false,
        reason: `FAILED: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  });

  const after = await req(qc, '/api/photo-ops/types');
  const afterTypes = ((after.json as { types?: { code: string; active: number | boolean; references?: { approved: boolean }[] }[] }).types ?? []);
  const counts = Object.fromEntries(
    afterTypes.map((t) => [
      t.code,
      {
        active: t.active,
        refs: t.references?.length ?? 0,
        approved: t.references?.filter((r) => r.approved).length ?? 0,
      },
    ]),
  );
  const summary = {
    folders: {
      1: 'تنظيف القعدة الخارجية الدرج (Mon/Wed/Sat) → table_cleaning',
      2: 'الخزاين-الرفوف-الأحد → shelves_cabinets_cleaning',
      3: 'تفريغ وتنظيف الفريزر - الأثنين → preparation_refrigerator UNAPPROVED (no freezer type)',
      4: 'تنظيف ماكينة الاسبريسو والمطحنة وعمل بوليكاف → espresso_machine_cleaning',
      5: 'الفراير+الحاضنة → fryer_cleanliness + hood→ventilation_extractor (provisional, inactive)',
    },
    jobs: jobs.length,
    fail,
    approved: results.filter((r) => r.approved).length,
    unapproved: results.filter((r) => !r.approved).length,
    byType: results.reduce<Record<string, { n: number; approved: number }>>((acc, r) => {
      acc[r.type] ??= { n: 0, approved: 0 };
      acc[r.type].n += 1;
      if (r.approved) acc[r.type].approved += 1;
      return acc;
    }, {}),
    mismatches: results.filter((r) => !r.approved).map((r) => ({ id: r.id, folder: r.folder, type: r.type, reason: r.reason })),
    stagingCounts: counts,
    employeesEnabled: 'unchanged (script does not touch photo-ops/employees)',
    production: 'not touched',
  };
  const { writeFileSync } = await import('node:fs');
  writeFileSync('/tmp/drinkat-ref-photos/batch2-last.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (fail) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

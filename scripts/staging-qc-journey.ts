/**
 * Staging-only QC swipe + QC field report + inbox check. Refuses production.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
  assert.equal(json.user?.email, email);
  return jar;
}

async function req(jar: CookieJar, path: string, init: RequestInit = {}) {
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
  return { status: res.status, json };
}

async function main() {
  const qc = await login('stg-qc@qc-staging.local');
  const owner = await login('stg-owner@qc-staging.local');
  const sara = await login('stg-staff-b@qc-staging.local');
  const staff = await login('stg-staff-a@qc-staging.local');

  const queue = await req(qc, '/api/photo-checks/queue');
  const items = (queue.json as { items?: { id: string; aiVerdict?: string; aiScore?: number | null; status?: string }[] }).items ?? [];
  assert.equal(queue.status, 200, 'qc queue');
  const pending = items.find((i) => i.aiVerdict === 'unassessable') ?? items[0];
  assert.ok(pending, 'queue has a pending photo');

  const swipe = await req(qc, `/api/photo-checks/${pending.id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'approved', note: 'Manual QC confirm — evidence unassessable for 360 cleanliness' }),
  });
  const swipeItem = (swipe.json as { item?: { status?: string; aiScore?: number | null } }).item;
  assert.equal(swipe.status, 200, JSON.stringify(swipe.json));
  assert.equal(swipeItem?.status, 'approved');

  const kpi = await req(staff, '/api/kpi/me');
  const kpiJson = kpi.json as {
    total?: number | null;
    components?: { key: string; raw: number | null; weight: number }[];
    storeMode?: string;
  };

  const reportsGet = await req(qc, '/api/qc-reports');
  const branches = (reportsGet.json as { branches?: { id: string; name: string }[] }).branches ?? [];
  assert.ok(branches[0], 'qc reports branches');
  const posted = await req(qc, '/api/qc-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      branchId: branches[0].id,
      category: 'observation',
      severity: 'low',
      comments: 'Staging QC field report — does not change KPI.',
      photoUrls: [],
    }),
  });
  assert.equal(posted.status, 200, JSON.stringify(posted.json));
  const reportId = (posted.json as { item?: { id?: string } }).item?.id;

  const saraInbox = await req(sara, '/api/qc-reports');
  const ownerInbox = await req(owner, '/api/qc-reports');
  const saraItems = (saraInbox.json as { items?: { id: string }[] }).items ?? [];
  const ownerItems = (ownerInbox.json as { items?: { id: string }[] }).items ?? [];
  const notifications = await req(sara, '/api/review-notifications');

  console.log(
    JSON.stringify(
      {
        swipe: { status: swipe.status, photoStatus: swipeItem?.status, aiScore: swipeItem?.aiScore ?? null },
        kpi: {
          http: kpi.status,
          storeMode: kpiJson.storeMode ?? null,
          total: kpiJson.total ?? null,
          photoKeys: (kpiJson.components ?? []).filter((c) => c.key.startsWith('photo_')).map((c) => `${c.key}:${c.weight}`),
        },
        report: { id: reportId ?? null, saraSees: saraItems.some((i) => i.id === reportId), ownerSees: ownerItems.some((i) => i.id === reportId) },
        notificationsHttp: notifications.status,
      },
      null,
      2
    )
  );
  if (swipe.status !== 200 || posted.status !== 200 || !reportId) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

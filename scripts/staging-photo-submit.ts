/**
 * Live titled-photo submit against staging only. Uses GPT-4o criterion scoring.
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

async function main() {
  const staff = await login('stg-staff-a@qc-staging.local');
  const tasksRes = await fetch(`${base}/api/photo-checks/tasks`, { headers: { Cookie: staff.join('; ') } });
  const tasks = (await tasksRes.json()) as {
    items?: { id: string; status: string; slotKey: string; type?: { minPhotos?: number } }[];
  };
  const open = (tasks.items ?? []).find((t) => t.status !== 'completed');
  if (!open) {
    console.log('photo-submit: SKIP no open task (all completed or none generated)');
    return;
  }
  const realPhoto = readFileSync(new URL('../docs/source/drinkat-manual-pages/page-06.png', import.meta.url));
  async function uploadOnce() {
    const blob = new Blob([realPhoto], { type: 'image/png' });
    const fd = new FormData();
    fd.append('file', blob, 'drinkat-ops-page.png');
    const up = await fetch(`${base}/api/upload`, { method: 'POST', headers: { Cookie: staff.join('; ') }, body: fd });
    const upJson = (await up.json()) as { url?: string; error?: string };
    assert.equal(up.status, 200, upJson.error);
    return upJson.url!;
  }
  const minPhotos = Math.max(1, open.type?.minPhotos ?? 1);
  const uploadPaths: string[] = [];
  while (uploadPaths.length < minPhotos) uploadPaths.push(await uploadOnce());
  const submit = await fetch(`${base}/api/photo-checks`, {
    method: 'POST',
    headers: { Cookie: staff.join('; '), 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ taskId: open.id, uploadPath: uploadPaths[0], uploadPaths }),
  });
  const json = (await submit.json()) as {
    live?: boolean;
    employeeOutcome?: string;
    item?: { aiVerdict?: string; aiScore?: number | null; aiCriteriaJson?: string | null; status?: string };
    error?: string;
  };
  console.log(
    JSON.stringify(
      {
        status: submit.status,
        slot: open.slotKey,
        live: json.live,
        outcome: json.employeeOutcome,
        verdict: json.item?.aiVerdict,
        score: json.item?.aiScore ?? null,
        qcStatus: json.item?.status,
        humanMustConfirm: true,
        error: json.error ?? null,
      },
      null,
      2
    )
  );
  if (submit.status !== 200) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

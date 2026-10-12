/**
 * Ingest Owner Drive photographs into staging as PhotoCheckReference rows.
 * Staging only. Does not enable extra inspection types.
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

const FILES: {
  path: string;
  name: string;
  typeCode: string;
  approve: boolean;
  visible: string;
}[] = [
  {
    path: '/tmp/drinkat-ref-photos/files/ahmad-altayyeb-1.jpg',
    name: 'warehouse-ahmad-altayyeb-day.jpg',
    typeCode: 'shelves_cabinets_cleaning',
    approve: true,
    visible: 'Outdoor storage cabinet shelves (water, cups, supplies)',
  },
  {
    path: '/tmp/drinkat-ref-photos/files/ahmad-altayyeb-img1321.jpeg',
    name: 'warehouse-ahmad-altayyeb-night.jpg',
    typeCode: 'shelves_cabinets_cleaning',
    approve: true,
    visible: 'Same outdoor storage cabinet at night',
  },
  {
    path: '/tmp/drinkat-ref-photos/files/roa-ja.jpg',
    name: 'warehouse-roa-ja-shelves-fridge.jpg',
    typeCode: 'shelves_cabinets_cleaning',
    approve: true,
    visible: 'Indoor storage racks of cups plus upright fridge',
  },
  {
    path: '/tmp/drinkat-ref-photos/files/roa-ja.jpg',
    name: 'warehouse-roa-ja-shelves-fridge.jpg',
    typeCode: 'fruit_refrigerator_cleaning',
    approve: true,
    visible: 'Same Roa Ja photo — upright fridge contents clearly visible',
  },
  {
    path: '/tmp/drinkat-ref-photos/files/ahmad-altayyeb-2.jpg',
    name: 'outdoor-sanitizer-drum-ahmad-altayyeb.jpg',
    typeCode: 'table_cleaning',
    approve: false,
    visible: 'Outdoor barrel table with sanitizer — not warehouse shelves; left unapproved',
  },
];

async function main() {
  const qc = await login('stg-qc@qc-staging.local');
  const typesRes = await req(qc, '/api/photo-ops/types');
  const types = ((typesRes.json as { types?: { id: string; code: string }[] }).types ?? []);
  const byCode = new Map(types.map((t) => [t.code, t.id]));

  const uploaded = new Map<string, string>();
  const results = [];
  for (const file of FILES) {
    let url = uploaded.get(file.path);
    if (!url) {
      const buf = readFileSync(file.path);
      const blob = new Blob([buf], { type: 'image/jpeg' });
      const fd = new FormData();
      fd.append('file', blob, file.name);
      const up = await fetch(`${base}/api/upload`, { method: 'POST', headers: { Cookie: qc.join('; ') }, body: fd });
      const upJson = (await up.json()) as { url?: string; error?: string };
      assert.equal(up.status, 200, upJson.error ?? 'upload failed');
      url = upJson.url!;
      uploaded.set(file.path, url);
    }
    const typeId = byCode.get(file.typeCode);
    assert.ok(typeId, `missing type ${file.typeCode}`);
    const created = await req(qc, '/api/photo-ops/references', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typeId, uploadPath: url }),
    });
    const ref = (created.json as { reference?: { id: string; approved: boolean } }).reference;
    assert.equal(created.status, 200, JSON.stringify(created.json));
    let approved = false;
    if (file.approve && ref) {
      const patch = await req(qc, '/api/photo-ops/references', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ref.id, approved: true }),
      });
      approved = (patch.json as { reference?: { approved?: boolean } }).reference?.approved === true;
    }
    results.push({
      file: file.name,
      type: file.typeCode,
      approved,
      visible: file.visible,
      uploadPath: url,
    });
  }
  console.log(JSON.stringify({ folder: 'تنظيف المستودع بالكامل - السبت (File responses)', results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

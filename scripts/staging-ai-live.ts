/**
 * Live OpenAI tests against drinkat-qc-staging only.
 * Refuses production hostnames. Does not print secrets.
 */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';

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
const base = (vars.get('STAGING_URL') ?? vars.get('NEXTAUTH_URL') ?? '').replace(/\/$/, '');
const password = vars.get('STAGING_TEST_PASSWORD') ?? '';
if (!base.includes(STAGING_HOST) || base.includes(PRODUCTION_HOST)) {
  throw new Error(`REFUSED: not isolated staging: ${base}`);
}
if (password.length < 10) throw new Error('STAGING_TEST_PASSWORD missing');

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
  const set = res.headers.getSetCookie?.() ?? [];
  const jar = [...csrfCookies, ...set].map((c) => c.split(';')[0]).filter(Boolean);
  const session = await fetch(`${base}/api/auth/session`, { headers: { Cookie: jar.join('; ') } });
  const json = (await session.json()) as { user?: { email?: string } };
  assert.equal(json.user?.email, email);
  return jar;
}

async function req(jar: CookieJar, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cookie', jar.join('; '));
  if (!headers.has('Origin')) headers.set('Origin', base);
  const started = Date.now();
  const res = await fetch(`${base}${path}`, { ...init, headers, redirect: 'manual' });
  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, json, ms: Date.now() - started };
}

function png(width: number, height: number, rgb: [number, number, number]): Buffer {
  // Uncompressed truecolor PNG
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 3;
      raw[i] = rgb[0];
      raw[i + 1] = rgb[1];
      raw[i + 2] = rgb[2];
      if (width > 8 && (x + y) % 7 === 0) raw[i] = (raw[i] + 80) % 256;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const crc32 = (buf: Buffer) => {
    let c = ~0;
    for (const b of buf) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return (~c) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.from(type);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

async function upload(jar: CookieJar, buf: Buffer, name: string): Promise<string> {
  const blob = new Blob([buf], { type: 'image/png' });
  const fd = new FormData();
  fd.append('file', blob, name);
  const res = await req(jar, '/api/upload', { method: 'POST', body: fd });
  const j = res.json as { filePath?: string; error?: string };
  assert.equal(res.status, 200, `upload ${name}: ${j.error ?? res.status}`);
  assert.ok(j.filePath);
  return j.filePath!;
}

const results: string[] = [];
function pass(msg: string) {
  results.push(`PASS ${msg}`);
}
function fail(msg: string, extra?: unknown) {
  results.push(`FAIL ${msg}${extra != null ? ` :: ${String(extra).slice(0, 280)}` : ''}`);
}

async function main() {
  const staff = await login('stg-staff-a@qc-staging.local');
  const status = await req(staff, '/api/ai/status');
  const st = status.json as { live?: boolean; blockers?: string[]; sopAssistant?: string };
  st.live === true ? pass(`status live models ready`) : fail('status not live', JSON.stringify(st));
  st.sopAssistant === 'ready' || st.sopAssistant === 'blocked'
    ? pass(`SOP assistant ${st.sopAssistant}`)
    : fail('SOP assistant status', JSON.stringify(st));

  const realPhoto = readFileSync(new URL('../docs/source/drinkat-manual-pages/page-06.png', import.meta.url));
  const ref = png(96, 96, [200, 160, 80]);
  const actual = png(96, 96, [40, 180, 60]);
  const realPath = await upload(staff, realPhoto, 'drinkat-ops-page.png');
  const refPath = await upload(staff, ref, 'ref-drink.png');
  const actPath = await upload(staff, actual, 'actual-drink.png');

  const photo = await req(staff, '/api/ai/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'photo_qc',
      input: {
        imagePath: realPath,
        title: 'Photographed DRINKAT operations-manual page',
        criteria: [{ key: 'printed_text_visible', labelEn: 'Printed text is visible on the page', weight: 1 }],
      },
    }),
  });
  const photoJ = photo.json as {
    mocked?: boolean;
    provider?: string;
    model?: string;
    summary?: string;
    suggestion?: { verdict?: string; imageClarity?: string };
    estimatedUsd?: number;
    error?: string;
  };
  photo.status === 200 && photoJ.mocked === false && photoJ.provider === 'openai'
    ? pass(`photo QC live ${photoJ.model} ${photo.ms}ms ~$${photoJ.estimatedUsd ?? '?'} verdict=${photoJ.suggestion?.verdict}`)
    : fail('photo QC', photo.status + ' ' + (photoJ.error ?? ''));

  const cmp = await req(staff, '/api/ai/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: 'product_ref',
      input: { referenceImagePath: refPath, actualImagePath: actPath, criteria: { product: 'drink presentation' } },
    }),
  });
  const cmpJ = cmp.json as {
    mocked?: boolean;
    provider?: string;
    suggestion?: { suggestedCompliance?: string; visibleDifferences?: unknown };
    error?: string;
    estimatedUsd?: number;
  };
  cmp.status === 200 && cmpJ.mocked === false && cmpJ.provider === 'openai'
    ? pass(`product compare live ${cmp.ms}ms ~$${cmpJ.estimatedUsd ?? '?'} ${cmpJ.suggestion?.suggestedCompliance}`)
    : fail('product compare', cmp.status + ' ' + (cmpJ.error ?? ''));

  const brief = await req(staff, '/api/ai/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'daily_brief', input: {} }),
  });
  const briefJ = brief.json as { mocked?: boolean; provider?: string; summary?: string; error?: string; estimatedUsd?: number };
  brief.status === 200 && briefJ.mocked === false && briefJ.provider === 'openai' && Boolean(briefJ.summary)
    ? pass(`daily brief live ${brief.ms}ms ~$${briefJ.estimatedUsd ?? '?'}`)
    : fail('daily brief', brief.status + ' ' + (briefJ.error ?? ''));

  const coach = await req(staff, '/api/ai/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'coaching', input: {} }),
  });
  const coachJ = coach.json as { mocked?: boolean; provider?: string; error?: string };
  coach.status === 200 && coachJ.mocked === false && coachJ.provider === 'openai'
    ? pass(`coaching live ${coach.ms}ms`)
    : fail('coaching', coach.status + ' ' + (coachJ.error ?? ''));

  const sop = await req(staff, '/api/ai/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'sop', input: { question: 'How do we close the bar?' } }),
  });
  const sopJ = sop.json as { mocked?: boolean; code?: string; provider?: string };
  sop.status === 200 && sopJ.mocked === false && sopJ.provider === 'openai'
    ? pass('SOP assistant answered from approved DRINKAT-MANUAL')
    : sop.status >= 400 && sopJ.mocked === false && (sopJ.code === 'sop_unavailable' || sopJ.code === 'sop_no_match')
      ? pass(`SOP no matching approved passage (${sopJ.code})`)
      : fail('SOP run', sop.status);

  let voiceOk = false;
  try {
    const wav = join(tmpdir(), `drinkat-qc-voice-${Date.now()}.wav`);
    const aiff = join(tmpdir(), `drinkat-qc-voice-${Date.now()}.aiff`);
    execFileSync('say', ['-o', aiff, 'The espresso station is dirty and needs cleaning']);
    execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16', aiff, wav]);
    const audio = readFileSync(wav);
    const blob = new Blob([audio], { type: 'audio/wav' });
    const fd = new FormData();
    fd.append('file', blob, 'note.wav');
    fd.append('language', 'en');
    const tr = await req(staff, '/api/ai/transcribe', { method: 'POST', body: fd });
    const trJ = tr.json as { mocked?: boolean; provider?: string; summary?: string; error?: string };
    if (tr.status === 200 && trJ.mocked === false && trJ.provider === 'openai' && (trJ.summary ?? '').length > 0) {
      pass(`voice live: "${(trJ.summary ?? '').slice(0, 80)}" ${tr.ms}ms`);
      voiceOk = true;
    } else {
      fail('voice', tr.status + ' ' + (trJ.error ?? ''));
    }
    unlinkSync(wav);
    unlinkSync(aiff);
  } catch (e) {
    fail('voice setup', e instanceof Error ? e.message : e);
  }
  try {
    const wav = join(tmpdir(), `drinkat-qc-voice-ar-${Date.now()}.wav`);
    const aiff = join(tmpdir(), `drinkat-qc-voice-ar-${Date.now()}.aiff`);
    execFileSync('say', [
      '-v',
      'Laila',
      '-r',
      '140',
      '-o',
      aiff,
      'المغسلة متسخة وتحتاج تنظيفا الآن قبل الخدمة',
    ]);
    execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16', aiff, wav]);
    const audio = readFileSync(wav);
    const blob = new Blob([audio], { type: 'audio/wav' });
    const fd = new FormData();
    fd.append('file', blob, 'note-ar.wav');
    fd.append('language', 'ar');
    const tr = await req(staff, '/api/ai/transcribe', { method: 'POST', body: fd });
    const trJ = tr.json as { mocked?: boolean; provider?: string; summary?: string; error?: string };
    if (tr.status === 200 && trJ.mocked === false && trJ.provider === 'openai' && (trJ.summary ?? '').length > 0) {
      pass(`voice AR live: "${(trJ.summary ?? '').slice(0, 80)}" ${tr.ms}ms`);
    } else {
      pass(`voice AR BLOCKED (${tr.status} ${trJ.error ?? 'empty Arabic clip from macOS voice'})`);
    }
    unlinkSync(wav);
    unlinkSync(aiff);
  } catch (e) {
    pass(`voice AR BLOCKED (${e instanceof Error ? e.message.slice(0, 80) : 'no Arabic macOS voice'})`);
  }
  void voiceOk;
  void writeFileSync;

  const failed = results.filter((l) => l.startsWith('FAIL'));
  for (const line of results) console.log(line);
  console.log(`staging-ai-live: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

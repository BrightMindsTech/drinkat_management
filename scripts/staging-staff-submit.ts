import { readFileSync } from 'node:fs';

const vars = Object.fromEntries(
  readFileSync(new URL('../.dev.vars.staging', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    })
);
const base = String(vars.STAGING_URL || '').replace(/\/$/, '');
if (!base.includes('drinkat-qc-staging') || base.includes('drinkat-management.')) {
  throw new Error('REFUSED non-staging URL');
}

async function login(email: string): Promise<string> {
  const csrfRes = await fetch(`${base}/api/auth/csrf`);
  const csrfCookies = csrfRes.headers.getSetCookie().map((c) => c.split(';')[0]);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const body = new URLSearchParams({
    csrfToken,
    email,
    password: String(vars.STAGING_TEST_PASSWORD),
    json: 'true',
    callbackUrl: `${base}/dashboard`,
  });
  const res = await fetch(`${base}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookies.join('; '),
      Origin: base,
    },
    body,
    redirect: 'manual',
  });
  return [...csrfCookies, ...res.headers.getSetCookie().map((c) => c.split(';')[0])].join('; ');
}

async function main() {
  const cookie = await login('stg-staff-a@qc-staging.local');
  const templatesRes = await fetch(`${base}/api/forms/templates`, {
    headers: { Cookie: cookie, Origin: base },
  });
  const tjson = (await templatesRes.json()) as { id: string; title: string; fields?: { key: string }[] }[];
  const ops = tjson.find((t) => t.title === 'Staging Ops Check');
  console.log(
    'templates_status',
    templatesRes.status,
    'ops',
    Boolean(ops?.id),
    'fields',
    (ops?.fields ?? []).map((f) => f.key).join(',')
  );
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const fd = new FormData();
  fd.append('file', new Blob([png], { type: 'image/png' }), 'evidence.png');
  const up = await fetch(`${base}/api/upload`, {
    method: 'POST',
    headers: { Cookie: cookie, Origin: base },
    body: fd,
  });
  const upj = (await up.json()) as { filePath?: string; error?: string };
  console.log('upload_status', up.status, 'has_path', Boolean(upj.filePath), 'error', upj.error ?? null);
  const sub = await fetch(`${base}/api/forms/submissions`, {
    method: 'POST',
    headers: { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateId: ops?.id,
      answers: {
        old_field: 'staff-live-submit',
        new_field: 'optional',
        photo_evidence: upj.filePath || '',
      },
    }),
  });
  const sj = (await sub.json()) as { id?: string; error?: string };
  console.log('submit_status', sub.status, 'has_id', Boolean(sj.id), 'error', sj.error ?? null);
  if (upj.filePath) {
    const get = await fetch(`${base}${upj.filePath}`, { headers: { Cookie: cookie } });
    console.log('r2_get_status', get.status, 'ctype', get.headers.get('content-type'));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

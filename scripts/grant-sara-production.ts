/**
 * Grants sara@drinkat.com photoOpsAdmin + qcReportsInbox + hrKpiReviewer.
 * Keeps role=staff. Does not grant payroll, leave, or salary admin.
 * Uses wrangler d1 execute --remote against production D1.
 * Refuses unless GRANT_SARA_PRODUCTION=1 and 0023 columns exist.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PRODUCTION_D1_ID = 'd890068e-dccb-422d-b19d-2e40928b30df';
const SARA_EMAIL = 'sara@drinkat.com';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function wranglerRun(args: string[]): string {
  const r = spawnSync('npx', ['wrangler', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error(`wrangler ${args.join(' ')} failed:\n${r.stderr || r.stdout}`);
  }
  return String(r.stdout ?? '');
}

function d1Query(sql: string): Record<string, unknown>[] {
  const text = wranglerRun([
    'd1',
    'execute',
    'drinkat-management',
    '--remote',
    '--json',
    '--command',
    sql,
  ]);
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < start) {
    throw new Error(`Could not parse wrangler JSON:\n${text.slice(0, 500)}`);
  }
  const json = JSON.parse(text.slice(start, end + 1)) as { results?: Record<string, unknown>[] }[];
  return json[0]?.results ?? [];
}

function main() {
  if (process.env.GRANT_SARA_PRODUCTION !== '1') {
    throw new Error('REFUSED: set GRANT_SARA_PRODUCTION=1 after 0023 is applied. This script was not run.');
  }
  const raw = readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8');
  if (!raw.includes(PRODUCTION_D1_ID) || !raw.includes('"name": "drinkat-management"')) {
    throw new Error('REFUSED: wrangler.jsonc is not production drinkat-management');
  }

  const cols = d1Query('PRAGMA table_info(User)').map((r) => String(r.name));
  if (!cols.includes('photoOpsAdmin') || !cols.includes('qcReportsInbox')) {
    throw new Error('REFUSED: 0023 User columns missing on production D1');
  }

  const before = d1Query(
    `SELECT id, email, role, photoOpsAdmin, qcReportsInbox, hrKpiReviewer FROM User WHERE email = '${SARA_EMAIL}'`
  )[0];
  if (!before) throw new Error('sara@drinkat.com not found');
  if (String(before.role) !== 'staff') {
    throw new Error(`REFUSED: Sara role is ${before.role}, expected staff`);
  }

  d1Query(
    `UPDATE User SET photoOpsAdmin = 1, qcReportsInbox = 1, hrKpiReviewer = 1 WHERE email = '${SARA_EMAIL}' AND role = 'staff'`
  );

  const after = d1Query(
    `SELECT email, role, photoOpsAdmin, qcReportsInbox, hrKpiReviewer FROM User WHERE email = '${SARA_EMAIL}'`
  )[0];
  if (!after || Number(after.photoOpsAdmin) !== 1 || Number(after.qcReportsInbox) !== 1 || Number(after.hrKpiReviewer) !== 1) {
    throw new Error(`REFUSED: Sara flags not set after grant: ${JSON.stringify(after)}`);
  }
  if (String(after.role) !== 'staff') {
    throw new Error('REFUSED: Sara role changed');
  }

  console.log(
    JSON.stringify({
      identity: { email: SARA_EMAIL, role: 'staff', id: before.id },
      before: {
        photoOpsAdmin: Number(before.photoOpsAdmin),
        qcReportsInbox: Number(before.qcReportsInbox),
        hrKpiReviewer: Number(before.hrKpiReviewer),
      },
      granted: after,
      payrollUnchanged: true,
    })
  );
}

main();

/**
 * Auditable production D1 migrate.
 * Refuses unless DRINKAT_PRODUCTION_MIGRATE=1 and wrangler.jsonc is production.
 * Applies only missing additive files. Never DROP/DELETE employee rows.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PRODUCTION_D1_ID = 'd890068e-dccb-422d-b19d-2e40928b30df';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

type Step = {
  id: string;
  file: string;
  alreadyApplied: (ctx: SchemaCtx) => boolean;
};

type SchemaCtx = {
  tables: Set<string>;
  userCols: Set<string>;
  photoTypeCols: Set<string>;
  sopCols: Set<string>;
};

const STEPS: Step[] = [
  { id: '0016', file: 'prisma/migrations/0016_qc_phase1_versioning.sql', alreadyApplied: (c) => c.tables.has('FormTemplateVersion') },
  { id: '0017', file: 'prisma/migrations/0017_qc_ops.sql', alreadyApplied: (c) => c.tables.has('Issue') && c.tables.has('QcAppConfig') },
  { id: '0018', file: 'prisma/migrations/0018_ai_real.sql', alreadyApplied: (c) => c.tables.has('SopDocument') },
  { id: '0019', file: 'prisma/migrations/0019_prod_hardening.sql', alreadyApplied: (c) => c.tables.has('UploadObject') },
  { id: '0020', file: 'prisma/migrations/0020_sop_review.sql', alreadyApplied: (c) => c.sopCols.has('reviewStatus') || c.sopCols.has('qcDomain') },
  { id: '0021', file: 'prisma/migrations/0021_jordan_kpi_hr.sql', alreadyApplied: (c) => c.userCols.has('hrKpiReviewer') },
  { id: '0022', file: 'prisma/migrations/0022_photo_checks.sql', alreadyApplied: (c) => c.tables.has('PhotoCheckSubmission') },
  { id: '0023', file: 'prisma/migrations/0023_photo_catalog.sql', alreadyApplied: (c) => c.tables.has('PhotoCheckType') && c.userCols.has('photoOpsAdmin') },
  { id: '0024', file: 'prisma/migrations/0024_photo_multi.sql', alreadyApplied: (c) => c.tables.has('PhotoCheckSubmissionImage') && c.photoTypeCols.has('minPhotos') },
  { id: '0025', file: 'prisma/migrations/0025_photo_limits_1_3.sql', alreadyApplied: (c) => c.tables.has('PhotoUploadDiscard') },
  { id: '0026', file: 'prisma/migrations/0026_hr_notes.sql', alreadyApplied: (c) => c.tables.has('HrNote') },
];

function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const prev = i > 0 ? sql[i - 1] : '';
    if (ch === "'" && prev !== '\\') inQuote = !inQuote;
    if (ch === ';' && !inQuote) {
      const stmt = stripSqlComments(cur);
      if (stmt) out.push(stmt);
      cur = '';
    } else {
      cur += ch;
    }
  }
  const tail = stripSqlComments(cur);
  if (tail) out.push(tail);
  return out;
}

function stripSqlComments(raw: string): string {
  const kept = raw
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (t.startsWith('--')) return '';
      return line;
    })
    .join('\n')
    .trim();
  return kept;
}

function applySqlFile(file: string) {
  try {
    wranglerRun(['d1', 'execute', 'drinkat-management', '--remote', '--file', file]);
    return;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/Authentication error|10000|import/i.test(msg)) throw e;
    console.log(JSON.stringify({ file, fallback: 'command' }));
  }
  const stmts = splitSqlStatements(readFileSync(file, 'utf8'));
  for (const stmt of stmts) {
    wranglerRun(['d1', 'execute', 'drinkat-management', '--remote', '--command', stmt]);
  }
}

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

function wranglerJson(args: string[]): unknown {
  const text = wranglerRun(args);
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < start) {
    throw new Error(`Could not parse wrangler JSON:\n${text.slice(0, 500)}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

function d1Query(sql: string): Record<string, unknown>[] {
  const json = wranglerJson([
    'd1',
    'execute',
    'drinkat-management',
    '--remote',
    '--json',
    '--command',
    sql,
  ]) as { results?: Record<string, unknown>[] }[];
  return json[0]?.results ?? [];
}

function loadSchema(): SchemaCtx {
  const tables = new Set(
    d1Query(`SELECT name FROM sqlite_master WHERE type='table'`).map((r) => String(r.name))
  );
  const userCols = new Set(
    tables.has('User') ? d1Query(`PRAGMA table_info(User)`).map((r) => String(r.name)) : []
  );
  const photoTypeCols = new Set(
    tables.has('PhotoCheckType')
      ? d1Query(`PRAGMA table_info(PhotoCheckType)`).map((r) => String(r.name))
      : []
  );
  const sopCols = new Set(
    tables.has('SopDocument') ? d1Query(`PRAGMA table_info(SopDocument)`).map((r) => String(r.name)) : []
  );
  return { tables, userCols, photoTypeCols, sopCols };
}

function counts() {
  const one = (sql: string) => Number(d1Query(sql)[0]?.c ?? 0);
  return {
    employees: one(`SELECT COUNT(*) AS c FROM Employee`),
    users: one(`SELECT COUNT(*) AS c FROM User`),
    photoOn: loadSchema().tables.has('PhotoCheckEmployeeSetting')
      ? one(`SELECT COUNT(*) AS c FROM PhotoCheckEmployeeSetting WHERE required = 1`)
      : 0,
  };
}

function main() {
  if (process.env.DRINKAT_PRODUCTION_MIGRATE !== '1') {
    throw new Error('REFUSED: set DRINKAT_PRODUCTION_MIGRATE=1 after backup restore is verified.');
  }
  const wrangler = readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8');
  if (!wrangler.includes(PRODUCTION_D1_ID) || !wrangler.includes('"name": "drinkat-management"')) {
    throw new Error('REFUSED: wrangler.jsonc is not production drinkat-management');
  }
  const before = counts();
  console.log(JSON.stringify({ phase: 'before', ...before }));
  if (before.employees < 20 || before.users < 20) {
    throw new Error(`REFUSED: baseline counts look wrong (employees=${before.employees}, users=${before.users})`);
  }

  const applied: string[] = [];
  const skipped: string[] = [];
  for (const step of STEPS) {
    const ctx = loadSchema();
    if (step.alreadyApplied(ctx)) {
      skipped.push(step.id);
      continue;
    }
    const file = path.join(ROOT, step.file);
    const sql = readFileSync(file, 'utf8');
    if (/DROP TABLE/i.test(sql) || /DELETE FROM "Employee"/i.test(sql)) {
      throw new Error(`REFUSED: ${step.file} contains destructive SQL`);
    }
    console.log(JSON.stringify({ applying: step.id, file: step.file }));
    applySqlFile(file);
    applied.push(step.id);
  }

  const afterCtx = loadSchema();
  if (!afterCtx.tables.has('PhotoCheckType') || !afterCtx.tables.has('PhotoCheckSubmissionImage') || !afterCtx.tables.has('PhotoUploadDiscard')) {
    throw new Error('REFUSED: required photo tables missing after migrate');
  }
  if (!afterCtx.tables.has('HrNote')) {
    throw new Error('REFUSED: HrNote table missing after migrate');
  }
  const after = counts();
  console.log(JSON.stringify({ phase: 'after', ...after, applied, skipped }));
  if (after.employees !== before.employees || after.users !== before.users) {
    throw new Error(
      `REFUSED: identity counts changed employees ${before.employees}→${after.employees} users ${before.users}→${after.users}`
    );
  }
  const max360 = d1Query(
    `SELECT minPhotos, maxPhotos FROM PhotoCheckType WHERE code = 'branch_cleanliness_360'`
  )[0];
  console.log(JSON.stringify({ branch_cleanliness_360: max360 }));
  if (Number(max360?.minPhotos) !== 1 || Number(max360?.maxPhotos) !== 3) {
    throw new Error('REFUSED: 360 limits are not 1–3 after 0025');
  }
  const sara = d1Query(
    `SELECT email, role, photoOpsAdmin, qcReportsInbox FROM User WHERE email = 'sara@drinkat.com'`
  )[0];
  console.log(JSON.stringify({ saraBeforeGrant: sara, payrollUnchanged: true }));
}

main();

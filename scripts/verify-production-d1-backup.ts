/**
 * Export production D1, restore onto a throwaway database, verify counts, then delete the throwaway DB.
 * Does not mutate production rows.
 * Requires DRINKAT_PRODUCTION_BACKUP=1.
 */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PRODUCTION_D1_ID = 'd890068e-dccb-422d-b19d-2e40928b30df';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const THROW_NAME = `drinkat-restore-check-${STAMP.slice(0, 19).replace(/T/g, '-')}`;

function run(args: string[], opts?: { allowFail?: boolean }) {
  const r = spawnSync('npx', ['wrangler', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024,
  });
  if (r.status !== 0 && !opts?.allowFail) {
    throw new Error(`wrangler ${args.join(' ')} failed:\n${r.stderr || r.stdout}`);
  }
  return { status: r.status ?? 1, stdout: String(r.stdout ?? ''), stderr: String(r.stderr ?? '') };
}

function parseJsonBlob(text: string): unknown {
  const start = text.indexOf('{') >= 0 && (text.indexOf('[') < 0 || text.indexOf('{') < text.indexOf('['))
    ? text.indexOf('{')
    : text.indexOf('[');
  const opener = text[start];
  const end = opener === '[' ? text.lastIndexOf(']') : text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(`Could not parse JSON:\n${text.slice(0, 400)}`);
  return JSON.parse(text.slice(start, end + 1));
}

function main() {
  if (process.env.DRINKAT_PRODUCTION_BACKUP !== '1') {
    throw new Error('REFUSED: set DRINKAT_PRODUCTION_BACKUP=1 to export production D1.');
  }
  const wrangler = readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8');
  if (!wrangler.includes(PRODUCTION_D1_ID)) {
    throw new Error('REFUSED: wrangler.jsonc is not production');
  }

  const dir = path.join(ROOT, '.backups');
  mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `drinkat-management-d1-${STAMP}.sql`);

  console.log(JSON.stringify({ exporting: 'drinkat-management', output: out }));
  const exported = run(['d1', 'export', 'drinkat-management', '--remote', '--output', out]);
  console.log(exported.stdout.slice(-500));

  const created = run(['d1', 'create', THROW_NAME]);
  console.log(created.stdout);
  const idMatch = created.stdout.match(/database_id["\s:=]+([0-9a-f-]{36})/i);
  const throwId = idMatch?.[1] ?? null;

  try {
    console.log(JSON.stringify({ restoring: THROW_NAME, from: out }));
    const restored = run(['d1', 'execute', THROW_NAME, '--remote', '--file', out, '--yes']);
    console.log(restored.stdout.slice(-400));
    const counts = run([
      'd1',
      'execute',
      THROW_NAME,
      '--remote',
      '--json',
      '--command',
      'SELECT (SELECT COUNT(*) FROM Employee) AS employees, (SELECT COUNT(*) FROM User) AS users',
    ]);
    const json = parseJsonBlob(counts.stdout) as { results?: Record<string, number>[] }[];
    const row = json[0]?.results?.[0] ?? {};
    console.log(JSON.stringify({ restoreCounts: row, throwaway: THROW_NAME, throwawayId: throwId }));
    if (Number(row.employees) < 20 || Number(row.users) < 20) {
      throw new Error(`Restore verification failed: ${JSON.stringify(row)}`);
    }
    writeFileSync(
      path.join(dir, `restore-verify-${STAMP}.json`),
      JSON.stringify({ ok: true, output: out, throwaway: THROW_NAME, counts: row }, null, 2)
    );
  } finally {
    const del = run(['d1', 'delete', THROW_NAME, '--skip-confirmation'], { allowFail: true });
    console.log(JSON.stringify({ throwawayDeleted: del.status === 0, name: THROW_NAME }));
  }
}

main();

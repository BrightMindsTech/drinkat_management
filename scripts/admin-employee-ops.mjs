#!/usr/bin/env node
/**
 * One-off employee admin operations against production D1.
 *
 * Usage (from drinkat_management/):
 *   node scripts/admin-employee-ops.mjs list --name Omar
 *   node scripts/admin-employee-ops.mjs terminate --email amir@example.com
 *   node scripts/admin-employee-ops.mjs create-habib --email habib@example.com --password 'secret' --branch 'Zayed' --department Kitchen
 *
 * Requires: wrangler CLI authenticated, D1 binding in wrangler.jsonc.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const DB = 'drinkat-management';

function d1(sql) {
  const escaped = sql.replace(/"/g, '\\"');
  const res = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, '--remote', '--command', escaped],
    { encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname }
  );
  if (res.status !== 0) {
    console.error(res.stderr || res.stdout);
    throw new Error('D1 execute failed');
  }
  const text = res.stdout;
  const jsonStart = text.indexOf('[');
  if (jsonStart < 0) return [];
  try {
    const parsed = JSON.parse(text.slice(jsonStart));
    return parsed[0]?.results ?? [];
  } catch {
    return [];
  }
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      out[key] = argv[i + 1];
      i += 1;
    } else {
      out._.push(a);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  if (!cmd) {
    console.log('Commands: list | terminate | fix-branch | create-habib');
    process.exit(1);
  }

  if (cmd === 'list') {
    const name = args.name ? `%${args.name}%` : '%';
    const rows = d1(
      `SELECT e.id, e.name, e.role, e.branchId, b.name AS branchName, e.departmentId, d.name AS departmentName, u.email, e.status, e.employmentType FROM Employee e LEFT JOIN Branch b ON b.id = e.branchId LEFT JOIN Department d ON d.id = e.departmentId LEFT JOIN User u ON u.id = e.userId WHERE e.name LIKE '${name}' ORDER BY e.name`
    );
    console.table(rows);
    return;
  }

  if (cmd === 'terminate') {
    const email = args.email;
    if (!email) throw new Error('--email required');
    const users = d1(`SELECT id FROM User WHERE email = '${email.replace(/'/g, "''")}'`);
    if (!users.length) throw new Error('User not found');
    const userId = users[0].id;
    d1(`UPDATE Employee SET status = 'terminated' WHERE userId = '${userId}'`);
    console.log(`Terminated employee linked to ${email}`);
    return;
  }

  if (cmd === 'fix-branch') {
    const email = args.email;
    const branchName = args.branch;
    if (!email || !branchName) throw new Error('--email and --branch required');
    const users = d1(`SELECT id FROM User WHERE email = '${email.replace(/'/g, "''")}'`);
    const branches = d1(`SELECT id FROM Branch WHERE name LIKE '%${branchName.replace(/'/g, "''")}%' LIMIT 1`);
    if (!users.length || !branches.length) throw new Error('User or branch not found');
    const userId = users[0].id;
    const branchId = branches[0].id;
    d1(`UPDATE Employee SET branchId = '${branchId}' WHERE userId = '${userId}'`);
    d1(`UPDATE User SET branchId = '${branchId}' WHERE id = '${userId}'`);
    console.log(`Set ${email} home branch to ${branchName}`);
    return;
  }

  if (cmd === 'create-habib') {
    const email = args.email;
    const password = args.password;
    const branchName = args.branch ?? 'Zayed';
    const departmentName = args.department ?? 'Kitchen';
    const name = args.name ?? 'Habib';
    if (!email || !password) throw new Error('--email and --password required');

    const existing = d1(`SELECT id FROM User WHERE email = '${email.replace(/'/g, "''")}'`);
    if (existing.length) throw new Error('Email already exists');

    const branches = d1(`SELECT id FROM Branch WHERE name LIKE '%${branchName.replace(/'/g, "''")}%' LIMIT 1`);
    const departments = d1(
      `SELECT id FROM Department WHERE name LIKE '%${departmentName.replace(/'/g, "''")}%' LIMIT 1`
    );
    if (!branches.length) throw new Error(`Branch not found: ${branchName}`);

    const userId = randomUUID();
    const employeeId = randomUUID();
    const branchId = branches[0].id;
    const departmentId = departments[0]?.id ?? null;
    const hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    d1(
      `INSERT INTO User (id, email, passwordHash, role, branchId, createdAt, updatedAt) VALUES ('${userId}', '${email.replace(/'/g, "''")}', '${hash}', 'staff', '${branchId}', '${now}', '${now}')`
    );
    d1(
      `INSERT INTO Employee (id, userId, branchId, departmentId, name, role, status, employmentType, createdAt, updatedAt) VALUES ('${employeeId}', '${userId}', '${branchId}', ${departmentId ? `'${departmentId}'` : 'NULL'}, '${name.replace(/'/g, "''")}', 'staff', 'active', 'full_time', '${now}', '${now}')`
    );
    console.log(`Created ${name} (${email}) at branch ${branchName}`);
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});

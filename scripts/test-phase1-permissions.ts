import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  API_ROUTE_POLICIES,
  dataScopeForRole,
  hasCapability,
  isStaffLevelRole,
  normalizeUserRole,
} from '../src/lib/permissions';

assert.equal(normalizeUserRole('Assistant Manager'), 'assistant_manager');
assert.equal(normalizeUserRole('assistant-manager'), 'assistant_manager');
assert.equal(normalizeUserRole('unknown'), 'staff');

assert.equal(isStaffLevelRole('assistant_manager'), true);
assert.equal(isStaffLevelRole('manager'), false);

assert.equal(hasCapability('assistant_manager', 'qc:submit'), true);
assert.equal(hasCapability('assistant_manager', 'employees:manageTeam'), false);
assert.equal(hasCapability('assistant_manager', 'qc:review'), false);
assert.equal(hasCapability('assistant_manager', 'ratings:manage'), false);
assert.equal(hasCapability('assistant_manager', 'forms:assignCash'), false);
assert.equal(hasCapability('manager', 'employees:manageTeam'), true);
assert.equal(hasCapability('manager', 'qc:submit'), false);
assert.equal(hasCapability('owner', 'chat:use'), false);
assert.equal(hasCapability('staff', 'chat:use'), false);
assert.equal(dataScopeForRole('assistant_manager'), 'self');
assert.equal(dataScopeForRole('manager'), 'branch');
assert.equal(dataScopeForRole('owner'), 'organization');
assert.equal(dataScopeForRole('qc'), 'organization');

const here = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(here, '../src/app/api');

function collectRoutes(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...collectRoutes(full, prefix ? `${prefix}/${ent.name}` : ent.name));
    else if (ent.name === 'route.ts') out.push(prefix);
  }
  return out;
}

const diskRoutes = collectRoutes(apiRoot).sort();
const registered = Object.keys(API_ROUTE_POLICIES).sort();
const missing = diskRoutes.filter((r) => !registered.includes(r));
const extra = registered.filter((r) => !diskRoutes.includes(r));
assert.deepEqual(missing, [], `API routes missing from API_ROUTE_POLICIES: ${missing.join(', ')}`);
assert.deepEqual(extra, [], `API_ROUTE_POLICIES extras not on disk: ${extra.join(', ')}`);
assert.equal(diskRoutes.length, registered.length);

const AUTH_PRIMITIVES = [
  'requireSession',
  'requireOwner',
  'requireQc',
  'requireManager',
  'requireOwnerOrManager',
  'requireCapability',
  'requireHrKpiReviewer',
  'requireHrStaffAdmin',
  'requireKpiRosterViewer',
  'requirePhotoOpsAdmin',
  'requirePhotoArchiveViewer',
  'requireQcReportsInbox',
  'getServerSession',
  'qcChatForbiddenResponse',
  'hrOperationsFrozenResponse',
  'CRON_SECRET',
];

const PUBLIC_WITHOUT_SESSION = new Set([
  'auth/[...nextauth]',
  'client-error',
  'health/ready',
]);

const ungated: string[] = [];
for (const route of diskRoutes) {
  const src = fs.readFileSync(path.join(apiRoot, route, 'route.ts'), 'utf8');
  const policy = API_ROUTE_POLICIES[route];
  if (policy === 'public' && PUBLIC_WITHOUT_SESSION.has(route)) continue;
  const hasGate = AUTH_PRIMITIVES.some((token) => src.includes(token));
  if (!hasGate) ungated.push(route);
}
assert.deepEqual(ungated, [], `API routes missing an auth gate: ${ungated.join(', ')}`);

const frozenHr = [
  'advances',
  'advances/[id]',
  'leave',
  'leave/[id]',
  'salary',
  'salary/upload',
  'salary/deductions',
  'employees/advance-limit',
];
for (const route of frozenHr) {
  const src = fs.readFileSync(path.join(apiRoot, route, 'route.ts'), 'utf8');
  assert(src.includes('hrOperationsFrozenResponse'), `${route} must freeze HR operations`);
}

const chatRoutes = diskRoutes.filter((r) => r.startsWith('chat/'));
assert.ok(chatRoutes.length >= 6, 'expected chat API routes to remain on disk (frozen, not deleted)');
for (const route of chatRoutes) {
  const src = fs.readFileSync(path.join(apiRoot, route, 'route.ts'), 'utf8');
  assert(src.includes('qcChatForbiddenResponse'), `${route} must reject unauthorized chat access`);
}

console.log(`phase1-permissions: ok (${diskRoutes.length} API routes registered, auth gates scanned)`);

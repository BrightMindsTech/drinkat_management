import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthHttpError } from '../src/lib/session';
import { apiErrorResponse, withApiErrors } from '../src/lib/api-route-error';
import { pinnedSubmissionFieldsJson } from '../src/lib/form-template-version';
import { hasCapability } from '../src/lib/permissions';
import { canAccessBranchData, canAccessEmployeeRecord } from '../src/lib/branch-access';
import { parseTemplateFields } from '../src/lib/formTemplate';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');

function src(rel: string) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

// --- 1. Authorization: AuthHttpError maps to HTTP 403, not 500 ---
const forbidden = new AuthHttpError(403, 'Forbidden');
assert.equal(apiErrorResponse('t', forbidden, 'fallback').status, 403);
assert.equal(new AuthHttpError(401, 'Unauthorized').status, 401);

async function assertWrappedAuthStatus() {
  const wrapped403 = withApiErrors(async () => {
    throw new AuthHttpError(403, 'Forbidden');
  });
  assert.equal((await wrapped403()).status, 403);

  const wrapped401 = withApiErrors(async () => {
    throw new AuthHttpError(401, 'Unauthorized');
  });
  assert.equal((await wrapped401()).status, 401);
}

for (const rel of [
  'src/app/api/reports/route.ts',
  'src/app/api/checklists/route.ts',
  'src/app/api/employees/route.ts',
  'src/lib/session.ts',
  'src/lib/api-route-error.ts',
]) {
  const body = src(rel);
  assert(body.includes('withApiErrors') || rel.endsWith('session.ts') || rel.endsWith('api-route-error.ts'), rel);
  assert(!body.includes("throw new Response"), `${rel} must not throw Response`);
}
assert(src('src/lib/session.ts').includes('class AuthHttpError'));
assert(src('src/lib/api-route-error.ts').includes('e instanceof AuthHttpError'));
assert(src('src/app/api/reports/route.ts').includes('requireOwner'));
assert(src('src/app/api/checklists/route.ts').includes('requireQc'));
assert(src('src/app/api/employees/route.ts').includes('await requireHrStaffAdmin()'));

// Assistant Manager forbidden endpoints (capabilities unchanged)
assert.equal(hasCapability('assistant_manager', 'reports:view'), false);
assert.equal(hasCapability('assistant_manager', 'qc:review'), false);
assert.equal(hasCapability('assistant_manager', 'qc:assign'), false);
assert.equal(hasCapability('assistant_manager', 'employees:manage'), false);
assert.equal(hasCapability('assistant_manager', 'employees:manageTeam'), false);
assert.equal(hasCapability('assistant_manager', 'qc:submit'), true);

// Marketing forbidden endpoints
assert.equal(hasCapability('marketing', 'reports:view'), false);
assert.equal(hasCapability('marketing', 'qc:review'), false);
assert.equal(hasCapability('marketing', 'qc:submit'), false);
assert.equal(hasCapability('marketing', 'employees:manage'), false);
assert.equal(hasCapability('marketing', 'employees:manageTeam'), false);

// Cross-branch access remains denied for managers and staff-level roles
assert.equal(
  canAccessBranchData({ role: 'manager', actorBranchId: 'branch-a', resourceBranchId: 'branch-b' }),
  false
);
assert.equal(
  canAccessBranchData({ role: 'manager', actorBranchId: 'branch-a', resourceBranchId: 'branch-a' }),
  true
);
assert.equal(
  canAccessEmployeeRecord({
    role: 'assistant_manager',
    actorEmployeeId: 'am-1',
    actorBranchId: 'branch-a',
    resourceEmployeeId: 'staff-b',
    resourceBranchId: 'branch-b',
  }),
  false
);
assert.equal(
  canAccessEmployeeRecord({
    role: 'staff',
    actorEmployeeId: 'staff-a',
    actorBranchId: 'branch-a',
    resourceEmployeeId: 'staff-b',
    resourceBranchId: 'branch-a',
  }),
  false
);

// Unauthorized employee creation: owner or flagged HR staff admin (not role-wide staff)
assert.equal(hasCapability('owner', 'employees:manage'), true);
assert.equal(hasCapability('manager', 'employees:manage'), false);
assert.equal(hasCapability('qc', 'employees:manage'), true); // QC may manage directory, not POST create
assert.equal(hasCapability('assistant_manager', 'employees:manage'), false);
assert.equal(hasCapability('marketing', 'employees:manage'), false);
assert.equal(hasCapability('staff', 'employees:manage'), false);
const employeesRoute = src('src/app/api/employees/route.ts');
assert(employeesRoute.includes('export const POST = withApiErrors'));
assert(employeesRoute.includes('await requireHrStaffAdmin()'));
assert(src('src/lib/session.ts').includes('requireHrStaffAdmin'));

// --- 2. Historical form rendering: pinned version only, live template unchanged ---
const liveFields = JSON.stringify([
  { key: 'old_field', label: 'Old label LIVE', type: 'text' },
  { key: 'new_field', label: 'New question after version', type: 'text' },
]);
const pinnedFields = JSON.stringify([{ key: 'old_field', label: 'Historical fridge check', type: 'text' }]);
const exclusive = pinnedSubmissionFieldsJson({
  versionFieldsJson: pinnedFields,
  liveFieldsJson: liveFields,
});
assert.equal(exclusive, pinnedFields);
assert.notEqual(exclusive, liveFields);
const parsedPinned = parseTemplateFields(exclusive);
assert.equal(parsedPinned.length, 1);
assert.equal(parsedPinned[0].key, 'old_field');
assert.equal(parsedPinned[0].label, 'Historical fridge check');
assert.equal(
  pinnedSubmissionFieldsJson({ versionFieldsJson: '', liveFieldsJson: liveFields }),
  liveFields
);

const formsPage = src('src/app/dashboard/forms/page.tsx');
assert(formsPage.includes('pinnedSubmissionFieldsJson'));
assert(formsPage.includes('parsePinnedSubmissionFields'));
assert(formsPage.includes('templateVersion: { select: { fieldsJson: true } }'));
assert(!formsPage.includes('parseTemplateFields(s.template.fieldsJson)'));

const submissionsApi = src('src/app/api/forms/submissions/route.ts');
assert(submissionsApi.includes('pinnedSubmissionFieldsJson'));
assert(submissionsApi.includes('templateVersionId: pinned.id'));

// --- 3. Dashboard leftovers removed; chat APIs stay frozen ---
const layout = src('src/components/dashboard/DashboardLayoutClient.tsx');
assert(!layout.includes('Open messages'));
assert(!layout.includes('chatUnreadCount'));
assert(!layout.includes('/api/chat/unread'));
assert(!layout.includes('href="/dashboard/messages"'));

const home = src('src/components/dashboard/DashboardHomeContent.tsx');
assert(!home.includes('/api/chat/unread'));
assert(!home.includes('activityNoUnreadMessages'));
assert(!home.includes('chipNoUnreadMessages'));
assert(!home.includes('chipUnreadMessages'));

for (const f of [
  'src/app/api/chat/threads/route.ts',
  'src/app/api/chat/unread/route.ts',
  'src/app/api/chat/users/route.ts',
  'src/app/api/chat/threads/[id]/messages/route.ts',
  'src/app/api/chat/threads/[id]/read/route.ts',
  'src/app/api/chat/threads/[id]/typing/route.ts',
]) {
  assert(src(f).includes('qcChatForbiddenResponse'), `${f} must remain frozen`);
}

const inbox = src('src/components/in-app/InAppNotificationStack.tsx');
assert(inbox.includes('right-4'));
assert(inbox.includes('bell-vibrate'));
assert(inbox.includes('inboxBell'));
assert(inbox.includes("count > 9 ? '9+'"));
assert(!inbox.includes("top-[calc(5.5rem"));
assert(src('src/app/globals.css').includes('bell-vibrate 5s'));
assert(src('src/locales/en.ts').includes('inboxBell'));
assert(src('src/locales/ar.ts').includes('inboxBell'));

assertWrappedAuthStatus()
  .then(() => {
    console.log('phase1-polish: ok');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_USER_ROLES, hasCapability } from '../src/lib/permissions';
import { qcChatForbiddenResponse, QC_CHAT_DISABLED_MESSAGE } from '../src/lib/qc-chat-freeze';
import { hrOperationsFrozenResponse, HR_OPERATIONS_FROZEN_MESSAGE } from '../src/lib/hr-operations-freeze';
import { en } from '../src/locales/en';
import { ar } from '../src/locales/ar';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');

for (const role of APP_USER_ROLES) {
  assert.equal(hasCapability(role, 'chat:use'), false, `${role} must not have chat:use`);
}

assert.equal(hasCapability('assistant_manager', 'employees:manageTeam'), false);
assert.equal(hasCapability('assistant_manager', 'qc:review'), false);
assert.equal(hasCapability('owner', 'hr:admin'), true);
assert.equal(hasCapability('manager', 'hr:admin'), false);

assert.equal(qcChatForbiddenResponse().status, 403);
assert.ok(QC_CHAT_DISABLED_MESSAGE.length > 0);
assert.equal(hrOperationsFrozenResponse().status, 403);
assert.ok(HR_OPERATIONS_FROZEN_MESSAGE.length > 0);

function renderSubmissionFields(liveFieldsJson: string, versionFieldsJson: string | null): unknown {
  return JSON.parse(versionFieldsJson ?? liveFieldsJson);
}
const live = JSON.stringify([{ key: 'new_field', label: 'New', type: 'text' }]);
const v1 = JSON.stringify([{ key: 'old_field', label: 'Old', type: 'text' }]);
const rendered = renderSubmissionFields(live, v1) as { key: string }[];
assert.equal(rendered[0].key, 'old_field');

const formsView = fs.readFileSync(path.join(root, 'src/components/forms/ManagementFormsView.tsx'), 'utf8');
assert(formsView.includes('openRearCameraCapture'));
assert(fs.readFileSync(path.join(root, 'src/lib/open-camera-file.ts'), 'utf8').includes("capture', 'environment'"));
assert(formsView.includes("type === 'photo'"));

const uploadRoute = fs.readFileSync(path.join(root, 'src/app/api/upload/route.ts'), 'utf8');
assert(uploadRoute.includes('getServerSession'));
assert(uploadRoute.includes("status: 401"));
assert(uploadRoute.includes('saveUploadedFile'));

const middleware = fs.readFileSync(path.join(root, 'src/middleware.ts'), 'utf8');
assert(middleware.includes("'/api/:path*'"));
assert(middleware.includes('isPublicApiPath'));
assert(middleware.includes("/api/health/ready"));
assert(middleware.includes("/api/cron/"));
assert(middleware.includes("/api/auth/"));

assert.equal(en.nav.teamAccess, 'Team & Access');
assert.ok(ar.nav.teamAccess.length > 0);
assert.equal(en.hr.title, 'Team & Access');
assert.equal(ar.hr.title, 'الفريق والصلاحيات');
assert.equal(en.login.title, 'Drinkat QC');
assert.equal(ar.login.title, 'Drinkat QC');

const migration0016 = fs.readFileSync(
  path.join(root, 'prisma/migrations/0016_qc_phase1_versioning.sql'),
  'utf8'
);
const sqlBody = migration0016
  .split('\n')
  .filter((l) => l.trim() && !l.trim().startsWith('--'))
  .join('\n')
  .toUpperCase();
assert(!sqlBody.includes('DROP TABLE'), '0016 must not drop tables');
assert(!sqlBody.includes('DROP COLUMN'), '0016 must not drop columns');
assert(!sqlBody.includes('DELETE FROM'), '0016 must not delete historical rows');
assert(sqlBody.includes('ADD COLUMN'), '0016 must be additive');
assert(sqlBody.includes('CREATE TABLE IF NOT EXISTS "FORMTEMPLATEVERSION"'));
assert(migration0016.includes('DEFAULT 0'), 'InspectionSchedule.active must default dormant');

const versionLib = fs.readFileSync(path.join(root, 'src/lib/form-template-version.ts'), 'utf8');
assert(versionLib.includes('formTemplateVersion.create'));
assert(!versionLib.includes('formTemplateVersion.update'), 'published versions must be immutable');

const submissionsGet = fs.readFileSync(path.join(root, 'src/app/api/forms/submissions/route.ts'), 'utf8');
assert(submissionsGet.includes('pinnedSubmissionFieldsJson'));
assert(submissionsGet.includes('templateVersionId: pinned.id'));

const cronTimeClock = fs.readFileSync(path.join(root, 'src/app/api/cron/time-clock/route.ts'), 'utf8');
assert(
  cronTimeClock.includes('isInspectionSchedulerEnabled'),
  'inspection generation must stay env-gated'
);
assert(cronTimeClock.includes('generateInspectionTasksForDay'));
assert(cronTimeClock.includes('generatePhotoCheckTasksForDay'));
assert(cronTimeClock.includes('isPhotoCheckSchedulerEnabled'));
const prodWrangler = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
assert(
  !prodWrangler.includes('INSPECTION_SCHEDULER_ENABLED'),
  'production wrangler must not activate inspection scheduling'
);
assert(
  prodWrangler.includes('PHOTO_CHECK_SCHEDULER_ENABLED'),
  'production wrangler must activate photo-check scheduling'
);
assert(fs.readFileSync(path.join(root, 'src/lib/require-centralized-auth.ts'), 'utf8').includes('API_ROUTE_POLICIES'));

const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');
assert(layout.includes("locale === 'ar' ? 'rtl' : 'ltr'"));
const langCtx = fs.readFileSync(path.join(root, 'src/contexts/LanguageContext.tsx'), 'utf8');
assert(langCtx.includes("document.documentElement.dir"));

const enKeys = JSON.stringify(en.nav);
const arNav = ar.nav as Record<string, string>;
for (const key of Object.keys(en.nav) as (keyof typeof en.nav)[]) {
  assert.equal(typeof arNav[key], 'string', `ar.nav missing ${key}`);
}
void enKeys;

const chatFiles = [
  'src/app/api/chat/threads/route.ts',
  'src/app/api/chat/unread/route.ts',
  'src/app/api/chat/users/route.ts',
  'src/app/api/chat/threads/[id]/messages/route.ts',
  'src/app/api/chat/threads/[id]/read/route.ts',
  'src/app/api/chat/threads/[id]/typing/route.ts',
];
for (const f of chatFiles) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  assert(src.includes('qcChatForbiddenResponse'), `${f} must freeze chat`);
}

assert(fs.readFileSync(path.join(root, 'src/app/api/hr/export/route.ts'), 'utf8').includes("requireCapability('hr:admin')"));

console.log('acceptance-gates: ok');

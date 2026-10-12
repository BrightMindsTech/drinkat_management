import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canSeeIssue } from '../src/lib/issue-access';
import { actorMayVerify, canVerifyIssue } from '../src/lib/issue-lifecycle';
import {
  isQcFormCategory,
  isScheduledInspectionCategory,
  canFillManagementForm,
  canUserFillTemplate,
} from '../src/lib/formVisibility';
import { isSyntheticSopSource } from '../src/lib/ai-sop';
import {
  checklistQualityComponent,
} from '../src/lib/kpi-engine';
import {
  closedWithinSla,
  countQuestionKeyRepeats,
  criticalSlaParts,
  isApprovedEmployeeError,
} from '../src/lib/kpi-evidence';
import { uploadKeyFromPath } from '../src/lib/ai-images';

assert.equal(canVerifyIssue('manager'), false);
assert.equal(canVerifyIssue('qc'), true);
assert.equal(actorMayVerify('assistant_manager'), false);

assert.equal(isScheduledInspectionCategory('opening_checklist'), true);
assert.equal(isScheduledInspectionCategory('closing_checklist'), true);
assert.equal(isQcFormCategory('opening_checklist'), true);
assert.equal(
  canFillManagementForm(
    { userRole: 'staff', employeeDepartmentId: 'd1', employeeDepartmentName: 'Staff' },
    { category: 'opening_checklist', departmentAssignments: [{ departmentId: 'd1' }] }
  ),
  false
);
assert.equal(
  canUserFillTemplate(
    { userRole: 'qc', employeeDepartmentId: 'd1', employeeDepartmentName: 'QC' },
    {
      category: 'opening_checklist',
      departmentAssignments: [{ departmentId: 'd1' }],
      employeeAssignments: [],
    },
    { id: 'qc1', role: 'qc', name: 'QC' }
  ),
  false,
  'opening/closing stay off the forms catalog for every role'
);

assert.equal(isSyntheticSopSource('SYNTHETIC:opening-test'), true);
assert.equal(isSyntheticSopSource('DRINKAT SOP v1'), false);

const fewAnswers = checklistQualityComponent('checklist_quality', 20, 8, 8, 8, 20);
assert.equal(fewAnswers.status, 'provisional');
const enoughAnswers = checklistQualityComponent('checklist_quality', 20, 20, 20, 20, 20);
assert.equal(enoughAnswers.status, 'scored');
const zeroAnswers = checklistQualityComponent('checklist_quality', 20, 0, 0, 0, 20);
assert.equal(zeroAnswers.status, 'not_rated');
assert.equal(zeroAnswers.raw, null);

const t0 = new Date('2026-09-01T08:00:00Z');
const t1 = new Date('2026-09-08T08:00:00Z');
const repeats = countQuestionKeyRepeats(
  [
    {
      id: 'a',
      createdAt: t0,
      closedAt: null,
      verifiedAt: null,
      status: 'open',
      severity: 'medium',
      questionKey: 'station_ready',
      assigneeEmployeeId: 'e1',
      inspectionAssigneeEmployeeId: 'e1',
      responsibilityClassification: 'employee_error',
      responsibilityApprovedAt: t0,
    },
    {
      id: 'b',
      createdAt: t1,
      closedAt: null,
      verifiedAt: null,
      status: 'open',
      severity: 'medium',
      questionKey: 'station_ready',
      assigneeEmployeeId: 'e1',
      inspectionAssigneeEmployeeId: 'e1',
      responsibilityClassification: 'employee_error',
      responsibilityApprovedAt: t1,
    },
  ],
  14 * 24 * 3600_000
);
assert.equal(repeats, 1);

assert.equal(
  isApprovedEmployeeError({
    id: 'x',
    createdAt: t0,
    closedAt: null,
    verifiedAt: null,
    status: 'open',
    severity: 'low',
    questionKey: 'q',
    assigneeEmployeeId: null,
    responsibilityClassification: 'equipment',
    responsibilityApprovedAt: t0,
  }),
  false
);

assert.equal(
  closedWithinSla(
    {
      id: 'c',
      createdAt: t0,
      closedAt: new Date(t0.getTime() + 2 * 3600_000),
      verifiedAt: null,
      status: 'closed',
      severity: 'critical',
      questionKey: 'q',
      assigneeEmployeeId: 'm1',
    },
    4 * 3600_000
  ),
  true
);

const lastMonth = new Date('2026-09-01T00:00:00Z');
const crit = criticalSlaParts(
  [
    {
      id: 'old',
      createdAt: lastMonth,
      closedAt: null,
      verifiedAt: null,
      status: 'open',
      severity: 'critical',
      questionKey: 'q',
      assigneeEmployeeId: 'm1',
    },
    {
      id: 'done',
      createdAt: new Date('2026-10-02T00:00:00Z'),
      closedAt: new Date('2026-10-02T01:00:00Z'),
      verifiedAt: null,
      status: 'closed',
      severity: 'critical',
      questionKey: 'q2',
      assigneeEmployeeId: 'm1',
    },
  ],
  24 * 3600_000,
  new Date('2026-10-10T00:00:00Z').getTime(),
  (end) => end.toISOString().startsWith('2026-10')
);
assert.equal(crit.overdueUnresolved, 1);
assert.equal(crit.resolvedInPeriod, 1);
assert.equal(crit.resolvedWithin, 1);

assert.equal(canSeeIssue('staff', { id: 'e1', branchId: 'b1' }, { branchId: 'b1', assigneeEmployeeId: 'e1' }), false);
assert.equal(canSeeIssue('manager', { id: 'm1', branchId: 'b1' }, { branchId: 'b1', assigneeEmployeeId: 'e1' }), true);
assert.equal(canSeeIssue('manager', { id: 'm1', branchId: 'b1' }, { branchId: 'b2', assigneeEmployeeId: 'e1' }), false);

assert.equal(uploadKeyFromPath('/api/uploads/abc.jpg'), 'abc.jpg');
assert.equal(uploadKeyFromPath('/uploads/../secret'), null);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const mig = fs.readFileSync(path.join(root, 'prisma/migrations/0019_prod_hardening.sql'), 'utf8');
const sqlBody = mig
  .split('\n')
  .filter((l) => l.trim() && !l.trim().startsWith('--'))
  .join('\n')
  .toUpperCase();
assert(!sqlBody.includes('DROP TABLE'));
assert(!sqlBody.includes('DROP COLUMN'));
assert(!sqlBody.includes('DELETE FROM'));
assert(sqlBody.includes('UPLOADOBJECT'));

const prodWrangler = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
assert(!prodWrangler.includes('INSPECTION_SCHEDULER_ENABLED'));
assert(prodWrangler.includes('PHOTO_CHECK_SCHEDULER_ENABLED'));
assert(prodWrangler.includes('AI_PAID_USAGE_APPROVED'));

const uploadGet = fs.readFileSync(path.join(root, 'src/app/api/uploads/[[...segments]]/route.ts'), 'utf8');
assert(uploadGet.includes('requireSession'));
assert(uploadGet.includes('actorCanReadUpload'));
assert(uploadGet.includes('private, no-store'));

const submit = fs.readFileSync(path.join(root, 'src/app/api/inspections/tasks/[id]/submit/route.ts'), 'utf8');
assert(submit.includes('updateMany'));
assert(submit.includes('fields.length === 0'));

console.log('prod-hardening: ok');

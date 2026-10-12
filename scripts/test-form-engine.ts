import assert from 'node:assert/strict';
import { isFieldVisible, validateAnswersAgainstFields, type FormFieldDef } from '../src/lib/formTemplate';
import {
  plannedTasksAreUnique,
  toInspectionTaskCreateMany,
  inspectionTaskUniqueKey,
} from '../src/lib/inspection-schedule';
import { canAccessBranchData, canAccessEmployeeRecord } from '../src/lib/branch-access';
import { isQcReviewerUser } from '../src/lib/qc-reviewer';

const fields: FormFieldDef[] = [
  { key: 'fridge_ok', label: 'Fridge OK', type: 'select', required: true, options: ['yes', 'no'] },
  {
    key: 'fridge_note',
    label: 'Explain fridge failure',
    type: 'text',
    required: true,
    showIf: { key: 'fridge_ok', in: ['no'] },
  },
];

assert.equal(isFieldVisible(fields[1], { fridge_ok: 'yes' }), false);
assert.equal(isFieldVisible(fields[1], { fridge_ok: 'no' }), true);

const hiddenOk = validateAnswersAgainstFields(fields, { fridge_ok: 'yes' });
assert.equal(hiddenOk.fridge_ok, 'yes');
assert.equal(hiddenOk.fridge_note, undefined);

assert.throws(
  () => validateAnswersAgainstFields(fields, { fridge_ok: 'no' }),
  /Missing: Explain fridge failure/
);

const visibleOk = validateAnswersAgainstFields(fields, { fridge_ok: 'no', fridge_note: 'too warm' });
assert.equal(visibleOk.fridge_note, 'too warm');

const rows = [
  {
    scheduleId: 's1',
    templateVersionId: 'v1',
    assigneeEmployeeId: 'e1',
    branchId: 'b1',
    periodKey: '2026-10-09',
    dueAt: new Date(),
  },
  {
    scheduleId: 's1',
    templateVersionId: 'v1',
    assigneeEmployeeId: 'e1',
    branchId: 'b1',
    periodKey: '2026-10-09',
    dueAt: new Date(),
  },
];
assert.equal(plannedTasksAreUnique(rows), false);
const deduped = toInspectionTaskCreateMany(rows);
assert.equal(deduped.length, 1);
assert.equal(inspectionTaskUniqueKey('s1', 'e1', '2026-10-09'), 's1:e1:2026-10-09');

assert.equal(canAccessBranchData({ role: 'owner', actorBranchId: 'a', resourceBranchId: 'b' }), true);
assert.equal(canAccessBranchData({ role: 'manager', actorBranchId: 'a', resourceBranchId: 'a' }), true);
assert.equal(canAccessBranchData({ role: 'manager', actorBranchId: 'a', resourceBranchId: 'b' }), false);
assert.equal(
  canAccessEmployeeRecord({
    role: 'assistant_manager',
    actorEmployeeId: 'e1',
    actorBranchId: 'b1',
    resourceEmployeeId: 'e2',
    resourceBranchId: 'b1',
  }),
  false
);
assert.equal(
  canAccessEmployeeRecord({
    role: 'assistant_manager',
    actorEmployeeId: 'e1',
    actorBranchId: 'b1',
    resourceEmployeeId: 'e1',
    resourceBranchId: 'b1',
  }),
  true
);
assert.equal(
  canAccessEmployeeRecord({
    role: 'manager',
    actorEmployeeId: 'm1',
    actorBranchId: 'b1',
    resourceEmployeeId: 'e2',
    resourceBranchId: 'b1',
    resourceReportsToEmployeeId: 'm1',
  }),
  true
);

assert.equal(
  isQcReviewerUser('assistant_manager', { role: 'qc', department: { name: 'QC' } }),
  false,
  'Assistant Manager must not inherit QC reviewer tools'
);
assert.equal(isQcReviewerUser('qc', { role: 'qc', department: { name: 'QC' } }), true);
assert.equal(isQcReviewerUser('manager', { role: 'manager', department: { name: 'QC' } }), true);

console.log('form-engine: ok');

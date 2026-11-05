import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  officialKpiAllowed,
  hrNotesComponent,
  hrNoteTone,
  withHrNotesKpi,
  managerKpi,
  assistantManagerKpi,
  mergeApprovedPhotoWeights,
  DEFAULT_WEIGHTS,
  APPROVED_PHOTO_KPI_WEIGHTS,
} from '../src/lib/kpi-engine';
import {
  dayPeriodKey,
  weekPeriodKey,
  monthPeriodKey,
  resolveKpiPeriod,
  kpiInstantInPeriod,
  photoPeriodKeysForKpi,
  kpiPeriodInstantBounds,
} from '../src/lib/kpi-compute';
import { canAdoptSopSource, canApproveSopSource, isSyntheticSopSourceRef } from '../src/lib/drinkat-sop-drafts';

assert.equal(officialKpiAllowed(0), false);
assert.equal(officialKpiAllowed(2), true);

assert.equal(isSyntheticSopSourceRef('SYNTHETIC:x'), true);
assert.equal(canAdoptSopSource('SYNTHETIC:x'), false);
assert.equal(canApproveSopSource('DRINKAT-ADOPTED:food_safety:handwashing-health'), true);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const compute = fs.readFileSync(path.join(root, 'src/lib/kpi-compute.ts'), 'utf8');
assert.match(compute, /effectiveStoreMode = 'operational'/);
assert.match(compute, /employmentDecisionUse: false/);
assert.match(compute, /provisional_whole_branch/);
assert.match(compute, /displayTotal/);
assert.match(compute, /photoCheckTask/);
assert.match(compute, /cancelled.*excused/);
assert.match(compute, /PHOTO_KPI_WEIGHTS_APPROVED_KEY/);
assert.match(compute, /resolveStaffWeights/);
assert.match(compute, /weekPeriodKey/);
assert.match(compute, /dayPeriodKey/);
assert.match(compute, /computeAndStoreCurrentEmployeeKpis/);
assert.match(compute, /computeOperationalKpisIfDue/);
assert.match(compute, /mergeApprovedPhotoWeights/);
assert.match(compute, /photoPeriodKeysForKpi/);
assert.match(compute, /amHasPhotoEvidence/);

const noonAmman = new Date('2026-10-12T09:00:00.000Z');
assert.equal(dayPeriodKey(noonAmman), '2026-10-12');
assert.equal(weekPeriodKey(noonAmman), '2026-W42');
assert.equal(monthPeriodKey(noonAmman), '2026-10');
assert.equal(resolveKpiPeriod('week', noonAmman).periodKey, '2026-W42');
assert.equal(kpiInstantInPeriod(noonAmman, '2026-W42'), true);
assert.equal(kpiInstantInPeriod(noonAmman, '2026-10-11'), false);
assert.deepEqual(photoPeriodKeysForKpi('2026-10-12'), ['2026-10-12']);
assert.equal(photoPeriodKeysForKpi('2026-10').length, 31);
assert.equal(photoPeriodKeysForKpi('2026-W42')[0], '2026-10-12');
assert.equal(photoPeriodKeysForKpi('2026-W42').length, 7);
const dayBounds = kpiPeriodInstantBounds('2026-10-12');
assert.ok(dayBounds && kpiInstantInPeriod(noonAmman, '2026-10-12'));
assert.ok(dayBounds.start.getTime() <= noonAmman.getTime() && noonAmman.getTime() < dayBounds.end.getTime());

const mgrPhoto = managerKpi(
  {
    overallQcSum: 0,
    overallQcWeight: 0,
    criticalResolvedWithinSla: 0,
    criticalResolvedInPeriod: 0,
    criticalOverdueUnresolved: 0,
    correctiveClosedOnTime: 0,
    correctiveEligible: 0,
    checklistCompleted: 0,
    checklistDue: 0,
    repeatCount: 0,
    exposureCount: 0,
    productQualitySum: 0,
    productQualityWeight: 0,
    foodSafetySum: 0,
    foodSafetyWeight: 0,
    teamImprovementDelta: null,
    approvedEmployeeError: false,
    photoSubmitted: 8,
    photoExpected: 10,
    photoUniqueDays: 1,
    photoDaysElapsed: 1,
    photoApproved: 0,
    photoReviewed: 0,
    photoQualitySum: 0,
    photoQualityCount: 0,
  },
  mergeApprovedPhotoWeights(DEFAULT_WEIGHTS.manager, undefined, true)
);
assert.ok(mgrPhoto.total != null);
assert.ok(mgrPhoto.components.some((c) => c.key === 'photo_submission' && c.status === 'scored'));

const amPhoto = assistantManagerKpi(
  {
    branchCompleted: 0,
    branchDue: 0,
    issuesResolvedOnTime: 0,
    issuesEligible: 0,
    staffFollowupDone: 0,
    staffFollowupEligible: 0,
    openingClosingOnTime: 0,
    openingClosingDue: 0,
    repeatCount: 0,
    exposureCount: 0,
    productCleaningSum: 0,
    productCleaningWeight: 0,
    correctiveClosedOnTime: 0,
    correctiveEligible: 0,
    approvedEmployeeError: false,
    photoSubmitted: 10,
    photoExpected: 10,
    photoUniqueDays: 1,
    photoDaysElapsed: 1,
    photoApproved: 0,
    photoReviewed: 0,
    photoQualitySum: 0,
    photoQualityCount: 0,
  },
  mergeApprovedPhotoWeights(DEFAULT_WEIGHTS.assistant_manager, undefined, true)
);
assert.ok(amPhoto.total != null);
assert.equal(mergeApprovedPhotoWeights(DEFAULT_WEIGHTS.staff, undefined, true).photo_submission, APPROVED_PHOTO_KPI_WEIGHTS.photo_submission);

const branch = fs.readFileSync(path.join(root, 'src/app/api/kpi/branch/route.ts'), 'utf8');
assert.match(branch, /requireKpiRosterViewer/);
assert.match(branch, /hrKpiReviewer/);
assert.match(branch, /range/);
assert.match(branch, /kpiPeriodScore/);
assert.match(branch, /parseStoredKpiExplanation/);
assert.match(branch, /KPI_ROSTER_LIVE_FILL/);

const panel = fs.readFileSync(path.join(root, 'src/components/qc-ops/KpiPanel.tsx'), 'utf8');
assert.match(panel, /Daily/);
assert.match(panel, /Weekly/);
assert.match(panel, /Monthly/);

const sessionSrc = fs.readFileSync(path.join(root, 'src/lib/session.ts'), 'utf8');
assert.match(sessionSrc, /requireKpiRosterViewer/);

const hr = fs.readFileSync(path.join(root, 'src/app/api/kpi/hr-reviews/route.ts'), 'utf8');
assert.match(hr, /requireHrKpiReviewer/);
assert.match(hr, /canOverwriteTotals: false/);
assert.doesNotMatch(hr, /total:\s*parsed/);

const mig = fs.readFileSync(path.join(root, 'prisma/migrations/0021_jordan_kpi_hr.sql'), 'utf8');
assert.match(mig, /KpiHrReview/);
assert.match(mig, /hrKpiReviewer/);
assert.doesNotMatch(mig.toUpperCase(), /DROP TABLE/);
assert.doesNotMatch(mig, /approved = 1/);

assert.equal(hrNoteTone(8), 'good');
assert.equal(hrNoteTone(3), 'bad');
assert.equal(hrNoteTone(5), 'neutral');
assert.equal(hrNotesComponent([]).status, 'not_rated');
assert.equal(hrNotesComponent([10]).raw, 100);
assert.equal(hrNotesComponent([0]).raw, 0);
assert.equal(hrNotesComponent([8, 2]).raw, 50);
const blended = withHrNotesKpi(
  { total: 80, usedWeight: 80, components: [{ key: 'timeliness', weight: 80, raw: 80, status: 'scored', evidenceCount: 2 }] },
  [0]
);
assert.ok(blended.total != null && blended.total < 80);
assert.ok(blended.components.some((c) => c.key === 'hr_notes' && c.raw === 0));

const hrNotesMig = fs.readFileSync(path.join(root, 'prisma/migrations/0026_hr_notes.sql'), 'utf8');
assert.match(hrNotesMig, /HrNote/);
assert.doesNotMatch(hrNotesMig.toUpperCase(), /DROP TABLE/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/kpi-compute.ts'), 'utf8'), /withHrNotesKpi/);

const frozen = ['advances', 'leave', 'salary'];
const session = fs.readFileSync(path.join(root, 'src/lib/session.ts'), 'utf8');
assert.match(session, /requireHrKpiReviewer/);
assert.match(session, /requireHrStaffAdmin/);
void frozen;

console.log('jordan-kpi: ok');

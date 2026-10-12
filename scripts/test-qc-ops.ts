import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { QC_INSPECTION_DOMAINS } from '../src/lib/qc-domains';
import { QC_DOMAIN_TEMPLATE_FIELDS, QC_WINDOW_TEMPLATES } from '../src/lib/qc-inspection-templates';
import {
  answerFailsField,
  parseTemplateFields,
  uniqueSections,
  validateAnswersAgainstFields,
} from '../src/lib/formTemplate';
import { actorMayVerify, canTransitionIssue, sourceAnswerId } from '../src/lib/issue-lifecycle';
import {
  assistantManagerKpi,
  combineWeighted,
  componentFromRatio,
  criticalIssuesComponent,
  officialKpiAllowed,
  recurringIssuesComponent,
  staffKpi,
} from '../src/lib/kpi-engine';
import { aiLiveEnabled, aiPaidUsageApproved, assertAiLiveReady, AiUnavailableError, estimateUsd } from '../src/lib/ai-provider';
import { photoQcSuggestionSchema, productRefSuggestionSchema } from '../src/lib/ai-schemas';
import { uploadKeyFromPath } from '../src/lib/ai-images';
import { isInspectionSchedulerEnabled } from '../src/lib/inspection-generate';
import { hasCapability } from '../src/lib/permissions';

assert.equal(QC_INSPECTION_DOMAINS.length, 7);
for (const domain of QC_INSPECTION_DOMAINS) {
  const fields = QC_DOMAIN_TEMPLATE_FIELDS[domain];
  assert.ok(fields.length >= 4, domain);
  assert.ok(uniqueSections(fields).length >= 1);
  const parsed = parseTemplateFields(JSON.stringify(fields));
  assert.equal(parsed.length, fields.length);
}
assert.ok(QC_WINDOW_TEMPLATES.some((t) => t.window === 'opening'));
assert.ok(QC_WINDOW_TEMPLATES.some((t) => t.window === 'closing'));

const failField = QC_DOMAIN_TEMPLATE_FIELDS.barista_qc[0];
assert.equal(answerFailsField(failField, 'fail'), true);
assert.equal(answerFailsField(failField, 'pass'), false);
assert.throws(
  () => validateAnswersAgainstFields(QC_DOMAIN_TEMPLATE_FIELDS.barista_qc.slice(0, 2), { station_ready: 'fail' }),
  /Missing evidence/
);
const passed = validateAnswersAgainstFields(QC_DOMAIN_TEMPLATE_FIELDS.barista_qc.slice(0, 2), {
  station_ready: 'pass',
});
assert.equal(passed.station_ready, 'pass');

assert.equal(canTransitionIssue('open', 'acknowledged'), true);
assert.equal(canTransitionIssue('fixed', 'verified'), true);
assert.equal(canTransitionIssue('fixed', 'reopened'), true);
assert.equal(canTransitionIssue('closed', 'open'), false);
assert.equal(actorMayVerify('owner'), true);
assert.equal(actorMayVerify('qc'), true);
assert.equal(actorMayVerify('manager'), false);
assert.equal(actorMayVerify('assistant_manager'), false);
assert.equal(sourceAnswerId('sub1', 'q1'), 'sub1:q1');

const zero = componentFromRatio('timeliness', 15, 0, 0, 10);
assert.equal(zero.status, 'not_rated');
assert.equal(zero.raw, null);

const provisional = componentFromRatio('timeliness', 15, 3, 5, 10);
assert.equal(provisional.status, 'provisional');

const scored = componentFromRatio('timeliness', 15, 9, 10, 10);
assert.equal(scored.status, 'scored');

const recZero = recurringIssuesComponent(5, 0, 0);
assert.equal(recZero.status, 'not_rated');
assert.notEqual(recZero.raw, 100);

const crit = criticalIssuesComponent(15, 2, 2, 2);
assert.equal(crit.raw, 50);

const staff = staffKpi({
  onTimeCompleted: 10,
  eligibleDue: 10,
  qualityScoreSum: 20,
  qualityWeightSum: 20,
  weightedAnswers: 20,
  completedTasks: 10,
  assignedTasks: 10,
  productQualitySum: 10,
  productQualityWeight: 10,
  cleaningSum: 10,
  cleaningWeight: 10,
  correctiveClosedOnTime: 5,
  correctiveEligible: 5,
  repeatCount: 0,
  exposureCount: 10,
  approvedEmployeeError: false,
});
assert.ok(staff.total != null);
assert.ok(staff.components.find((c) => c.key === 'recurring_issues')?.status === 'not_rated');

const staffPenalized = staffKpi({
  onTimeCompleted: 10,
  eligibleDue: 10,
  qualityScoreSum: 20,
  qualityWeightSum: 20,
  weightedAnswers: 20,
  completedTasks: 10,
  assignedTasks: 10,
  productQualitySum: 10,
  productQualityWeight: 10,
  cleaningSum: 10,
  cleaningWeight: 10,
  correctiveClosedOnTime: 5,
  correctiveEligible: 5,
  repeatCount: 2,
  exposureCount: 10,
  approvedEmployeeError: true,
});
const rec = staffPenalized.components.find((c) => c.key === 'recurring_issues');
assert.equal(rec?.status, 'scored');
assert.equal(rec?.raw, 80);

const am = assistantManagerKpi({
  branchCompleted: 8,
  branchDue: 10,
  issuesResolvedOnTime: 4,
  issuesEligible: 5,
  staffFollowupDone: 5,
  staffFollowupEligible: 5,
  openingClosingOnTime: 8,
  openingClosingDue: 8,
  repeatCount: 0,
  exposureCount: 10,
  productCleaningSum: 10,
  productCleaningWeight: 10,
  correctiveClosedOnTime: 4,
  correctiveEligible: 5,
  approvedEmployeeError: false,
});
assert.ok(am.total != null);

const combined = combineWeighted([
  { key: 'a', weight: 50, raw: 100, status: 'scored', evidenceCount: 10 },
  { key: 'b', weight: 50, raw: 50, status: 'provisional', evidenceCount: 2 },
]);
assert.equal(combined.total, 100);

assert.equal(officialKpiAllowed(0), false);
assert.equal(officialKpiAllowed(1), false);
assert.equal(officialKpiAllowed(2), true);

assert.equal(aiLiveEnabled(), false);
assert.equal(aiPaidUsageApproved(), false);
assert.throws(() => assertAiLiveReady(), (e: unknown) => e instanceof AiUnavailableError && e.code === 'credentials_missing');
assert.equal(uploadKeyFromPath('/api/uploads/abc.jpg'), 'abc.jpg');
assert.equal(uploadKeyFromPath('/uploads/../secret'), null);
const photoShape = photoQcSuggestionSchema.parse({
  unassessable: true,
  imageClarity: 'poor',
  criteria: [{ key: 'subject_visible', met: null, note: 'Subject not visible' }],
  explanation: 'Retake; subject not visible.',
  cannotAssess: ['temperature'],
  humanMustConfirm: true,
});
assert.equal(photoShape.unassessable, true);
const cmp = productRefSuggestionSchema.parse({
  visibleDifferences: ['Garnish missing'],
  presentationObservations: ['Cup is visible'],
  suggestedCompliance: 'uncertain',
  uncertainty: 'Angle differs from reference',
  recommendHumanReview: true,
});
assert.equal(cmp.recommendHumanReview, true);
assert.ok(estimateUsd('gpt-4o', 1000, 200) > 0);
assert.ok(estimateUsd('whisper-1', 0, 0, 1) === 0.006);
const providerSrc = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/lib/ai-provider.ts'), 'utf8');
assert(!providerSrc.includes('function mockAi'), 'user-facing mock fallback must be removed');
assert(providerSrc.includes('api.openai.com'));
const prodWranglerAi = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../wrangler.jsonc'), 'utf8');
assert(!prodWranglerAi.includes('OPENAI_API_KEY'));
assert(prodWranglerAi.includes('AI_PAID_USAGE_APPROVED'));
async function assertAiMocks() {
  /* live provider tests are BLOCKED without credentials + budget approval */
}

const prev = process.env.INSPECTION_SCHEDULER_ENABLED;
delete process.env.INSPECTION_SCHEDULER_ENABLED;
assert.equal(isInspectionSchedulerEnabled(), false);
process.env.INSPECTION_SCHEDULER_ENABLED = '1';
assert.equal(isInspectionSchedulerEnabled(), true);
if (prev === undefined) delete process.env.INSPECTION_SCHEDULER_ENABLED;
else process.env.INSPECTION_SCHEDULER_ENABLED = prev;

assert.equal(hasCapability('manager', 'inspections:run'), true);
assert.equal(hasCapability('staff', 'issues:update'), false);
assert.equal(hasCapability('assistant_manager', 'issues:update'), true);
assert.equal(hasCapability('manager', 'qc:review'), true);
assert.equal(hasCapability('assistant_manager', 'inspections:viewBranch'), false);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const prodWrangler = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
assert(!prodWrangler.includes('INSPECTION_SCHEDULER_ENABLED'), 'production must not enable scheduler');
assert(prodWrangler.includes('PHOTO_CHECK_SCHEDULER_ENABLED'), 'production photo scheduler must be enabled');
assert(prodWrangler.includes('drinkat-management'));
assert(!prodWrangler.includes('drinkat-qc-staging'));

const mig18 = fs.readFileSync(path.join(root, 'prisma/migrations/0018_ai_real.sql'), 'utf8');
assert(!mig18.toUpperCase().includes('DROP TABLE'));
assert(mig18.includes('SopDocument'));

const mig = fs.readFileSync(path.join(root, 'prisma/migrations/0017_qc_ops.sql'), 'utf8');
const sqlBody = mig
  .split('\n')
  .filter((l) => l.trim() && !l.trim().startsWith('--'))
  .join('\n')
  .toUpperCase();
assert(!sqlBody.includes('DROP TABLE'));
assert(!sqlBody.includes('DROP COLUMN'));
assert(!sqlBody.includes('DELETE FROM'));
assert(sqlBody.includes('ADD COLUMN') || sqlBody.includes('CREATE TABLE'));

void assertAiMocks()
  .then(() => {
    console.log('qc-ops: ok');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

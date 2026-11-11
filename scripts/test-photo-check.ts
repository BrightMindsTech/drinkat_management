import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_WEIGHTS,
  PROPOSED_PHOTO_KPI_WEIGHTS,
  resolveStaffWeights,
  staffKpi,
} from '../src/lib/kpi-engine';
import { scorePhotoCriteria } from '../src/lib/photo-score';
import { isPhotoCheckSchedulerEnabled } from '../src/lib/photo-generate';
import {
  PHOTO_360_CODE,
  PHOTO_360_MAX_PHOTOS,
  PHOTO_360_MIN_PHOTOS,
  PHOTO_DEFAULT_MAX_PHOTOS,
  PHOTO_UPLOAD_MAX_BYTES,
  clampPhotoLimits,
  normalizeSubmissionUploadPaths,
  applyPhotoSlotChange,
} from '../src/lib/photo-multi';
import { isUniqueConflictError } from '../src/lib/db-errors';
import { photoQualityContribution, photoSubmissionCountsInQuality } from '../src/lib/photo-kpi';
import {
  PHOTO_TASK_CREATE_BATCH,
  photoInstantInZone,
  photoPeriodKey,
  photoWindowInstants,
  shouldCreatePhotoOccurrence,
} from '../src/lib/photo-generate';
import { isPhotoWindowOpenNow, photoWeekday } from '../src/lib/photo-time';
import {
  ACTIVE_PHOTO_REMINDER_MINUTES,
  PHOTO_REMINDER_PUSH_TTL_SEC,
  isPhotoTaskActiveForReminder,
  latestPhotoReminderAt,
  shouldSendActivePhotoReminder,
} from '../src/lib/photo-reminders';
import { hashTrustedDeviceToken, trustedDeviceExpired } from '../src/lib/trusted-device';
import { resolvePushNavigationUrl, safeInternalPath } from '../src/lib/push-navigation';
import {
  PHOTO_360_OFFICIAL_WINDOWS,
  PHOTO_PROGRAM_STAMP,
  PHOTO_SATURDAY_DAYS_JSON,
  PHOTO_SATURDAY_ONLY_CODES,
  PHOTO_SATURDAY_WEEKDAY,
  PHOTO_WINDOW_HANDOFF_MINUTES,
  isSaturdayOnlyPhotoCode,
  minutesBeforeClock,
  photoScheduleDaysJson,
} from '../src/lib/photo-official-windows';
import { photoSchedulesMatchOfficial } from '../src/lib/photo-ops-program';
import {
  pickBranchInspectionRecipientIds,
  pickQcReportRecipientIds,
  pickQcReportRecipientIdsMany,
  peopleNotifyOptions,
} from '../src/lib/qc-field-reports';
import {
  BRANCH_INSPECTION_ITEM_IDS,
  BRANCH_INSPECTION_KIND,
  BRANCH_INSPECTION_SECTIONS,
  countInspectionResults,
  encodeInspectionPayload,
  parseInspectionPayload,
  parseQcReportPhotos,
  validateInspectionAnswers,
} from '../src/lib/qc-branch-inspection';
import { employeeEligibleForDefaultPhotoOps } from '../src/lib/photo-eligibility';
import { formatPhotoCountdown, listUpcomingPhotoWindows, nextPhotoWave } from '../src/lib/photo-upcoming';
import {
  BRANCH_PHOTO_CLAIMED,
  BRANCH_PHOTO_CLAIMED_CODE,
  photoBranchWindowKey,
  pickPhotoWindowWinner,
} from '../src/lib/photo-branch-claim';
import { extractChatContent } from '../src/lib/ai-provider';
import { photoQcSuggestionSchema } from '../src/lib/ai-schemas';

const scored = scorePhotoCriteria(
  [
    { key: 'a', labelEn: 'A', weight: 40 },
    { key: 'b', labelEn: 'B', weight: 60 },
  ],
  [
    { key: 'a', met: true },
    { key: 'b', met: true },
  ]
);
assert.equal(scored.outcome, 'pass');
assert.equal(scored.score, 100);

const failed = scorePhotoCriteria(
  [
    { key: 'a', labelEn: 'A', weight: 50 },
    { key: 'b', labelEn: 'B', weight: 50 },
  ],
  [
    { key: 'a', met: true },
    { key: 'b', met: false },
  ]
);
assert.equal(failed.outcome, 'fail');
assert.equal(failed.score, 50);

const un = scorePhotoCriteria([{ key: 'a', labelEn: 'A', weight: 10 }], [{ key: 'a', met: null }], true);
assert.equal(un.outcome, 'unassessable');
assert.equal(un.score, null);

assert.equal(isPhotoCheckSchedulerEnabled(), false);

const boosted = staffKpi({
  onTimeCompleted: 0,
  eligibleDue: 0,
  qualityScoreSum: 0,
  qualityWeightSum: 0,
  weightedAnswers: 0,
  completedTasks: 0,
  assignedTasks: 0,
  productQualitySum: 0,
  productQualityWeight: 0,
  cleaningSum: 0,
  cleaningWeight: 0,
  correctiveClosedOnTime: 0,
  correctiveEligible: 0,
  repeatCount: 0,
  exposureCount: 0,
  approvedEmployeeError: false,
  photoSubmitted: 3,
  photoExpected: 3,
  photoUniqueDays: 1,
  photoDaysElapsed: 1,
  photoApproved: 2,
  photoReviewed: 2,
  photoQualitySum: 160,
  photoQualityCount: 2,
});
assert.equal(boosted.total, null);
assert.equal(boosted.components.find((c) => c.key === 'photo_quality'), undefined);

const approvedWeights = staffKpi(
  {
    onTimeCompleted: 0,
    eligibleDue: 0,
    qualityScoreSum: 0,
    qualityWeightSum: 0,
    weightedAnswers: 0,
    completedTasks: 0,
    assignedTasks: 0,
    productQualitySum: 0,
    productQualityWeight: 0,
    cleaningSum: 0,
    cleaningWeight: 0,
    correctiveClosedOnTime: 0,
    correctiveEligible: 0,
    repeatCount: 0,
    exposureCount: 0,
    approvedEmployeeError: false,
    photoSubmitted: 3,
    photoExpected: 3,
    photoUniqueDays: 1,
    photoDaysElapsed: 1,
    photoApproved: 2,
    photoReviewed: 2,
    photoQualitySum: 160,
    photoQualityCount: 2,
  },
  { ...DEFAULT_WEIGHTS.staff, ...PROPOSED_PHOTO_KPI_WEIGHTS }
);
assert.ok(approvedWeights.total != null && approvedWeights.total > 80);
assert.equal(approvedWeights.components.find((c) => c.key === 'photo_quality')?.raw, 80);

const gated = resolveStaffWeights({ ...DEFAULT_WEIGHTS.staff, ...PROPOSED_PHOTO_KPI_WEIGHTS }, false);
assert.equal(gated.photo_submission, 0);
assert.equal(gated.photo_quality, 0);
const ungated = resolveStaffWeights(DEFAULT_WEIGHTS.staff, true);
assert.equal(ungated.photo_submission, 20);
assert.equal(ungated.photo_quality, 15);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = fs.readFileSync(path.join(root, 'src/components/dashboard/DashboardHomeContent.tsx'), 'utf8');
assert.match(home, /getDashboardHomeTiles/);
assert.match(home, /HomeTileIcon/);
assert.match(home, /text-ios-blue/);
assert.match(home, /yourKpi/);
assert.match(home, /kpiScore/);
assert.match(fs.readFileSync(path.join(root, 'src/app/dashboard/page.tsx'), 'utf8'), /computeAndStoreEmployeeKpi/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/en.ts'), 'utf8'), /Your KPI:/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/ar.ts'), 'utf8'), /مؤشر أدائك:/);
assert.match(home, /PhotoSwipeReview/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/dashboard-home-tiles.ts'), 'utf8'), /homePhotoReview/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/dashboard-home-tiles.ts'), 'utf8'), /homePhotoArchive/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/dashboard-home-tiles.ts'), 'utf8'), /homeHrNotes/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/dashboard-home-tiles.ts'), 'utf8'), /homeTeam/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/session.ts'), 'utf8'), /requireHrStaffAdmin/);
assert.doesNotMatch(home, /PhotoTaskBoard/);
assert.doesNotMatch(home, /allTools/);
const notesLib = fs.readFileSync(path.join(root, 'src/lib/staff-notes.ts'), 'utf8');
assert.match(fs.readFileSync(path.join(root, 'src/components/notes/StaffNotesPanel.tsx'), 'utf8'), /grid-cols-3/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/components/notes/StaffNotesPanel.tsx'), 'utf8'), /grid-cols-1/);
assert.match(notesLib, /hrKpiReviewer/);
assert.match(notesLib, /notifyUsers/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/notes/route.ts'), 'utf8'), /sendStaffNote/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/hr-notes/route.ts'), 'utf8'), /requireHrKpiReviewer/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/hr-notes.ts'), 'utf8'), /computeAndStoreCurrentEmployeeKpis/);

const paths = normalizeSubmissionUploadPaths({
  uploadPath: '/api/uploads/a.jpg',
  uploadPaths: ['/api/uploads/b.jpg', '/api/uploads/a.jpg', ''],
});
assert.deepEqual(paths, ['/api/uploads/b.jpg', '/api/uploads/a.jpg']);
assert.equal(PHOTO_360_MIN_PHOTOS, 1);
assert.equal(PHOTO_360_MAX_PHOTOS, 3);
assert.deepEqual(clampPhotoLimits(1, 3), { min: 1, max: 3 });
assert.equal(PHOTO_360_CODE, 'branch_cleanliness_360');

assert.match(fs.readFileSync(path.join(root, 'src/components/photo-check/PhotoTaskBoard.tsx'), 'utf8'), /uploadPaths/);
assert.match(fs.readFileSync(path.join(root, 'src/components/photo-check/PhotoSwipeReview.tsx'), 'utf8'), /uploadPaths/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/photo-checks/route.ts'), 'utf8'), /staffPhotoCount/);

const mig24 = fs.readFileSync(path.join(root, 'prisma/migrations/0024_photo_multi.sql'), 'utf8');
assert.match(mig24, /PhotoCheckSubmissionImage/);
assert.match(mig24, /minPhotos/);
assert.match(mig24, /branch_cleanliness_360/);
assert.doesNotMatch(mig24, /DELETE FROM "Employee"/);

const mig = fs.readFileSync(path.join(root, 'prisma/migrations/0023_photo_catalog.sql'), 'utf8');
assert.match(mig, /PhotoCheckType/);
assert.match(mig, /slush_machine_cleaning/);
assert.doesNotMatch(mig, /shisha/i);
assert.doesNotMatch(mig.toUpperCase(), /DROP TABLE/);
assert.doesNotMatch(mig, /DELETE FROM "Employee"/);
assert.match(mig, /pct-08/);
assert.match(mig, /provisional/);
assert.doesNotMatch(mig, /pct-17/);
assert.doesNotMatch(mig, /pct-23/);
assert.match(mig, /PhotoCheckTask_scheduleId_assigneeEmployeeId_periodKey_key/);
assert.match(mig, /NOT NULL DEFAULT 0/);

assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-eligibility.ts'), 'utf8'), /cancelOpenPhotoTasks/);
assert.match(
  fs.readFileSync(path.join(root, 'src/app/api/photo-ops/employees/route.ts'), 'utf8'),
  /global_photo_requirement_off/
);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-generate.ts'), 'utf8'), /shouldCreatePhotoOccurrence/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-generate.ts'), 'utf8'), /getCloudflareContext/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-generate.ts'), 'utf8'), /generatePhotoTasksForEmployee/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-generate.ts'), 'utf8'), /createMany/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-generate.ts'), 'utf8'), /PHOTO_TASK_CREATE_BATCH/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-generate.ts'), 'utf8'), /rows.slice/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-generate.ts'), 'utf8'), /deleteMany/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-generate.ts'), 'utf8'), /BRANCH_PHOTO_CLAIMED/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-generate.ts'), 'utf8'), /listClaimedPhotoWindows/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-generate.ts'), 'utf8'), /photoBranchWindowKey/);
assert.ok(PHOTO_TASK_CREATE_BATCH > 0 && PHOTO_TASK_CREATE_BATCH <= 20);
assert.equal(photoBranchWindowKey('b1', 's1'), 'b1:s1');
assert.equal(
  pickPhotoWindowWinner([
    { id: 'b', submittedAt: '2026-10-12T08:01:00.000Z' },
    { id: 'a', submittedAt: '2026-10-12T08:00:00.000Z' },
  ])?.id,
  'a'
);
assert.equal(
  pickPhotoWindowWinner([
    { id: 'b', submittedAt: '2026-10-12T08:00:00.000Z' },
    { id: 'a', submittedAt: '2026-10-12T08:00:00.000Z' },
  ])?.id,
  'a'
);
assert.equal(pickPhotoWindowWinner([]), null);
assert.equal(BRANCH_PHOTO_CLAIMED, 'branch_claimed');
assert.equal(BRANCH_PHOTO_CLAIMED_CODE, 'BRANCH_CLAIMED');
assert.match(fs.readFileSync(path.join(root, 'src/app/api/photo-checks/route.ts'), 'utf8'), /claimPhotoWindowForBranch/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/photo-checks/route.ts'), 'utf8'), /BRANCH_PHOTO_CLAIMED_CODE/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/photo-checks/route.ts'), 'utf8'), /branchId: task.branchId/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/photo-checks/tasks/route.ts'), 'utf8'), /hideClaimedPhotoTasksForEmployee/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-reminders.ts'), 'utf8'), /BRANCH_PHOTO_CLAIMED/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-branch-claim.ts'), 'utf8'), /branchId: input.branchId/);
assert.match(fs.readFileSync(path.join(root, 'src/components/photo-check/PhotoTaskBoard.tsx'), 'utf8'), /branchClaimed/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/en.ts'), 'utf8'), /branchClaimed/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/ar.ts'), 'utf8'), /branchClaimed/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-reminders.ts'), 'utf8'), /employeeAssignedType/);
assert.equal(ACTIVE_PHOTO_REMINDER_MINUTES, 30);
{
  const now = new Date();
  const open = {
    status: 'due',
    windowStartAt: new Date(now.getTime() - 60_000),
    dueAt: new Date(now.getTime() + 60_000),
  };
  const closed = {
    status: 'overdue',
    windowStartAt: new Date(now.getTime() - 4 * 60 * 60_000),
    dueAt: new Date(now.getTime() - 60_000),
  };
  const upcoming = {
    status: 'scheduled',
    windowStartAt: new Date(now.getTime() + 60_000),
    dueAt: new Date(now.getTime() + 2 * 60_000),
  };
  assert.equal(isPhotoWindowOpenNow(open, now), true);
  assert.equal(isPhotoWindowOpenNow(closed, now), false);
  assert.equal(isPhotoTaskActiveForReminder(open, now), true);
  assert.equal(isPhotoTaskActiveForReminder(closed, now), false);
  assert.equal(isPhotoTaskActiveForReminder(upcoming, now), false);
}
assert.match(fs.readFileSync(path.join(root, 'src/app/api/review-notifications/route.ts'), 'utf8'), /windowStartAt: \{ lte: now \}/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/review-notifications/route.ts'), 'utf8'), /dueAt: \{ gte: now \}/);
assert.doesNotMatch(
  fs.readFileSync(path.join(root, 'src/app/api/review-notifications/route.ts'), 'utf8'),
  /Take today.?s QC photo/
);
assert.match(fs.readFileSync(path.join(root, 'src/components/in-app/InAppNotificationStack.tsx'), 'utf8'), /windowStartAt/);
assert.match(fs.readFileSync(path.join(root, 'src/components/photo-check/PhotoTaskBoard.tsx'), 'utf8'), /windowGone/);
assert.match(fs.readFileSync(path.join(root, 'src/components/photo-check/PhotoTaskBoard.tsx'), 'utf8'), /isWindowClosed/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/en.ts'), 'utf8'), /windowGone/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/ar.ts'), 'utf8'), /windowGone/);
assert.equal(shouldSendActivePhotoReminder(null, new Date()), true);
assert.equal(shouldSendActivePhotoReminder(new Date(Date.now() - 29 * 60_000), new Date()), false);
assert.equal(shouldSendActivePhotoReminder(new Date(Date.now() - 30 * 60_000), new Date()), true);
assert.equal(PHOTO_REMINDER_PUSH_TTL_SEC, 28 * 60);
assert.equal(latestPhotoReminderAt([null, new Date('2026-10-13T10:00:00Z'), new Date('2026-10-13T10:20:00Z')])?.toISOString(), '2026-10-13T10:20:00.000Z');
assert.equal(latestPhotoReminderAt([null, null]), null);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-reminders.ts'), 'utf8'), /dashboard\/photo\?task=/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-reminders.ts'), 'utf8'), /byUser/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-reminders.ts'), 'utf8'), /ttlSec: PHOTO_REMINDER_PUSH_TTL_SEC/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-reminders.ts'), 'utf8'), /windowStartAt: \{ lte: now \}/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-reminders.ts'), 'utf8'), /dueAt: \{ gte: now \}/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-reminders.ts'), 'utf8'), /PHOTO_REMINDER_OPEN_TAKE/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/lib/photo-reminders.ts'), 'utf8'), /take: 2500/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/cron/time-clock/route.ts'), 'utf8'), /applyPhotoWindowStatuses/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-ops-program.ts'), 'utf8'), /photoSchedulesMatchOfficial/);
assert.doesNotMatch(
  fs.readFileSync(path.join(root, 'src/components/photo-check/PhotoTaskBoard.tsx'), 'utf8'),
  /row.status === 'scheduled'\) return true/
);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/lib/photo-reminders.ts'), 'utf8'), /lastReminderKind === kind/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/push.ts'), 'utf8'), /ttlSec \?\? 30 \* 60/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/lib/push.ts'), 'utf8'), /TTL: 300/);
assert.match(fs.readFileSync(path.join(root, 'src/components/photo-check/PhotoTaskReminderPulse.tsx'), 'utf8'), /30 \* 60 \* 1000/);
assert.match(fs.readFileSync(path.join(root, 'src/components/photo-check/PhotoTaskReminderPulse.tsx'), 'utf8'), /photo-checks\/tasks\?read=1/);
assert.match(fs.readFileSync(path.join(root, 'src/components/in-app/InAppNotificationStack.tsx'), 'utf8'), /photo-checks\/tasks\?read=1/);
assert.match(fs.readFileSync(path.join(root, 'src/components/in-app/InAppNotificationStack.tsx'), 'utf8'), /60_000/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/rate-limit-edge.ts'), 'utf8'), /max: 900/);
assert.match(fs.readFileSync(path.join(root, 'src/app/dashboard/layout.tsx'), 'utf8'), /PhotoTaskReminderPulse/);
assert.match(fs.readFileSync(path.join(root, 'src/components/PushForegroundBridge.tsx'), 'utf8'), /reminderAt/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/en.ts'), 'utf8'), /repeats every 30 minutes/);
assert.match(fs.readFileSync(path.join(root, 'src/app/dashboard/ai/page.tsx'), 'utf8'), /redirect\('\/dashboard'\)/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/ai-provider.ts'), 'utf8'), /extractChatContent/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/ai-provider.ts'), 'utf8'), /max_tokens: 1600/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/photo-checks/route.ts'), 'utf8'), /employeeOutcome: 'pending_qc'/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/kpi-compute.ts'), 'utf8'), /PHOTO_KPI_WEIGHTS_APPROVED_KEY/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-official-windows.ts'), 'utf8'), /08:00/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-official-windows.ts'), 'utf8'), /Asia\/Amman|DEFAULT_APP_TIMEZONE/);
assert.equal(PHOTO_WINDOW_HANDOFF_MINUTES, 30);
assert.equal(minutesBeforeClock('12:00', 30), '11:30');
assert.equal(minutesBeforeClock('08:00', 30), '07:30');
assert.deepEqual(
  PHOTO_360_OFFICIAL_WINDOWS.map((w) => `${w.slotKey}:${w.startTime}-${w.dueTime}`),
  ['morning:08:00-13:30', 'midday:14:00-19:30', 'night:20:00-07:30']
);
assert.match(PHOTO_PROGRAM_STAMP, /handoff-30/);
{
  const types = [
    { id: 't-daily', code: 'branch_cleanliness_360' },
    { id: 't-sat', code: 'slush_machine_cleaning' },
  ];
  const schedules = PHOTO_360_OFFICIAL_WINDOWS.flatMap((w) => [
    {
      typeId: 't-daily',
      slotKey: w.slotKey,
      startTime: w.startTime,
      dueTime: w.dueTime,
      daysOfWeekJson: photoScheduleDaysJson('branch_cleanliness_360'),
    },
    {
      typeId: 't-sat',
      slotKey: w.slotKey,
      startTime: w.startTime,
      dueTime: w.dueTime,
      daysOfWeekJson: photoScheduleDaysJson('slush_machine_cleaning'),
    },
  ]);
  assert.equal(photoSchedulesMatchOfficial(types, schedules), true);
  assert.equal(photoSchedulesMatchOfficial(types, schedules.slice(1)), false);
}
const program = fs.readFileSync(path.join(root, 'src/lib/photo-ops-program.ts'), 'utf8');
assert.match(program, /provisional: false/);
assert.match(program, /PHOTO_360_OFFICIAL_WINDOWS/);
assert.match(program, /slotKey: 'daily'/);
assert.match(program, /active: false/);
assert.match(program, /startTime: w.startTime/);
assert.match(program, /dueTime: w.dueTime/);
assert.match(program, /photoScheduleDaysJson/);
assert.match(program, /weekly_saturday_only/);
assert.match(program, /enableFullTimePhotoOps/);
assert.match(program, /enableStaff/);
assert.match(program, /PHOTO_PROGRAM_STAMP/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/photo-checks/tasks/route.ts'), 'utf8'), /employeePhotoRequired/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/app/api/photo-checks/tasks/route.ts'), 'utf8'), /ensureEmployeePhotoEligibility/);
assert.equal(PHOTO_SATURDAY_WEEKDAY, 6);
assert.equal(PHOTO_SATURDAY_DAYS_JSON, '[6]');
assert.equal(photoScheduleDaysJson('slush_machine_cleaning'), '[6]');
assert.equal(photoScheduleDaysJson('fryer_cleanliness'), '[6]');
assert.equal(photoScheduleDaysJson('grill_cleanliness'), '[6]');
assert.equal(photoScheduleDaysJson('preparation_refrigerator'), '[6]');
assert.equal(photoScheduleDaysJson('branch_cleanliness_360'), '[0,1,2,3,4,5,6]');
assert.equal(isSaturdayOnlyPhotoCode('slush_machine_cleaning'), true);
assert.deepEqual([...PHOTO_SATURDAY_ONLY_CODES], [
  'slush_machine_cleaning',
  'fryer_cleanliness',
  'grill_cleanliness',
  'preparation_refrigerator',
]);
assert.equal(
  employeeEligibleForDefaultPhotoOps({ status: 'active', role: 'manager', employmentType: 'full_time' }),
  true
);
assert.equal(
  employeeEligibleForDefaultPhotoOps({ status: 'active', role: 'staff', employmentType: 'full_time' }),
  true
);
assert.equal(
  employeeEligibleForDefaultPhotoOps({ status: 'active', role: 'manager', employmentType: 'part_time' }),
  false
);
assert.equal(
  employeeEligibleForDefaultPhotoOps({ status: 'active', role: 'staff', employmentType: 'part_time' }),
  false
);
assert.equal(
  employeeEligibleForDefaultPhotoOps({ status: 'terminated', role: 'staff', employmentType: 'full_time' }),
  false
);
assert.equal(photoWeekday('2026-10-24'), PHOTO_SATURDAY_WEEKDAY);
assert.match(fs.readFileSync(path.join(root, 'src/app/dashboard/layout.tsx'), 'utf8'), /employeeEligibleForDefaultPhotoOps/);
const saturdayOnlyUpcoming = listUpcomingPhotoWindows(
  [
    {
      scheduleId: 'slush-morning',
      typeId: 'slush',
      slotKey: 'morning',
      slotLabelEn: 'Morning',
      slotLabelAr: 'صباح',
      startTime: '08:00',
      dueTime: '13:00',
      daysOfWeekJson: PHOTO_SATURDAY_DAYS_JSON,
    },
  ],
  photoInstantInZone('2026-10-20', '10:00'),
  6
);
assert.equal(saturdayOnlyUpcoming[0]?.periodKey, '2026-10-24');
assert.equal(
  listUpcomingPhotoWindows(
    [
      {
        scheduleId: 'slush-morning',
        typeId: 'slush',
        slotKey: 'morning',
        slotLabelEn: 'Morning',
        slotLabelAr: 'صباح',
        startTime: '08:00',
        dueTime: '13:00',
        daysOfWeekJson: PHOTO_SATURDAY_DAYS_JSON,
      },
    ],
    photoInstantInZone('2026-10-20', '10:00'),
    2
  ).length,
  0
);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/cron/time-clock/route.ts'), 'utf8'), /ensureOfficialPhotoProgram/);
assert.doesNotMatch(program, /Other approved types = one midday/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/photo-ops/employees/route.ts'), 'utf8'), /generatePhotoTasksForEmployee/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/app/api/photo-ops/employees/route.ts'), 'utf8'), /ensureOfficialPhotoProgram/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/cron/time-clock/route.ts'), 'utf8'), /enableStaff: true/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-ops-program.ts'), 'utf8'), /enableStaff === true/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-generate.ts'), 'utf8'), /assigneeEmployeeId: onlyEmployeeId/);

const wrangler = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
assert.match(wrangler, /PHOTO_CHECK_SCHEDULER_ENABLED": "1"/);

assert.equal(clampPhotoLimits(4, 8).max, PHOTO_DEFAULT_MAX_PHOTOS);
assert.equal(clampPhotoLimits(1, 99).max, PHOTO_DEFAULT_MAX_PHOTOS);
assert.equal(clampPhotoLimits(9, 8).min, PHOTO_DEFAULT_MAX_PHOTOS);
assert.equal(PHOTO_DEFAULT_MAX_PHOTOS, 3);
assert.equal(PHOTO_UPLOAD_MAX_BYTES, 8 * 1024 * 1024);
assert.equal(normalizeSubmissionUploadPaths({ uploadPaths: ['/api/uploads/a.jpg', '/api/uploads/a.jpg'] }).length, 1);
assert.deepEqual(normalizeSubmissionUploadPaths({ uploadPath: '/api/uploads/z.jpg' }), ['/api/uploads/z.jpg']);
assert.equal(normalizeSubmissionUploadPaths({ uploadPaths: [] }).length, 0);

assert.equal(photoSubmissionCountsInQuality({ status: 'pending_qc', aiScore: 90, aiVerdict: 'pass' }), false);
assert.equal(photoSubmissionCountsInQuality({ status: 'approved', aiScore: 80, aiVerdict: 'pass' }), true);
assert.equal(photoSubmissionCountsInQuality({ status: 'approved', aiScore: null, aiVerdict: 'unassessable' }), false);
assert.equal(photoSubmissionCountsInQuality({ status: 'approved', aiScore: 40, aiVerdict: 'unassessable' }), false);
assert.equal(photoSubmissionCountsInQuality({ status: 'rejected', aiScore: null, aiVerdict: 'fail' }), true);
assert.equal(photoQualityContribution({ status: 'rejected', aiScore: 0, aiVerdict: 'fail' }), 0);
assert.equal(photoQualityContribution({ status: 'approved', aiScore: 80, aiVerdict: 'pass' }), 80);

const rejectedDenom = staffKpi(
  {
    onTimeCompleted: 0,
    eligibleDue: 0,
    qualityScoreSum: 0,
    qualityWeightSum: 0,
    weightedAnswers: 0,
    completedTasks: 0,
    assignedTasks: 0,
    productQualitySum: 0,
    productQualityWeight: 0,
    cleaningSum: 0,
    cleaningWeight: 0,
    correctiveClosedOnTime: 0,
    correctiveEligible: 0,
    repeatCount: 0,
    exposureCount: 0,
    approvedEmployeeError: false,
    photoSubmitted: 2,
    photoExpected: 2,
    photoUniqueDays: 1,
    photoDaysElapsed: 1,
    photoApproved: 1,
    photoReviewed: 2,
    photoQualitySum: 80,
    photoQualityCount: 2,
  },
  { ...DEFAULT_WEIGHTS.staff, ...PROPOSED_PHOTO_KPI_WEIGHTS }
);
assert.equal(rejectedDenom.components.find((c) => c.key === 'photo_quality')?.raw, 40);

assert.equal(isUniqueConflictError({ code: 'P2002' }), true);
assert.equal(isUniqueConflictError({ message: 'UNIQUE constraint failed: PhotoCheckSubmission.taskId' }), true);
assert.equal(isUniqueConflictError({ message: 'nope' }), false);

assert.equal(photoPeriodKey(new Date('2026-10-11T21:30:00.000Z'), 'Asia/Amman'), '2026-10-12');
assert.equal(photoPeriodKey(new Date('2026-10-11T20:30:00.000Z'), 'Asia/Amman'), '2026-10-11');
assert.equal(photoInstantInZone('2026-10-12', '11:00', 'Asia/Amman').toISOString(), '2026-10-12T08:00:00.000Z');
assert.equal(photoInstantInZone('2026-10-12', '08:00', 'Asia/Amman').toISOString(), '2026-10-12T05:00:00.000Z');
assert.equal(photoInstantInZone('2026-10-12', '22:00', 'Asia/Amman').toISOString(), '2026-10-12T19:00:00.000Z');
const morningDue = photoWindowInstants('2026-10-12', '08:00', '13:00', 'Asia/Amman').dueAt;
assert.equal(shouldCreatePhotoOccurrence(morningDue, photoInstantInZone('2026-10-12', '12:59', 'Asia/Amman')), true);
assert.equal(shouldCreatePhotoOccurrence(morningDue, photoInstantInZone('2026-10-12', '13:01', 'Asia/Amman')), false);
const nightWindow = photoWindowInstants('2026-10-12', '20:00', '02:00', 'Asia/Amman');
assert.equal(nightWindow.windowStartAt.toISOString(), '2026-10-12T17:00:00.000Z');
assert.equal(nightWindow.dueAt.toISOString(), '2026-10-12T23:00:00.000Z');
assert.equal(isPhotoWindowOpenNow(nightWindow, photoInstantInZone('2026-10-13', '01:00', 'Asia/Amman')), true);
assert.equal(isPhotoWindowOpenNow(nightWindow, photoInstantInZone('2026-10-13', '02:01', 'Asia/Amman')), false);
const officialNight = photoWindowInstants('2026-10-12', '20:00', '07:30', 'Asia/Amman');
assert.equal(isPhotoWindowOpenNow(officialNight, photoInstantInZone('2026-10-13', '06:00', 'Asia/Amman')), true);
assert.equal(isPhotoWindowOpenNow(officialNight, photoInstantInZone('2026-10-13', '07:31', 'Asia/Amman')), false);

const emptyAi = extractChatContent({ choices: [{ message: { content: '' } }] });
assert.equal(emptyAi, null);
const refusal = extractChatContent({
  choices: [{ message: { content: '', refusal: 'I cannot assess this.' } }],
});
assert.match(String(refusal), /unassessable/);
const parts = extractChatContent({
  choices: [{ message: { content: [{ text: '{"unassessable":true}' }] } }],
});
assert.match(String(parts), /unassessable/);

const invalidAi = photoQcSuggestionSchema.safeParse({});
assert.equal(invalidAi.success, true);
if (invalidAi.success) {
  assert.equal(invalidAi.data.humanMustConfirm, true);
  assert.equal(invalidAi.data.unassessable, false);
}
assert.equal(photoQcSuggestionSchema.safeParse('not-json').success, false);

const postSrc = fs.readFileSync(path.join(root, 'src/app/api/photo-checks/route.ts'), 'utf8');
assert.match(postSrc, /staffImages/);
assert.ok(postSrc.indexOf('loadInspectionImage(path)') < postSrc.indexOf('photoCheckSubmission.create'));
assert.match(postSrc, /This task was already submitted/);
assert.match(postSrc, /Nothing was submitted/);
assert.doesNotMatch(postSrc, /employeeOutcome: 'approved'/);

const board = fs.readFileSync(path.join(root, 'src/components/photo-check/PhotoTaskBoard.tsx'), 'utf8');
assert.ok(
  board.indexOf('dueTasks.map') < board.indexOf('t.photoCheck.nextWindowTitle'),
  'current required tasks must render above the next photo window'
);
assert.match(board, /photo-task-highlight/);
assert.match(board, /3000/);
assert.match(board, /useSearchParams/);
assert.match(board, /closeTask/);
assert.match(board, /photo-task-active-/);
assert.match(board, /openTask\(row\)/);
assert.match(board, /staffHowTo/);
assert.match(board, /sentToQc/);
assert.match(board, /dark:text-emerald-100/);
assert.match(board, /scrollIntoView/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/en.ts'), 'utf8'), /closeTask: 'Back'/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/ar.ts'), 'utf8'), /closeTask/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/en.ts'), 'utf8'), /staffHowTo/);
assert.match(fs.readFileSync(path.join(root, 'src/app/dashboard/page.tsx'), 'utf8'), /staffLandsOnPhotoChecks/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/dashboard-nav-config.ts'), 'utf8'), /staffLandsOnPhotoChecks/);
assert.match(fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8'), /photo-task-highlight 3s/);
assert.match(board, /submittingRef/);
assert.doesNotMatch(board, /chooseFromLibrary/);
assert.doesNotMatch(board, /libraryRef/);
assert.match(board, /openRearCameraCapture/);
assert.doesNotMatch(board, /\bmultiple\b/);
assert.match(board, /PHOTO_UPLOAD_MAX_BYTES/);
assert.match(board, /replacePhoto/);
assert.match(board, /discardUploads/);
assert.match(board, /PHOTO_DEFAULT_MAX_PHOTOS/);

const swipe = fs.readFileSync(path.join(root, 'src/components/photo-check/PhotoSwipeReview.tsx'), 'utf8');
assert.match(swipe, /decidingRef/);
assert.match(swipe, /stopPropagation/);
assert.match(swipe, /Already reviewed|409/);

const reviewSrc = fs.readFileSync(path.join(root, 'src/app/api/photo-checks/[id]/review/route.ts'), 'utf8');
assert.match(reviewSrc, /status: 'pending_qc'/);
assert.match(reviewSrc, /Already reviewed/);

const reports = fs.readFileSync(path.join(root, 'src/app/api/qc-reports/route.ts'), 'utf8');
assert.doesNotMatch(reports, /computeAndStoreEmployeeKpi/);
assert.match(reports, /resolveQcReportRecipients/);
assert.match(reports, /notifyTo/);
assert.match(reports, /notifyToSchema/);
assert.match(reports, /notifyOptions/);
assert.match(reports, /branch_inspection/);
assert.doesNotMatch(reports, /resolveBranchInspectionRecipients/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/qc-field-reports.ts'), 'utf8'), /hrKpiReviewer/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/qc-field-reports.ts'), 'utf8'), /pickQcReportRecipientIds/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/qc-field-reports.ts'), 'utf8'), /sara@drinkat.com/);
assert.doesNotMatch(reports, /employee: \{ branchId: parsed.data.branchId \}/);
const reportsUi = fs.readFileSync(path.join(root, 'src/components/qc/QcFieldReportsPanel.tsx'), 'utf8');
assert.match(reportsUi, /section-qc-reports/);
assert.match(reportsUi, /formatAppDateTime/);
assert.match(reportsUi, /qcReportsNew/);
assert.match(reportsUi, /AppModal/);
assert.match(reportsUi, /setCompose\('note'\)/);
assert.match(reportsUi, /qcReportsBranch/);
assert.match(reportsUi, /openRearCameraCapture/);
assert.match(reportsUi, /notifyTo/);
assert.match(reportsUi, /qcReportsNotify/);
assert.match(reportsUi, /qcInspectNew/);
assert.match(reportsUi, /QcBranchInspectionForm/);
assert.match(fs.readFileSync(path.join(root, 'src/components/qc/QcBranchInspectionForm.tsx'), 'utf8'), /openRearCameraCapture/);
assert.match(fs.readFileSync(path.join(root, 'src/components/qc/QcBranchInspectionForm.tsx'), 'utf8'), /openImageLibraryPick/);
assert.match(fs.readFileSync(path.join(root, 'src/components/qc/QcBranchInspectionForm.tsx'), 'utf8'), /photoUrls/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/open-camera-file.ts'), 'utf8'), /input.multiple = true/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/qc-branch-inspection.ts'), 'utf8'), /INSPECTION_PHOTOS_PER_ITEM_MAX/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/open-camera-file.ts'), 'utf8'), /export function openImageLibraryPick/);
assert.doesNotMatch(
  fs.readFileSync(path.join(root, 'src/lib/open-camera-file.ts'), 'utf8').split('export function openImageLibraryPick')[1] ?? '',
  /capture', 'environment'/
);
assert.match(fs.readFileSync(path.join(root, 'src/components/qc/QcBranchInspectionForm.tsx'), 'utf8'), /qcInspectPhotoLibrary/);
assert.match(fs.readFileSync(path.join(root, 'src/components/qc/QcBranchInspectionForm.tsx'), 'utf8'), /BRANCH_INSPECTION_KIND/);
assert.match(fs.readFileSync(path.join(root, 'src/components/qc/QcBranchInspectionForm.tsx'), 'utf8'), /notifyTo/);
assert.match(fs.readFileSync(path.join(root, 'src/components/qc/QcBranchInspectionForm.tsx'), 'utf8'), /QcNotifyPicker/);
assert.match(fs.readFileSync(path.join(root, 'src/components/qc/QcNotifyPicker.tsx'), 'utf8'), /type="checkbox"/);
assert.match(fs.readFileSync(path.join(root, 'src/components/qc/QcNotifyPicker.tsx'), 'utf8'), /peopleNotifyOptions/);
assert.match(reportsUi, /QcNotifyPicker/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/open-camera-file.ts'), 'utf8'), /color-scheme.*light/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/open-camera-file.ts'), 'utf8'), /capture', 'environment'/);
assert.doesNotMatch(reportsUi, /CATEGORIES/);
assert.doesNotMatch(reportsUi, /SEVERITIES/);
assert.doesNotMatch(reportsUi, /qcReportsAllSeverities/);

const ops = fs.readFileSync(path.join(root, 'src/app/api/photo-ops/employees/route.ts'), 'utf8');
assert.match(ops, /requirePhotoOpsAdmin/);
assert.match(ops, /cancelOpenPhotoTasks/);
assert.doesNotMatch(ops, /typeIds/);
const opsUi = fs.readFileSync(path.join(root, 'src/components/photo-check/PhotoOpsPanel.tsx'), 'utf8');
assert.match(opsUi, /aria-pressed/);
assert.doesNotMatch(opsUi, /Catalog/);
assert.doesNotMatch(opsUi, /Create slot/);

const cap = fs.readFileSync(path.join(root, 'capacitor.config.ts'), 'utf8');
assert.match(cap, /com\.bmtechs\.drinkat/);
assert.match(cap, /DrinkatHR-Native/);

const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
assert.match(pkg, /REFUSED: after production 0023/);
assert.match(pkg, /REFUSED: 0024 must not run against production/);
assert.match(pkg, /REFUSED: 0025 must not run against production/);

const mig25 = fs.readFileSync(path.join(root, 'prisma/migrations/0025_photo_limits_1_3.sql'), 'utf8');
assert.match(mig25, /minPhotos" = 1/);
assert.match(mig25, /maxPhotos" = 3/);
assert.match(mig25, /PhotoUploadDiscard/);
assert.doesNotMatch(mig25, /DELETE FROM "Employee"/);
assert.doesNotMatch(mig25.toUpperCase(), /DROP TABLE/);

assert.match(postSrc, /const refTake = 2/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/ai-provider.ts'), 'utf8'), /One photograph is sufficient/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/upload/discard/route.ts'), 'utf8'), /discardUncommittedUploads/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/permissions.ts'), 'utf8'), /upload\/discard/);

assert.deepEqual(applyPhotoSlotChange(['a'], 'b', { mode: 'add', max: 3 }), ['a', 'b']);
assert.deepEqual(applyPhotoSlotChange(['a', 'b'], 'c', { mode: 'add', max: 3 }), ['a', 'b', 'c']);
assert.deepEqual(applyPhotoSlotChange(['a', 'b', 'c'], 'd', { mode: 'add', max: 3 }), ['a', 'b', 'c']);
assert.deepEqual(applyPhotoSlotChange(['a', 'b', 'c'], 'x', { mode: 'replace', index: 1, max: 3 }), ['a', 'x', 'c']);
assert.equal(applyPhotoSlotChange(['a', 'b', 'c'], 'x', { mode: 'replace', index: 1, max: 3 }).length, 3);
assert.deepEqual(applyPhotoSlotChange(['a', 'b', 'c'], 'x', { mode: 'replace', index: 9, max: 3 }), ['a', 'b', 'c']);
assert.deepEqual(applyPhotoSlotChange(['a', 'b', 'c'], null, { mode: 'remove', index: 1, max: 3 }), ['a', 'c']);
assert.deepEqual(applyPhotoSlotChange(['a'], null, { mode: 'remove', index: 0, max: 3 }), []);

assert.match(board, /if \(res\.ok\)/);
assert.match(board, /committed = true/);
assert.match(board, /lookFor/);
assert.match(board, /applyPhotoSlotChange/);
assert.match(swipe, /aiAdvice/);
assert.match(swipe, /rounded-full/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/photo-checks/tasks/route.ts'), 'utf8'), /criteriaJson/);
const tasksRoute = fs.readFileSync(path.join(root, 'src/app/api/photo-checks/tasks/route.ts'), 'utf8');
assert.match(tasksRoute, /listUpcomingPhotoWindows/);
assert.match(tasksRoute, /generatePhotoTasksForEmployee/);
assert.match(tasksRoute, /searchParams.get\('read'\) === '1'/);
assert.doesNotMatch(tasksRoute, /ensureOfficialPhotoProgram/);
assert.match(tasksRoute, /yesterdayKey/);
assert.match(tasksRoute, /dueAt: \{ gte: now \}/);
assert.match(tasksRoute, /assignApprovedPhotoTypes/);
assert.doesNotMatch(tasksRoute, /official-\$\{w\.slotKey\}/);
assert.doesNotMatch(tasksRoute, /360° branch cleanliness/);
assert.match(board, /nextWindowTitle/);
assert.match(board, /formatPhotoCountdown/);
assert.match(board, /staffHowTo/);
assert.match(board, /loadingTasks/);
assert.match(board, /loadFailed/);
assert.match(board, /if \(!res\.ok\)/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/en.ts'), 'utf8'), /availableIn/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/ar.ts'), 'utf8'), /availableIn/);

const officialSchedules = PHOTO_360_OFFICIAL_WINDOWS.map((w) => ({
  scheduleId: w.slotKey,
  typeId: '360',
  slotKey: w.slotKey,
  slotLabelEn: w.slotLabelEn,
  slotLabelAr: w.slotLabelAr,
  startTime: w.startTime,
  dueTime: w.dueTime,
  daysOfWeekJson: '[0,1,2,3,4,5,6]',
}));
const betweenWindows = listUpcomingPhotoWindows(officialSchedules, photoInstantInZone('2026-10-12', '16:30'));
assert.equal(betweenWindows[0]?.slotKey, 'night');
assert.equal(betweenWindows[0]?.periodKey, '2026-10-12');
assert.equal(nextPhotoWave(betweenWindows).length, 1);
const sameStart = [
  { windowStartAt: photoInstantInZone('2026-10-13', '08:00'), type: '360' },
  { windowStartAt: photoInstantInZone('2026-10-13', '08:00'), type: 'table' },
  { windowStartAt: photoInstantInZone('2026-10-13', '12:00'), type: 'later' },
];
assert.equal(nextPhotoWave(sameStart).length, 2);
const afterLast = listUpcomingPhotoWindows(officialSchedules, photoInstantInZone('2026-10-12', '22:30'));
assert.equal(afterLast[0]?.slotKey, 'morning');
assert.equal(afterLast[0]?.periodKey, '2026-10-13');
const afterMidnight = listUpcomingPhotoWindows(officialSchedules, photoInstantInZone('2026-10-13', '01:00'));
assert.equal(afterMidnight[0]?.slotKey, 'morning');
assert.equal(afterMidnight[0]?.periodKey, '2026-10-13');
const betweenMidAndNight = listUpcomingPhotoWindows(officialSchedules, photoInstantInZone('2026-10-12', '19:00'));
assert.equal(betweenMidAndNight[0]?.slotKey, 'night');
const beforeMorning = listUpcomingPhotoWindows(officialSchedules, photoInstantInZone('2026-10-12', '07:00'));
assert.equal(beforeMorning[0]?.slotKey, 'morning');
assert.equal(beforeMorning[0]?.periodKey, '2026-10-12');
assert.equal(formatPhotoCountdown(3661000, 'en'), '1h 01m');
assert.match(formatPhotoCountdown(90_000, 'ar'), /د/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/photo-checks/queue/route.ts'), 'utf8'), /criteriaJson/);
assert.match(fs.readFileSync(path.join(root, 'scripts/grant-sara-production.ts'), 'utf8'), /d1 execute/);
assert.match(fs.readFileSync(path.join(root, 'scripts/grant-sara-production.ts'), 'utf8'), /--remote/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'scripts/grant-sara-production.ts'), 'utf8'), /from 'wrangler'/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-upload-discard.ts'), 'utf8'), /usedChild/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/en.ts'), 'utf8'), /lookFor/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/ar.ts'), 'utf8'), /lookFor/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/en.ts'), 'utf8'), /Photo archive/);
assert.match(fs.readFileSync(path.join(root, 'src/locales/ar.ts'), 'utf8'), /أرشيف الصور/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/session.ts'), 'utf8'), /requirePhotoArchiveViewer/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/photo-checks/archive/route.ts'), 'utf8'), /requirePhotoArchiveViewer/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/cron/time-clock/route.ts'), 'utf8'), /purgeExpiredPhotoArchive/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-archive.ts'), 'utf8'), /PHOTO_ARCHIVE_RETENTION_DAYS = 30/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/photo-multi.ts'), 'utf8'), /purged/);
assert.match(fs.readFileSync(path.join(root, 'src/lib/upload-access.ts'), 'utf8'), /hrKpiReviewer/);

const pendingKpi = staffKpi(
  {
    onTimeCompleted: 0,
    eligibleDue: 0,
    qualityScoreSum: 0,
    qualityWeightSum: 0,
    weightedAnswers: 0,
    completedTasks: 0,
    assignedTasks: 0,
    productQualitySum: 0,
    productQualityWeight: 0,
    cleaningSum: 0,
    cleaningWeight: 0,
    correctiveClosedOnTime: 0,
    correctiveEligible: 0,
    repeatCount: 0,
    exposureCount: 0,
    approvedEmployeeError: false,
    photoSubmitted: 1,
    photoExpected: 1,
    photoUniqueDays: 1,
    photoDaysElapsed: 1,
    photoApproved: 0,
    photoReviewed: 0,
    photoQualitySum: 0,
    photoQualityCount: 0,
  },
  { ...DEFAULT_WEIGHTS.staff, ...PROPOSED_PHOTO_KPI_WEIGHTS }
);
assert.equal(pendingKpi.components.find((c) => c.key === 'photo_approval')?.raw, null);
assert.equal(pendingKpi.components.find((c) => c.key === 'photo_quality')?.raw, null);

const notifyPeople = [
  { userId: 'owner-1', email: 'owner@drinkat.com', role: 'owner', hrKpiReviewer: false, name: 'Owner', branchId: '', branchName: '' },
  { userId: 'sara-1', email: 'sara@drinkat.com', role: 'hr', hrKpiReviewer: true, name: 'Sara', branchId: '', branchName: '' },
  { userId: 'mgr-1', email: 'm1@drinkat.com', role: 'manager', hrKpiReviewer: false, name: 'M1', branchId: 'b-air', branchName: 'Airport' },
  { userId: 'mgr-2', email: 'm2@drinkat.com', role: 'manager', hrKpiReviewer: false, name: 'M2', branchId: 'b-city', branchName: 'City' },
];
assert.deepEqual(pickQcReportRecipientIds(notifyPeople, 'qc-1', 'sara').sort(), ['sara-1']);
assert.deepEqual(pickQcReportRecipientIds(notifyPeople, 'qc-1', 'owner').sort(), ['owner-1']);
assert.deepEqual(pickQcReportRecipientIds(notifyPeople, 'qc-1', 'managers').sort(), ['mgr-1', 'mgr-2']);
assert.deepEqual(pickQcReportRecipientIds(notifyPeople, 'qc-1', 'manager:mgr-2').sort(), ['mgr-2']);
assert.deepEqual(pickQcReportRecipientIds(notifyPeople, 'qc-1', 'all').sort(), ['mgr-1', 'mgr-2', 'owner-1', 'sara-1']);
assert.equal(pickQcReportRecipientIds(notifyPeople, 'owner-1', 'owner').length, 0);
assert.deepEqual(
  pickQcReportRecipientIdsMany(notifyPeople, 'qc-1', ['sara', 'manager:mgr-1']).sort(),
  ['mgr-1', 'sara-1']
);
assert.deepEqual(
  pickQcReportRecipientIdsMany(notifyPeople, 'qc-1', ['owner', 'managers']).sort(),
  ['mgr-1', 'mgr-2', 'owner-1']
);
assert.deepEqual(peopleNotifyOptions([{ value: 'all' }, { value: 'sara' }, { value: 'managers' }, { value: 'manager:x' }]).map((o) => o.value), [
  'sara',
  'manager:x',
]);
assert.deepEqual(pickBranchInspectionRecipientIds(notifyPeople, 'qc-1', 'b-air').sort(), ['mgr-1', 'owner-1', 'sara-1']);
assert.deepEqual(pickBranchInspectionRecipientIds(notifyPeople, 'qc-1', 'b-city').sort(), ['mgr-2', 'owner-1', 'sara-1']);
assert.ok(!pickBranchInspectionRecipientIds(notifyPeople, 'qc-1', 'b-air').includes('mgr-2'));

assert.equal(BRANCH_INSPECTION_SECTIONS.length, 5);
assert.equal(BRANCH_INSPECTION_ITEM_IDS.length, 29);
assert.ok(BRANCH_INSPECTION_ITEM_IDS.includes('b6'));
assert.ok(BRANCH_INSPECTION_ITEM_IDS.includes('e4'));
assert.ok(BRANCH_INSPECTION_ITEM_IDS.includes('d8'));
assert.equal(BRANCH_INSPECTION_SECTIONS[3].items.some((i) => i.id === 'd8' && i.titleEn === 'Cleaning tools' && i.titleAr === 'ادوات التنظيف'), true);
assert.equal(BRANCH_INSPECTION_SECTIONS[1].items.some((i) => i.titleEn === 'Vegetables & Fruits'), true);
assert.equal(BRANCH_INSPECTION_SECTIONS[4].items.some((i) => i.titleEn === 'Vegetables & Fruits'), true);
assert.equal(BRANCH_INSPECTION_SECTIONS[0].titleAr, 'الالتزام بالسياسات');
assert.equal(BRANCH_INSPECTION_SECTIONS[1].titleAr, 'FIFO - FEFO نظام الاستهلاك');
assert.equal(BRANCH_INSPECTION_SECTIONS[2].titleAr, 'التغليف والتواريخ');
assert.equal(BRANCH_INSPECTION_SECTIONS[3].titleAr, 'النظافة');
assert.equal(BRANCH_INSPECTION_SECTIONS[4].titleAr, 'الفحص الحسي');
assert.equal(BRANCH_INSPECTION_KIND, 'branch_inspection');
assert.equal(validateInspectionAnswers({}).ok, false);
const allPass: Record<string, { result: 'pass' | 'fail'; photoUrl: string | null; photoUrls?: string[] }> = {};
for (const id of BRANCH_INSPECTION_ITEM_IDS) allPass[id] = { result: 'pass', photoUrl: null };
allPass.a1 = { result: 'fail', photoUrl: '/uploads/x.jpg', photoUrls: ['/uploads/x.jpg', '/uploads/y.jpg'] };
const checked = validateInspectionAnswers(allPass);
assert.equal(checked.ok, true);
if (checked.ok) {
  assert.deepEqual(countInspectionResults(checked.answers), { pass: 28, fail: 1 });
  assert.deepEqual(checked.answers.a1?.photoUrls, ['/uploads/x.jpg', '/uploads/y.jpg']);
  const payload = encodeInspectionPayload(checked.answers, 'hood dirty');
  assert.equal(parseInspectionPayload(JSON.stringify(payload))?.notes, 'hood dirty');
  assert.deepEqual(parseQcReportPhotos(JSON.stringify(payload)), ['/uploads/x.jpg', '/uploads/y.jpg']);
}
{
  const onlyLegacyPhoto = validateInspectionAnswers(
    Object.fromEntries(BRANCH_INSPECTION_ITEM_IDS.map((id) => [id, { result: 'pass', photoUrl: id === 'a1' ? '/uploads/old.jpg' : null }]))
  );
  assert.equal(onlyLegacyPhoto.ok, true);
  if (onlyLegacyPhoto.ok) {
    assert.deepEqual(onlyLegacyPhoto.answers.a1?.photoUrls, ['/uploads/old.jpg']);
  }
}
assert.deepEqual(parseQcReportPhotos(JSON.stringify(['/a.jpg', '/b.jpg'])), ['/a.jpg', '/b.jpg']);
{
  const legacy: Record<string, { result: 'pass' | 'fail'; photoUrl: string | null }> = {};
  for (const id of BRANCH_INSPECTION_ITEM_IDS) {
    if (id === 'b6' || id === 'e4' || id === 'd8') continue;
    legacy[id] = { result: 'pass', photoUrl: null };
  }
  const parsedLegacy = parseInspectionPayload(
    JSON.stringify({ kind: BRANCH_INSPECTION_KIND, v: 1, answers: legacy, notes: 'old visit' })
  );
  assert.equal(parsedLegacy?.notes, 'old visit');
  assert.equal(parsedLegacy?.answers.b6, undefined);
  assert.equal(parsedLegacy?.answers.e4, undefined);
  assert.equal(parsedLegacy?.answers.d8, undefined);
}

assert.equal(
  resolvePushNavigationUrl({
    type: 'qc_field_report',
    url: '/dashboard/qc-reports',
    reportId: 'rpt_1',
  }),
  '/dashboard/qc-reports?report=rpt_1'
);
assert.equal(
  resolvePushNavigationUrl({
    type: 'photo_check_due',
    url: '/dashboard/photo',
    taskId: 'task_9',
  }),
  '/dashboard/photo?task=task_9'
);
assert.equal(
  resolvePushNavigationUrl({ type: 'photo_check_review', submissionId: 'sub_2' }),
  '/dashboard/photo-review?submission=sub_2'
);
assert.equal(
  resolvePushNavigationUrl({ type: 'inspection_due', url: '/dashboard/tasks', taskId: 'insp_3' }),
  '/dashboard/tasks/insp_3'
);
assert.equal(safeInternalPath('https://evil.example/phish'), '/dashboard');
assert.equal(safeInternalPath('/dashboard/qc-reports?report=a'), '/dashboard/qc-reports?report=a');
assert.equal(hashTrustedDeviceToken('abc').length, 64);
assert.equal(trustedDeviceExpired(new Date(Date.now() - 400 * 24 * 60 * 60 * 1000)), true);
assert.equal(trustedDeviceExpired(new Date()), false);
assert.match(fs.readFileSync(path.join(root, 'src/app/login/page.tsx'), 'utf8'), /resumeTrustedDeviceSession/);
assert.match(fs.readFileSync(path.join(root, 'src/components/SignOutButton.tsx'), 'utf8'), /revokeThisTrustedDevice/);
assert.match(swipe, /submission/);
assert.match(reportsUi, /get\('report'\)/);
assert.match(fs.readFileSync(path.join(root, 'src/app/api/photo-checks/route.ts'), 'utf8'), /photo_check_review/);
assert.match(fs.readFileSync(path.join(root, 'public/push-navigation-sw.js'), 'utf8'), /qc_field_report/);
assert.match(fs.readFileSync(path.join(root, 'public/push-navigation-sw.js'), 'utf8'), /photo_check_review/);

console.log('photo-check: ok');

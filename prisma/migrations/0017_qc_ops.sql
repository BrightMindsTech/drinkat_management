-- Phase 2–5 additive QC operations schema.
-- ADD COLUMN + CREATE TABLE only. No drops. No deletes.
-- Do not apply to production. Staging: npm run db:d1:migrate:qc-ops:staging

ALTER TABLE "InspectionSchedule" ADD COLUMN "window" TEXT NOT NULL DEFAULT 'any';
ALTER TABLE "InspectionSchedule" ADD COLUMN "label" TEXT;

ALTER TABLE "InspectionTask" ADD COLUMN "startedAt" DATETIME;
ALTER TABLE "InspectionTask" ADD COLUMN "submittedAt" DATETIME;
ALTER TABLE "InspectionTask" ADD COLUMN "draftJson" TEXT;
ALTER TABLE "InspectionTask" ADD COLUMN "submissionId" TEXT;
ALTER TABLE "InspectionTask" ADD COLUMN "excusedReason" TEXT;
ALTER TABLE "InspectionTask" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Issue" ADD COLUMN "branchId" TEXT;
ALTER TABLE "Issue" ADD COLUMN "inspectionTaskId" TEXT;
ALTER TABLE "Issue" ADD COLUMN "submissionId" TEXT;
ALTER TABLE "Issue" ADD COLUMN "questionKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Issue" ADD COLUMN "questionLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Issue" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "Issue" ADD COLUMN "assigneeEmployeeId" TEXT;
ALTER TABLE "Issue" ADD COLUMN "responsibilitySuggested" TEXT;
ALTER TABLE "Issue" ADD COLUMN "responsibilityApproved" TEXT;
ALTER TABLE "Issue" ADD COLUMN "responsibilityApprovedById" TEXT;
ALTER TABLE "Issue" ADD COLUMN "beforePhotoPath" TEXT;
ALTER TABLE "Issue" ADD COLUMN "afterPhotoPath" TEXT;
ALTER TABLE "Issue" ADD COLUMN "correctiveAction" TEXT;
ALTER TABLE "Issue" ADD COLUMN "verifiedAt" DATETIME;
ALTER TABLE "Issue" ADD COLUMN "verifiedById" TEXT;
ALTER TABLE "Issue" ADD COLUMN "closedAt" DATETIME;
ALTER TABLE "Issue" ADD COLUMN "reopenCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Issue" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Issue_branchId_idx" ON "Issue"("branchId");
CREATE INDEX IF NOT EXISTS "Issue_status_idx" ON "Issue"("status");
CREATE INDEX IF NOT EXISTS "Issue_inspectionTaskId_idx" ON "Issue"("inspectionTaskId");

CREATE TABLE IF NOT EXISTS "IssueEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "issueId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "actorUserId" TEXT,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssueEvent_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IssueEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "IssueEvent_issueId_createdAt_idx" ON "IssueEvent"("issueId", "createdAt");

CREATE TABLE IF NOT EXISTS "IssueComment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "issueId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssueComment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "IssueComment_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "IssueComment_issueId_createdAt_idx" ON "IssueComment"("issueId", "createdAt");

CREATE TABLE IF NOT EXISTS "EscalationRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "severity" TEXT NOT NULL,
  "slaHours" INTEGER NOT NULL,
  "notifyRolesJson" TEXT NOT NULL DEFAULT '[]',
  "notifyUserIdsJson" TEXT NOT NULL DEFAULT '[]',
  "active" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EscalationRule_severity_idx" ON "EscalationRule"("severity");

CREATE TABLE IF NOT EXISTS "KpiWeightConfig" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "subjectRole" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "weightsJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "KpiWeightConfig_subjectRole_versionNumber_key"
  ON "KpiWeightConfig"("subjectRole", "versionNumber");

CREATE TABLE IF NOT EXISTS "KpiPeriodScore" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "subjectRole" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'shadow',
  "total" REAL,
  "explanationJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KpiPeriodScore_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "KpiPeriodScore_employeeId_periodKey_mode_key"
  ON "KpiPeriodScore"("employeeId", "periodKey", "mode");
CREATE INDEX IF NOT EXISTS "KpiPeriodScore_periodKey_idx" ON "KpiPeriodScore"("periodKey");

CREATE TABLE IF NOT EXISTS "ResponsibilityDecision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "issueId" TEXT NOT NULL,
  "classification" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" DATETIME,
  "note" TEXT,
  CONSTRAINT "ResponsibilityDecision_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ResponsibilityDecision_issueId_key" ON "ResponsibilityDecision"("issueId");

CREATE TABLE IF NOT EXISTS "AiRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "inputJson" TEXT NOT NULL,
  "outputJson" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'mock',
  "mocked" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AiRun_kind_createdAt_idx" ON "AiRun"("kind", "createdAt");

CREATE TABLE IF NOT EXISTS "QcAppConfig" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL
);

INSERT OR IGNORE INTO "QcAppConfig" ("key", "value") VALUES ('kpi_mode', 'shadow');
INSERT OR IGNORE INTO "QcAppConfig" ("key", "value") VALUES ('official_kpi_cycles_completed', '0');
INSERT OR IGNORE INTO "QcAppConfig" ("key", "value") VALUES ('repeat_issue_window_days', '14');

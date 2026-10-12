-- Phase 1 additive schema (DRINKAT QC).
-- Safe to apply: ADD COLUMN + CREATE TABLE only. No drops.
-- Does NOT activate inspection scheduling (InspectionSchedule.active defaults to 0).
-- Run locally after backup. Do not apply to production until staging is verified.
--
-- npm run db:d1:migrate:qc-phase1:local

ALTER TABLE "ManagementFormTemplate" ADD COLUMN "currentVersionId" TEXT;
ALTER TABLE "ManagementFormSubmission" ADD COLUMN "templateVersionId" TEXT;

CREATE TABLE IF NOT EXISTS "FormTemplateVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "fieldsJson" TEXT NOT NULL,
  "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedById" TEXT,
  CONSTRAINT "FormTemplateVersion_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "ManagementFormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FormTemplateVersion_publishedById_fkey"
    FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "FormTemplateVersion_templateId_versionNumber_key"
  ON "FormTemplateVersion"("templateId", "versionNumber");
CREATE INDEX IF NOT EXISTS "FormTemplateVersion_templateId_idx" ON "FormTemplateVersion"("templateId");

-- Snapshot every existing published template as immutable version 1.
INSERT INTO "FormTemplateVersion" ("id", "templateId", "versionNumber", "category", "title", "description", "fieldsJson", "publishedAt")
SELECT
  'ftv1_' || "id",
  "id",
  1,
  "category",
  "title",
  "description",
  "fieldsJson",
  CURRENT_TIMESTAMP
FROM "ManagementFormTemplate"
WHERE "id" NOT IN (SELECT "templateId" FROM "FormTemplateVersion");

UPDATE "ManagementFormTemplate"
SET "currentVersionId" = 'ftv1_' || "id"
WHERE "currentVersionId" IS NULL;

UPDATE "ManagementFormSubmission"
SET "templateVersionId" = (
  SELECT t."currentVersionId" FROM "ManagementFormTemplate" t WHERE t."id" = "ManagementFormSubmission"."templateId"
)
WHERE "templateVersionId" IS NULL;

CREATE INDEX IF NOT EXISTS "ManagementFormSubmission_templateVersionId_idx"
  ON "ManagementFormSubmission"("templateVersionId");

CREATE TABLE IF NOT EXISTS "InspectionSchedule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "templateVersionId" TEXT,
  "branchId" TEXT,
  "employeeId" TEXT,
  "role" TEXT,
  "recurrence" TEXT NOT NULL DEFAULT 'daily',
  "deadlineTime" TEXT NOT NULL DEFAULT '23:59',
  "active" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InspectionSchedule_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "ManagementFormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InspectionSchedule_templateVersionId_fkey"
    FOREIGN KEY ("templateVersionId") REFERENCES "FormTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InspectionSchedule_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "InspectionSchedule_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "InspectionSchedule_templateId_idx" ON "InspectionSchedule"("templateId");
CREATE INDEX IF NOT EXISTS "InspectionSchedule_branchId_idx" ON "InspectionSchedule"("branchId");
CREATE INDEX IF NOT EXISTS "InspectionSchedule_active_idx" ON "InspectionSchedule"("active");

CREATE TABLE IF NOT EXISTS "InspectionTask" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scheduleId" TEXT NOT NULL,
  "templateVersionId" TEXT NOT NULL,
  "assigneeEmployeeId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "dueAt" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InspectionTask_scheduleId_fkey"
    FOREIGN KEY ("scheduleId") REFERENCES "InspectionSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InspectionTask_templateVersionId_fkey"
    FOREIGN KEY ("templateVersionId") REFERENCES "FormTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "InspectionTask_assigneeEmployeeId_fkey"
    FOREIGN KEY ("assigneeEmployeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InspectionTask_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "InspectionTask_scheduleId_assigneeEmployeeId_periodKey_key"
  ON "InspectionTask"("scheduleId", "assigneeEmployeeId", "periodKey");
CREATE INDEX IF NOT EXISTS "InspectionTask_assigneeEmployeeId_periodKey_idx"
  ON "InspectionTask"("assigneeEmployeeId", "periodKey");
CREATE INDEX IF NOT EXISTS "InspectionTask_branchId_idx" ON "InspectionTask"("branchId");

CREATE TABLE IF NOT EXISTS "Issue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceAnswerId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Issue_sourceAnswerId_key" ON "Issue"("sourceAnswerId");

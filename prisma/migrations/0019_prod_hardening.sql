-- Staging production-readiness hardening. Additive only.
-- Do not apply to production drinkat-management.

ALTER TABLE "InspectionTask" ADD COLUMN "lastRemindedAt" DATETIME;
ALTER TABLE "Issue" ADD COLUMN "lastEscalatedAt" DATETIME;

CREATE TABLE IF NOT EXISTS "UploadObject" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "objectKey" TEXT NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UploadObject_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "UploadObject_objectKey_key" ON "UploadObject"("objectKey");
CREATE INDEX IF NOT EXISTS "UploadObject_uploadedByUserId_idx" ON "UploadObject"("uploadedByUserId");
CREATE INDEX IF NOT EXISTS "InspectionTask_status_dueAt_idx" ON "InspectionTask"("status", "dueAt");
CREATE INDEX IF NOT EXISTS "Issue_assigneeEmployeeId_idx" ON "Issue"("assigneeEmployeeId");

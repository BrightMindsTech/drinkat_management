-- Jordan KPI HR review + SOP adoption audit. Additive only. Staging first.
-- Does not approve SOP rows. Does not delete historical records.

ALTER TABLE "User" ADD COLUMN "hrKpiReviewer" BOOLEAN NOT NULL DEFAULT 0;

ALTER TABLE "SopDocument" ADD COLUMN "adoptedFromId" TEXT;
ALTER TABLE "SopDocument" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "SopDocument" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "SopDocument" ADD COLUMN "documentVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS "KpiHrReview" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'operational',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "comments" TEXT,
  "flaggedReason" TEXT,
  "calculatedTotal" REAL,
  "calculatedSnapshotJson" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "KpiHrReview_employeeId_periodKey_mode_key" ON "KpiHrReview"("employeeId", "periodKey", "mode");
CREATE INDEX IF NOT EXISTS "KpiHrReview_periodKey_status_idx" ON "KpiHrReview"("periodKey", "status");
CREATE INDEX IF NOT EXISTS "KpiHrReview_reviewedById_idx" ON "KpiHrReview"("reviewedById");

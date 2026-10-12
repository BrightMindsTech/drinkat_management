-- Photo-first QC checks. Additive only. Does not touch Employee/User rows.

CREATE TABLE IF NOT EXISTS "PhotoCheckSubmission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "uploadPath" TEXT NOT NULL,
  "aiVerdict" TEXT NOT NULL DEFAULT 'pending',
  "aiExplanation" TEXT,
  "aiClarity" TEXT,
  "aiProblemsJson" TEXT,
  "aiRunId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending_qc',
  "qcReviewedById" TEXT,
  "qcReviewedAt" DATETIME,
  "qcNote" TEXT,
  "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PhotoCheckSubmission_employeeId_submittedAt_idx" ON "PhotoCheckSubmission"("employeeId", "submittedAt");
CREATE INDEX IF NOT EXISTS "PhotoCheckSubmission_status_submittedAt_idx" ON "PhotoCheckSubmission"("status", "submittedAt");
CREATE INDEX IF NOT EXISTS "PhotoCheckSubmission_branchId_status_idx" ON "PhotoCheckSubmission"("branchId", "status");

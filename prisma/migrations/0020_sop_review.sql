-- SOP QC review fields. Additive only. Do not apply to production.
-- Does not approve any document.

ALTER TABLE "SopDocument" ADD COLUMN "qcDomain" TEXT;
ALTER TABLE "SopDocument" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "SopDocument" ADD COLUMN "reviewedById" TEXT;
ALTER TABLE "SopDocument" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "SopDocument" ADD COLUMN "reviewNote" TEXT;
CREATE INDEX IF NOT EXISTS "SopDocument_sourceRef_idx" ON "SopDocument"("sourceRef");
CREATE INDEX IF NOT EXISTS "SopDocument_qcDomain_reviewStatus_idx" ON "SopDocument"("qcDomain", "reviewStatus");

-- Real AI audit fields + approved SOP store.
-- Additive only. Do not apply to production.

ALTER TABLE "AiRun" ADD COLUMN "errorCode" TEXT;
ALTER TABLE "AiRun" ADD COLUMN "tokensIn" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AiRun" ADD COLUMN "tokensOut" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AiRun" ADD COLUMN "estimatedUsd" REAL NOT NULL DEFAULT 0;
ALTER TABLE "AiRun" ADD COLUMN "latencyMs" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "SopDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'en',
  "body" TEXT NOT NULL,
  "sourceRef" TEXT NOT NULL,
  "approved" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SopDocument_approved_locale_idx" ON "SopDocument"("approved", "locale");

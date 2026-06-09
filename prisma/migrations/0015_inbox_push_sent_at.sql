-- Track push delivery per inbox row so skipped/failed pushes can be retried automatically.
-- Run: npm run db:d1:migrate:inbox-push:remote / :local

ALTER TABLE "InboxNotification" ADD COLUMN "pushSentAt" DATETIME;

-- Historical rows: treat as already delivered so cron does not spam old alerts.
UPDATE "InboxNotification" SET "pushSentAt" = "createdAt" WHERE "pushSentAt" IS NULL;

CREATE INDEX IF NOT EXISTS "InboxNotification_userId_pushSentAt_idx" ON "InboxNotification"("userId", "pushSentAt");

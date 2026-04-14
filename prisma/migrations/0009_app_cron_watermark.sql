-- Throttle for automatic chat retention (no external cron required).
-- Run: npm run db:d1:migrate:watermark:remote / :local

CREATE TABLE "AppCronWatermark" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "lastRunAt" DATETIME NOT NULL
);

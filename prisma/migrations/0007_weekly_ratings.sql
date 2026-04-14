-- Weekly peer/manager ratings (0–100), per branch + ISO week (Monday YYYY-MM-DD in app TZ).
-- Run remote: npm run db:d1:migrate:weekly-ratings:remote
-- Run local:  npm run db:d1:migrate:weekly-ratings:local

CREATE TABLE "WeeklyRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "raterEmployeeId" TEXT NOT NULL,
    "targetEmployeeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "weekStartKey" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyRating_raterEmployeeId_fkey" FOREIGN KEY ("raterEmployeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyRating_targetEmployeeId_fkey" FOREIGN KEY ("targetEmployeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyRating_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WeeklyRating_raterEmployeeId_targetEmployeeId_weekStartKey_key" ON "WeeklyRating"("raterEmployeeId", "targetEmployeeId", "weekStartKey");
CREATE INDEX "WeeklyRating_branchId_weekStartKey_idx" ON "WeeklyRating"("branchId", "weekStartKey");
CREATE INDEX "WeeklyRating_targetEmployeeId_weekStartKey_idx" ON "WeeklyRating"("targetEmployeeId", "weekStartKey");

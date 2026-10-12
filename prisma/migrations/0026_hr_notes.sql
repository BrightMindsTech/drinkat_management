-- Unlimited HR notes (0–10 + reason). Additive; no employee/user rows changed.
CREATE TABLE IF NOT EXISTS "HrNote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE,
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "HrNote_employeeId_createdAt_idx" ON "HrNote"("employeeId", "createdAt");
CREATE INDEX IF NOT EXISTS "HrNote_reviewerId_idx" ON "HrNote"("reviewerId");

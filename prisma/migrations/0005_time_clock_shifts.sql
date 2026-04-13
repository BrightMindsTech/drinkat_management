-- Time clock, geofence, shifts, push (D1 / SQLite)
-- Run ONCE per database. Re-running fails (tables already exist) — that is expected if already applied.
-- Morning 7:30–17:00 | Night 17:00–02:00; see 0006 for airport profile.

CREATE TABLE "ShiftDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "crossesMidnight" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ShiftDefinition_key_key" ON "ShiftDefinition"("key");

INSERT INTO "ShiftDefinition" ("id", "key", "name", "startMinute", "endMinute", "crossesMidnight", "createdAt")
VALUES
  ('shift_morning', 'morning', 'Morning (7:30–17:00)', 450, 1020, 0, datetime('now')),
  ('shift_night', 'night', 'Night (17:00–02:00)', 1020, 120, 1, datetime('now'));

ALTER TABLE "Branch" ADD COLUMN "latitude" REAL;
ALTER TABLE "Branch" ADD COLUMN "longitude" REAL;
ALTER TABLE "Branch" ADD COLUMN "geofenceRadiusM" REAL NOT NULL DEFAULT 25;

ALTER TABLE "User" ADD COLUMN "locationConsentAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "pushConsentAt" DATETIME;

ALTER TABLE "Employee" ADD COLUMN "shiftDefinitionId" TEXT;
UPDATE "Employee" SET "shiftDefinitionId" = 'shift_morning' WHERE "shiftDefinitionId" IS NULL;

CREATE TABLE "TimeClockEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "clockInAt" DATETIME NOT NULL,
    "clockOutAt" DATETIME,
    "clockInLat" REAL,
    "clockInLng" REAL,
    "clockOutLat" REAL,
    "clockOutLng" REAL,
    "clockOutReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeClockEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeClockEntry_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TimeClockEntry_employeeId_clockOutAt_idx" ON "TimeClockEntry"("employeeId", "clockOutAt");

CREATE TABLE "AwaySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "otherNote" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    CONSTRAINT "AwaySession_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AwaySession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AwaySession_employeeId_status_idx" ON "AwaySession"("employeeId", "status");
CREATE INDEX "AwaySession_endsAt_status_idx" ON "AwaySession"("endsAt", "status");

CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keysJson" TEXT,
    "provider" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");

CREATE TABLE "InboxNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "dataJson" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InboxNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "InboxNotification_userId_readAt_idx" ON "InboxNotification"("userId", "readAt");

-- FK Employee -> ShiftDefinition (added after ShiftDefinition exists)
-- SQLite cannot ADD CONSTRAINT easily; app layer enforces. Optional PRAGMA legacy.

-- Run ONCE per database. Re-running fails if column already exists — expected after first success.
-- Morning 7:30–17:00 all branches; night 17:00–02:00; airport branch profile for Fri 17:30–Sat 02:30 (handled in app)

ALTER TABLE "Branch" ADD COLUMN "shiftProfile" TEXT NOT NULL DEFAULT 'default';

UPDATE "ShiftDefinition"
SET "startMinute" = 450, "endMinute" = 1020, "name" = 'Morning (7:30–17:00)'
WHERE "id" = 'shift_morning';

UPDATE "ShiftDefinition"
SET "startMinute" = 1020, "endMinute" = 120, "name" = 'Night (17:00–02:00)'
WHERE "id" = 'shift_night';

-- Match Airport branch by name (case-insensitive ASCII)
UPDATE "Branch" SET "shiftProfile" = 'airport' WHERE lower("name") LIKE '%airport%';

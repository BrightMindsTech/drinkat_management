-- Management forms: no approve/deny workflow; submissions are "submitted" to the manager.
-- Run against remote D1: npm run db:d1:migrate:form-status:remote
--
-- Normalize legacy rows still marked pending (the API now always sets status on create).
-- Note: SQLite may still show DEFAULT 'pending' on the column until a full table rebuild;
--       inserts from this app pass status explicitly, so new rows are correct.
UPDATE "ManagementFormSubmission" SET "status" = 'submitted' WHERE "status" = 'pending';

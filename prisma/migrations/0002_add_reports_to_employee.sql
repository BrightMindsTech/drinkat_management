-- Add manager reporting column for direct reports (manager -> staff/qc).
-- This is an incremental migration to be run after 0001_init.sql has already created tables.

ALTER TABLE "Employee"
ADD COLUMN "reportsToEmployeeId" TEXT;


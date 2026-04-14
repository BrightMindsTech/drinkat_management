-- full_time | part_time (part-time: min 15 clock-in days per month, enforced in reports / HR copy)
ALTER TABLE "Employee" ADD COLUMN "employmentType" TEXT NOT NULL DEFAULT 'full_time';

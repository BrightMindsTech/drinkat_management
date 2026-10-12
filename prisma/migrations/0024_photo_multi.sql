-- Multiple photographs in one photo-check submission (360° = different corners, not a panorama).
-- Additive only. Does not touch Employee/User rows. Do not run against production in this pass.

ALTER TABLE "PhotoCheckType" ADD COLUMN "minPhotos" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "PhotoCheckType" ADD COLUMN "maxPhotos" INTEGER NOT NULL DEFAULT 8;

UPDATE "PhotoCheckType"
SET
  "minPhotos" = 4,
  "maxPhotos" = 8,
  "criteriaJson" = '[{"key":"subject_visible","labelEn":"A branch interior area is clearly visible","labelAr":"منطقة داخل الفرع ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photographs are sharp enough to assess","labelAr":"الصور واضحة بما يكفي للتقييم","weight":30},{"key":"area_coverage","labelEn":"Different corners of a representative public area are shown","labelAr":"تظهر زوايا مختلفة من منطقة عامة ممثلة","weight":30}]'
WHERE "code" = 'branch_cleanliness_360';

CREATE TABLE IF NOT EXISTS "PhotoCheckSubmissionImage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "uploadPath" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhotoCheckSubmissionImage_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "PhotoCheckSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PhotoCheckSubmissionImage_submissionId_sortOrder_idx"
  ON "PhotoCheckSubmissionImage"("submissionId", "sortOrder");
CREATE INDEX IF NOT EXISTS "PhotoCheckSubmissionImage_uploadPath_idx"
  ON "PhotoCheckSubmissionImage"("uploadPath");

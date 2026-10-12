-- Owner 2026-10-12: every photo-check type accepts 1–3 photographs.
-- Additive UPDATE only. Does not touch Employee/User rows or historical submissions.
-- Does not activate catalog types or approve reference photographs.

UPDATE "PhotoCheckType"
SET
  "minPhotos" = 1,
  "maxPhotos" = 3;

UPDATE "PhotoCheckType"
SET
  "criteriaJson" = '[{"key":"subject_visible","labelEn":"A branch interior area is clearly visible","labelAr":"منطقة داخل الفرع ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photographs are sharp enough to assess","labelAr":"الصور واضحة بما يكفي للتقييم","weight":30},{"key":"area_coverage","labelEn":"The submitted view shows a representative public area of the branch","labelAr":"تظهر الصورة منطقة عامة ممثلة من الفرع","weight":30}]'
WHERE "code" = 'branch_cleanliness_360';

CREATE TABLE IF NOT EXISTS "PhotoUploadDiscard" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PhotoUploadDiscard_userId_createdAt_idx"
  ON "PhotoUploadDiscard"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "PhotoUploadDiscard_objectKey_idx"
  ON "PhotoUploadDiscard"("objectKey");

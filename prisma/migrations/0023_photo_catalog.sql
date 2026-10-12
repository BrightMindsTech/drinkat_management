-- Titled photo checks, assignments, multi-slot schedules, QC field reports.
-- Additive only. Does not touch Employee/User rows. Does not enable any employee.
-- All catalog types start inactive. No production schedules are created here.

ALTER TABLE "User" ADD COLUMN "photoOpsAdmin" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "qcReportsInbox" BOOLEAN NOT NULL DEFAULT 0;

ALTER TABLE "PhotoCheckSubmission" ADD COLUMN "taskId" TEXT;
ALTER TABLE "PhotoCheckSubmission" ADD COLUMN "typeId" TEXT;
ALTER TABLE "PhotoCheckSubmission" ADD COLUMN "measuredValue" TEXT;
ALTER TABLE "PhotoCheckSubmission" ADD COLUMN "aiScore" REAL;
ALTER TABLE "PhotoCheckSubmission" ADD COLUMN "aiCriteriaJson" TEXT;

CREATE TABLE IF NOT EXISTS "PhotoCheckType" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "titleEn" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "groupKey" TEXT NOT NULL DEFAULT 'barista',
  "active" INTEGER NOT NULL DEFAULT 0,
  "provisional" INTEGER NOT NULL DEFAULT 0,
  "requiresMeasurement" INTEGER NOT NULL DEFAULT 0,
  "measurementUnit" TEXT,
  "handwrittenNote" TEXT,
  "criteriaJson" TEXT NOT NULL DEFAULT '[]',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PhotoCheckType_code_key" ON "PhotoCheckType"("code");

CREATE TABLE IF NOT EXISTS "PhotoCheckReference" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "typeId" TEXT NOT NULL,
  "uploadPath" TEXT NOT NULL,
  "approved" INTEGER NOT NULL DEFAULT 0,
  "createdById" TEXT NOT NULL,
  "approvedById" TEXT,
  "approvedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PhotoCheckReference_typeId_approved_idx" ON "PhotoCheckReference"("typeId", "approved");

CREATE TABLE IF NOT EXISTS "PhotoCheckEmployeeSetting" (
  "employeeId" TEXT NOT NULL PRIMARY KEY,
  "required" INTEGER NOT NULL DEFAULT 0,
  "updatedById" TEXT,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PhotoCheckEmployeeType" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "typeId" TEXT NOT NULL,
  "assigned" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PhotoCheckEmployeeType_employeeId_typeId_key" ON "PhotoCheckEmployeeType"("employeeId", "typeId");
CREATE INDEX IF NOT EXISTS "PhotoCheckEmployeeType_employeeId_assigned_idx" ON "PhotoCheckEmployeeType"("employeeId", "assigned");

CREATE TABLE IF NOT EXISTS "PhotoCheckAssignmentAudit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "beforeJson" TEXT NOT NULL,
  "afterJson" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PhotoCheckAssignmentAudit_employeeId_createdAt_idx" ON "PhotoCheckAssignmentAudit"("employeeId", "createdAt");

CREATE TABLE IF NOT EXISTS "PhotoCheckSchedule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "typeId" TEXT NOT NULL,
  "branchId" TEXT,
  "employeeId" TEXT,
  "role" TEXT,
  "daysOfWeekJson" TEXT NOT NULL DEFAULT '[]',
  "slotKey" TEXT NOT NULL,
  "slotLabelEn" TEXT NOT NULL,
  "slotLabelAr" TEXT NOT NULL,
  "startTime" TEXT NOT NULL DEFAULT '00:00',
  "dueTime" TEXT NOT NULL DEFAULT '23:59',
  "reminderMinutesBefore" INTEGER,
  "overdueReminderMinutes" INTEGER,
  "maxReminders" INTEGER NOT NULL DEFAULT 3,
  "reminderCooldownMinutes" INTEGER NOT NULL DEFAULT 180,
  "active" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PhotoCheckSchedule_typeId_active_idx" ON "PhotoCheckSchedule"("typeId", "active");
CREATE INDEX IF NOT EXISTS "PhotoCheckSchedule_branchId_active_idx" ON "PhotoCheckSchedule"("branchId", "active");

CREATE TABLE IF NOT EXISTS "PhotoCheckTask" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scheduleId" TEXT NOT NULL,
  "typeId" TEXT NOT NULL,
  "assigneeEmployeeId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "slotKey" TEXT NOT NULL,
  "windowStartAt" DATETIME NOT NULL,
  "dueAt" DATETIME NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "submissionId" TEXT,
  "reminderCount" INTEGER NOT NULL DEFAULT 0,
  "lastRemindedAt" DATETIME,
  "lastReminderKind" TEXT,
  "excusedReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PhotoCheckTask_scheduleId_assigneeEmployeeId_periodKey_key"
  ON "PhotoCheckTask"("scheduleId", "assigneeEmployeeId", "periodKey");
CREATE INDEX IF NOT EXISTS "PhotoCheckTask_assigneeEmployeeId_periodKey_idx" ON "PhotoCheckTask"("assigneeEmployeeId", "periodKey");
CREATE INDEX IF NOT EXISTS "PhotoCheckTask_status_dueAt_idx" ON "PhotoCheckTask"("status", "dueAt");
CREATE INDEX IF NOT EXISTS "PhotoCheckTask_typeId_status_idx" ON "PhotoCheckTask"("typeId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "PhotoCheckSubmission_taskId_key" ON "PhotoCheckSubmission"("taskId");
CREATE INDEX IF NOT EXISTS "PhotoCheckSubmission_typeId_status_idx" ON "PhotoCheckSubmission"("typeId", "status");

CREATE TABLE IF NOT EXISTS "QcFieldReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdById" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'medium',
  "comments" TEXT NOT NULL,
  "photosJson" TEXT NOT NULL DEFAULT '[]',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "QcFieldReport_createdAt_idx" ON "QcFieldReport"("createdAt");
CREATE INDEX IF NOT EXISTS "QcFieldReport_branchId_createdAt_idx" ON "QcFieldReport"("branchId", "createdAt");

-- Catalog titles. All inactive. Provisional items stay inactive until Owner confirms.
-- Default criteria are observable photo checks only. Handwritten numbers are notes, not pass/fail specs.
INSERT OR IGNORE INTO "PhotoCheckType"
("id","code","sortOrder","titleEn","titleAr","groupKey","active","provisional","requiresMeasurement","measurementUnit","handwrittenNote","criteriaJson")
VALUES
('pct-01','coffee_machine_calibration',1,'Coffee Machine Calibration','معايرة ماكينات القهوة','barista',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The machine is clearly visible","labelAr":"الماكينة ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"work_area_visible","labelEn":"The work area around the machine is visible","labelAr":"منطقة العمل حول الماكينة ظاهرة","weight":30}]'),
('pct-02','slush_machine_cleaning',2,'Slush Machine Cleaning','تنظيف ماكينة السلاش','barista',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The slush machine is clearly visible","labelAr":"ماكينة السلاش ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"surfaces_visible","labelEn":"Visible surfaces of the machine can be assessed","labelAr":"الأسطح الظاهرة للماكينة يمكن تقييمها","weight":30}]'),
('pct-03','floor_cleaning',3,'Floor Cleaning','نظافة الأرضيات','barista',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The floor area is clearly visible","labelAr":"الأرضية ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"area_coverage","labelEn":"A representative floor area is shown","labelAr":"تظهر مساحة أرضية ممثلة","weight":30}]'),
('pct-04','fruit_refrigerator_cleaning',4,'Fruit Refrigerator Cleaning','تنظيف ثلاجة الفواكه','barista',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The fruit refrigerator is clearly visible","labelAr":"ثلاجة الفواكه ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"interior_or_exterior_visible","labelEn":"Interior or exterior surfaces can be assessed","labelAr":"يمكن تقييم الأسطح الداخلية أو الخارجية","weight":30}]'),
('pct-05','refrigerator_temperature_check',5,'Refrigerator Temperature Check','فحص درجة حرارة الثلاجات','barista',0,0,1,'C',NULL,'[{"key":"subject_visible","labelEn":"The refrigerator or thermometer is clearly visible","labelAr":"الثلاجة أو مقياس الحرارة ظاهر بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"measurement_recorded","labelEn":"A measured temperature value was recorded","labelAr":"تم تسجيل قيمة درجة الحرارة","weight":30}]'),
('pct-06','branch_cleanliness_360',6,'360° Branch Cleanliness','النظافة العامة للفرع 360 درجة','barista',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"A branch interior area is clearly visible","labelAr":"منطقة داخل الفرع ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"area_coverage","labelEn":"The photo covers a representative public area","labelAr":"الصورة تغطي منطقة عامة ممثلة","weight":30}]'),
('pct-07','espresso_machine_cleaning',7,'Espresso Machine Cleaning','تنظيف ماكينة الإسبريسو','barista',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The espresso machine is clearly visible","labelAr":"ماكينة الإسبريسو ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"surfaces_visible","labelEn":"Visible machine surfaces can be assessed","labelAr":"يمكن تقييم أسطح الماكينة الظاهرة","weight":30}]'),
('pct-08','bar_surface_cleaning',8,'Bar Surface Cleaning','تنظيف سطح البار','barista',0,1,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The bar surface is clearly visible","labelAr":"سطح البار ظاهر بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"area_coverage","labelEn":"A representative bar surface is shown","labelAr":"يظهر سطح بار ممثل","weight":30}]'),
('pct-09','sink_cleanliness',9,'Sink Cleanliness','نظافة المغسلة','barista',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The sink is clearly visible","labelAr":"المغسلة ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"basin_visible","labelEn":"The basin and surrounding area can be assessed","labelAr":"يمكن تقييم الحوض والمنطقة المحيطة","weight":30}]'),
('pct-10','ventilation_extractor_cleaning',10,'Ventilation / Extractor Cleaning','تنظيف الشفاط','barista',0,1,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The extractor is clearly visible","labelAr":"الشفاط ظاهر بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"surfaces_visible","labelEn":"Visible extractor surfaces can be assessed","labelAr":"يمكن تقييم أسطح الشفاط الظاهرة","weight":30}]'),
('pct-11','shelves_cabinets_cleaning',11,'Shelves & Cabinets Cleaning','تنظيف الرفوف والخزائن','barista',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"Shelves or cabinets are clearly visible","labelAr":"الرفوف أو الخزائن ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"area_coverage","labelEn":"A representative storage area is shown","labelAr":"تظهر منطقة تخزين ممثلة","weight":30}]'),
('pct-12','table_cleaning',12,'Table Cleaning','تنظيف الطاولات','barista',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"Tables are clearly visible","labelAr":"الطاولات ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"area_coverage","labelEn":"A representative table surface is shown","labelAr":"يظهر سطح طاولة ممثل","weight":30}]'),
('pct-13','espresso_shot_weight',13,'Espresso Shot Weight','وزن شوت الإسبريسو','barista',0,0,1,'g','Owner-approved handwritten specification: yield 36 g. Working-manual 50 g is superseded.','[{"key":"subject_visible","labelEn":"The scale or shot is clearly visible","labelAr":"الميزان أو الشوت ظاهر بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"measurement_recorded","labelEn":"A measured weight value was recorded","labelAr":"تم تسجيل قيمة الوزن","weight":30}]'),
('pct-14','portafilter_coffee_dose',14,'Portafilter Coffee Dose','وزن القهوة في البورتافلتر','barista',0,0,1,'g','Owner-approved handwritten specification: dose 18 g. Working-manual 16 g is superseded.','[{"key":"subject_visible","labelEn":"The portafilter or scale is clearly visible","labelAr":"البورتافلتر أو الميزان ظاهر بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"measurement_recorded","labelEn":"A measured dose value was recorded","labelAr":"تم تسجيل قيمة الجرعة","weight":30}]'),
('pct-15','espresso_temperature',15,'Espresso Temperature','درجة حرارة الإسبريسو','barista',0,0,1,'C','Handwritten reference 92–94°C — not an approved DRINKAT specification.','[{"key":"subject_visible","labelEn":"The thermometer or cup is clearly visible","labelAr":"مقياس الحرارة أو الكوب ظاهر بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"measurement_recorded","labelEn":"A measured temperature value was recorded","labelAr":"تم تسجيل قيمة درجة الحرارة","weight":30}]'),
('pct-16','water_quality_tds',16,'Water Quality / TDS','فحص جودة المياه','barista',0,1,1,'ppm','Handwritten reference 75–150 ppm — not an approved DRINKAT specification.','[{"key":"subject_visible","labelEn":"The meter or water sample is clearly visible","labelAr":"الجهاز أو عينة الماء ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"measurement_recorded","labelEn":"A measured TDS value was recorded","labelAr":"تم تسجيل قيمة TDS","weight":30}]'),
('pct-18','fryer_cleanliness',18,'Fryer Cleanliness / Condition','نظافة وحالة القلاية','kitchen',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The fryer is clearly visible","labelAr":"القلاية ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"surfaces_visible","labelEn":"Visible fryer surfaces can be assessed","labelAr":"يمكن تقييم أسطح القلاية الظاهرة","weight":30}]'),
('pct-19','preparation_refrigerator',19,'Preparation Refrigerator','ثلاجة التحضير','kitchen',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The preparation refrigerator is clearly visible","labelAr":"ثلاجة التحضير ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"interior_or_exterior_visible","labelEn":"Interior or exterior surfaces can be assessed","labelAr":"يمكن تقييم الأسطح الداخلية أو الخارجية","weight":30}]'),
('pct-20','grill_cleanliness',20,'Grill Cleanliness / Condition','نظافة وحالة الشوايات','kitchen',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The grill is clearly visible","labelAr":"الشواية ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"surfaces_visible","labelEn":"Visible grill surfaces can be assessed","labelAr":"يمكن تقييم أسطح الشواية الظاهرة","weight":30}]'),
('pct-21','food_handover_area',21,'Food Handover Area Cleanliness','نظافة منطقة تسليم الطلبات','kitchen',0,1,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The handover area is clearly visible","labelAr":"منطقة التسليم ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"area_coverage","labelEn":"A representative handover area is shown","labelAr":"تظهر منطقة تسليم ممثلة","weight":30}]'),
('pct-22','trays_serving_equipment',22,'Trays / Serving Equipment Cleanliness','نظافة الصواني وأدوات التقديم','kitchen',0,1,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"Trays or serving equipment are clearly visible","labelAr":"الصواني أو أدوات التقديم ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"area_coverage","labelEn":"A representative set of equipment is shown","labelAr":"تظهر مجموعة ممثلة من الأدوات","weight":30}]');

-- Owner-requested kitchen station photo tasks (Arabic list 2026-11-22).
-- Additive catalog only. Does not touch Employee/User rows.
-- Does not turn photo-ops ON for anyone who is off (including part-time).
-- Hood reuses ventilation_extractor_cleaning (no duplicate type).

UPDATE "PhotoCheckType"
SET
  "titleEn" = 'Hood cleanliness',
  "titleAr" = 'نظافة الهود',
  "groupKey" = 'kitchen',
  "provisional" = 0,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'ventilation_extractor_cleaning';

INSERT OR IGNORE INTO "PhotoCheckType"
("id","code","sortOrder","titleEn","titleAr","groupKey","active","provisional","requiresMeasurement","measurementUnit","handwrittenNote","criteriaJson","minPhotos","maxPhotos")
VALUES
('pct-23','grill_temperature_check',23,'Grill temperature','قياس حرارة الجريل','kitchen',0,0,1,'C',NULL,'[{"key":"subject_visible","labelEn":"The grill or thermometer is clearly visible","labelAr":"الجريل أو مقياس الحرارة ظاهر بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"measurement_recorded","labelEn":"A measured temperature value was recorded","labelAr":"تم تسجيل قيمة درجة الحرارة","weight":30}]',1,3),
('pct-24','grill_surrounding_walls',24,'Walls around the grill','نظافة الجدران حول جريل','kitchen',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The walls around the grill are clearly visible","labelAr":"الجدران حول الجريل ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"area_coverage","labelEn":"A representative wall area around the grill is shown","labelAr":"تظهر منطقة جدار ممثلة حول الجريل","weight":30}]',1,3),
('pct-25','holding_cabinet_cleanliness',25,'Holding cabinet cleanliness','نظافة الحاضنة','kitchen',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The holding cabinet is clearly visible","labelAr":"الحاضنة ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"surfaces_visible","labelEn":"Visible cabinet surfaces can be assessed","labelAr":"يمكن تقييم أسطح الحاضنة الظاهرة","weight":30}]',1,3),
('pct-26','packaging_and_dates',26,'Packaging and dates','التغليف والتواريخ للمواد','kitchen',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"Packaged materials and date labels are clearly visible","labelAr":"المواد المغلفة وملصقات التواريخ ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"labels_visible","labelEn":"Date or packaging labels can be assessed","labelAr":"يمكن تقييم ملصقات التواريخ أو التغليف","weight":30}]',1,3),
('pct-27','storage_shelves',27,'Storage shelves','ارفف التخزين','kitchen',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The storage shelves are clearly visible","labelAr":"أرفف التخزين ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"area_coverage","labelEn":"A representative storage-shelf area is shown","labelAr":"تظهر منطقة أرفف تخزين ممثلة","weight":30}]',1,3),
('pct-28','station_mats_cleanliness',28,'Station mats cleanliness','نظافة البسطات','kitchen',0,0,0,NULL,NULL,'[{"key":"subject_visible","labelEn":"The station mats are clearly visible","labelAr":"البسطات ظاهرة بوضوح","weight":40},{"key":"image_usable","labelEn":"The photograph is sharp enough to assess","labelAr":"الصورة واضحة بما يكفي للتقييم","weight":30},{"key":"area_coverage","labelEn":"A representative station-mat area is shown","labelAr":"تظهر منطقة بسطات ممثلة","weight":30}]',1,3);

/**
 * Transcribed from Owner-provided DRINKAT.pdf (Complete Operations Manual, 13 pages).
 * Source file: docs/source/DRINKAT-operations-manual.pdf
 *
 * Owner (2026-10-12): approve all DRINKAT-MANUAL rows on top of existing SOPs.
 * Conflict rule: handwritten DRINKAT instructions override this working manual.
 * Espresso: handwritten 18 g dose / 36 g yield beats printed 16 g / 50 g.
 * Mango machine in this manual is the Slush Machine.
 */


export const DRINKAT_MANUAL_PREFIX = 'DRINKAT-MANUAL:';

export type DrinkatManualDoc = {
  key: string;
  locale: 'en' | 'ar';
  title: string;
  sourceRef: string;
  qcDomain: string;
  body: string;
};

export const HANDWRITTEN_ESPRESSO_SPEC = {
  doseG: 18,
  yieldG: 36,
  supersededManualDoseG: 16,
  supersededManualYieldG: 50,
} as const;

const BANNER_EN = [
  'STATUS: OWNER-APPROVED SOP (2026-10-12). Full working-manual text is kept.',
  'Source: DRINKAT Complete Operations Manual (Owner PDF). Cover also labels Morning Opening SOP Version 01.',
  'CONFLICT RULE: if this working manual contradicts handwritten DRINKAT instructions, use the handwritten instruction.',
  'Espresso (Owner-approved handwritten): dose 18 g / yield 36 g. Working-manual 16 g / 50 g is superseded and must not be used for calibration or scoring.',
  'Mango machine in this manual is the Slush Machine (Owner confirmed 2026-10-12). Catalog title: Slush Machine Cleaning.',
  'FDA Food Code 2026 is not Jordanian law. JFDA / Jordanian requirements are separate.',
].join('\n');

const BANNER_AR = [
  'الحالة: إجراء معتمد من المالك (2026-10-12). يُحتفظ بنص دليل العمل كاملاً.',
  'المصدر: دليل تشغيل DRINKAT الكامل (ملف المالك). غلاف التجهيز الصباحي: Morning Opening SOP Version 01.',
  'قاعدة التعارض: إذا تعارض دليل العمل مع التعليمات المكتوبة بخط اليد، تُعتمد التعليمات المكتوبة بخط اليد.',
  'الإسبريسو (خط اليد المعتمد): الجرعة 18 g والاستخلاص 36 g. دليل العمل 16 g / 50 g منسوخ ولا يُستخدم للمعايرة أو التقييم.',
  'ماكينة المانجو في هذا الدليل هي ماكينة السلاش (تأكيد المالك 2026-10-12).',
  'كود الغذاء 2026 ليس قانوناً أردنياً تلقائياً. متطلبات المؤسسة العامة للغذاء والدواء منفصلة.',
].join('\n');

function ref(key: string): string {
  return `${DRINKAT_MANUAL_PREFIX}${key}`;
}

export const DRINKAT_OPS_MANUAL_DOCS: DrinkatManualDoc[] = [
  {
    key: 'morning-opening-barista',
    locale: 'en',
    title: 'DRINKAT morning opening — barista',
    sourceRef: ref('morning-opening-barista'),
    qcDomain: 'opening_checklist',
    body: `${BANNER_EN}

## Cover
DRINKAT Morning Opening SOP. Stations: DR Drinkat Barista, TK Talabat, CR Careem, ES Eshayy, KT Kitchen.

## 01 Barista — morning shift
Before taking the first order, confirm the coffee station is fully ready.

1. Order devices (Talabat / Careem / Eshayy): charging, power, connection, ready to receive orders.
2. POS / System: confirm it is running and the user is signed in.
3. Menu: confirm available items are enabled on Talabat / Careem / Eshayy.
4. Coffee machine: complete coffee calibration before the shift starts and confirm the machine is ready.
5. Coffee calibration: Owner-approved handwritten standard — dose 18 g, yield 36 g. Working-manual original (superseded): dose 16 g, yield 50 g.
6. Barista station: cleanliness, arrangement, and basic supplies ready.
7. Final check: confirm no shortage or fault before taking orders.

Footer on the page (printed, superseded): DOSE 16 g · YIELD 50 g. Approved footer: DOSE 18 g · YIELD 36 g · STATUS READY.
Sign-off fields: employee name, date, shift-open time, signature.

Photo-catalog mapping (not enabled by this ingest): coffee_machine_calibration, espresso_machine_cleaning, portafilter_coffee_dose, espresso_shot_weight.`,
  },
  {
    key: 'morning-opening-barista',
    locale: 'ar',
    title: 'تجهيز الدوام الصباحي — الباريستا',
    sourceRef: ref('morning-opening-barista'),
    qcDomain: 'opening_checklist',
    body: `${BANNER_AR}

## الغلاف
إجراءات تجهيز وفتح الدوام الصباحي. المحطات: DR باريستا، TK طلبات، CR كريم، ES أشيائي، KT المطبخ.

## 01 شفت الباريستا الصباحي
قبل استقبال أول طلب — تأكد أن محطة القهوة جاهزة بالكامل.

1. أجهزة الطلبات (طلبات / كريم / أشيائي): الشحن، التشغيل، الاتصال، وجاهزية استقبال الطلبات.
2. النظام / POS: التأكد من تشغيل النظام وتسجيل الدخول.
3. المنيو: التأكد من تفعيل الأصناف المتاحة على طلبات / كريم / أشيائي.
4. ماكينة القهوة: عمل coffee calibration قبل بدأ الدوام والتأكيد من جاهزية الماكينة.
5. معايرة القهوة: المعيار المعتمد بخط اليد الجرعة 18 g والاستخلاص 36 g. أصل دليل العمل (منسوخ): 16 g / 50 g.
6. محطة الباريستا: نظافة، ترتيب، وتجهيز جميع المستلزمات الأساسية.
7. فحص نهائي: التأكد من عدم وجود أي نقص أو عطل قبل بدء استقبال الطلبات.

تذييل الصفحة المطبوع (منسوخ): DOSE 16 g · YIELD 50 g. المعتمد: DOSE 18 g · YIELD 36 g · STATUS READY.
حقول التوقيع: اسم الموظف، التاريخ، وقت فتح الشفت، التوقيع.`,
  },
  {
    key: 'morning-opening-kitchen',
    locale: 'en',
    title: 'DRINKAT morning opening — kitchen',
    sourceRef: ref('morning-opening-kitchen'),
    qcDomain: 'food_safety',
    body: `${BANNER_EN}

## 02 Kitchen — morning shift
Safe, organized start before taking orders.

1. Start the Grill. Confirm it is ready and reaches operating temperature 180–200.
2. Start the Fryer. Confirm it is ready. Operating range on the page: 160–180 (follow posted operating instructions).
3. Gas jets: confirm jets and connections are sound; no smell or suspected leak.
4. Water: confirm water is available and running normally.
5. Receiving invoice: match delivered items to the receiving invoice.
6. Meat weight: confirm weight and quality against the required specification.
7. Kitchen station: cleanliness, arrangement, and basic supplies.
8. Final check: confirm the kitchen is ready before taking orders.

## Safety first
If there is a gas smell, leak, electrical fault, or any abnormal condition: do not continue operating, and notify the direct supervisor immediately.

Photo-catalog mapping (not enabled by this ingest): grill_cleanliness, fryer_cleanliness.`,
  },
  {
    key: 'morning-opening-kitchen',
    locale: 'ar',
    title: 'تجهيز الدوام الصباحي — المطبخ',
    sourceRef: ref('morning-opening-kitchen'),
    qcDomain: 'food_safety',
    body: `${BANNER_AR}

## 02 شفت المطبخ الصباحي
تشغيل آمن ومنظم قبل بدء استقبال الطلبات.

1. تشغيل الـ Grill والتأكد من جاهزيته وبلوغه درجة التشغيل المطلوبة من 180–200.
2. تشغيل الـ Fryer والتأكد من جاهزيته للاستخدام حسب تعليمات التشغيل 160–180.
3. فحصجرات الغاز: التأكد من سلامة الجرات والتوصيلات وعدم وجود رائحة أو اشتباه بتسريب.
4. فحص المياه: التأكد من توفر المياه وتشغيلها بشكل طبيعي.
5. فاتورة استلام البضاعة: مطابقة الأصناف والكميات المستلمة مع فاتورة الاستلام.
6. وزن اللحمة: التأكد من وزن اللحمة ومطابقتها للكمية المسجلة / المطلوبة.
7. محطة المطبخ: نظافة وترتيب وتجهيز المستلزمات الأساسية.
8. فحص نهائي: تأكيد جاهزية المطبخ قبل بدء استقبال الطلبات.

## السلامة أولاً
عند وجود رائحة غاز، تسريب، عطل كهربائي أو أي حالة غير طبيعية: لا يتم الاستمرار بالتشغيل، ويتم إبلاغ المسؤول المباشر فوراً.`,
  },
  {
    key: 'order-platforms',
    locale: 'en',
    title: 'DRINKAT order platforms check',
    sourceRef: ref('order-platforms'),
    qcDomain: 'opening_checklist',
    body: `${BANNER_EN}

## 03 Order platforms check
Complete at the start of every morning shift. Device ON · Charged · Connected · Menu Active.

Talabat (TK), Careem (CR), Eshayy (ES): Ready / OK / Online / Active.
Final ready check: systems, devices, and menus ready before taking orders.

DRINKAT | MORNING OPENING SOP | VERSION 01`,
  },
  {
    key: 'order-platforms',
    locale: 'ar',
    title: 'فحص منصات الطلبات',
    sourceRef: ref('order-platforms'),
    qcDomain: 'opening_checklist',
    body: `${BANNER_AR}

## 03 فحص منصات الطلبات
يُنجز في بداية كل شفت صباحي. الجهاز · مشحون · متصل · المنيو مفعّل.

طلبات (TK)، كريم (CR)، أشيائي (ES): Ready / OK / Online / Active.
الفحص النهائي: الأنظمة والأجهزة والمنيو جاهزة قبل استقبال الطلبات.

DRINKAT | MORNING OPENING SOP | VERSION 01`,
  },
  {
    key: 'qc-barista',
    locale: 'en',
    title: 'DRINKAT quality control — barista',
    sourceRef: ref('qc-barista'),
    qcDomain: 'cleaning',
    body: `${BANNER_EN}

## Quality Control — Barista
Short operating guide: quality, cleanliness, refill, prep, handover for barista and kitchen shifts.
Department: Barista & Kitchen. Document: Quality Control. Status: Editable / Working Document.

How to read: each item is marked by shift or required timing. Checkbox is for daily follow-up.

1. Bar cleanliness. Morning and evening. AM / PM
2. Mango machine cleanliness (Owner: this is the Slush Machine). Morning. Clean on Saturday, Tuesday, and Thursday according to the schedule.
3. Cup-holder refill. Morning and evening. AM / PM
4. Cup-holder (cups) cleanliness. Morning, Sunday and Wednesday.
5. Syrup refill in the morning, plus stand cleaning in the evening. AM / PM
6. Wipe all syrup bottles + purees. Morning and evening. AM / PM
7. Bar leather / bar surface cleanliness. Morning and evening. AM / PM
8. Blender cleanliness. Evening, inside and outside. PM
9. Cabinets cleanliness. Inside and outside, morning and evening. AM / PM
10. Ice maker cleanliness. Inside and outside, evening. PM
11. Sink (sink) cleanliness, and confirm nothing is left inside the sink. AM / PM
12. Barista fridge cleanliness. Inside and outside, morning and evening, with a check of goods inside the fridge and drawer cleanliness, including strawberry, banana, kiwi, and a check of orange-spanish and pomegranate shafts, morning and evening. AM / PM
13. Goods date: confirm the date is present on the goods. AM / PM
14. Coffee machine cleanliness. Morning and evening. AM / PM
15. Coffee grinder cleanliness. Inside and outside, morning and evening. AM / PM
16. Straw refill. Morning and evening. AM / PM
17. Device cleanliness: system, Careem, Talabat, Eshayy. Morning and evening. AM / PM
18. Cashier cleanliness. Inside and outside, morning and evening. AM / PM
19. Cleanliness and arrangement of cabinets under the sink. Daily, morning and evening. AM / PM
20. Cup + lid refill: when the evening shift receives from the morning shift. Handover
21. Floor cleanliness for both morning and evening shifts. AM / PM
22. Trash-bin / container cleanliness. Morning and evening. AM / PM
23. Matrix fridge refill. Morning and evening, for kitchen and barista. AM / PM
24. Window + handover-area cleanliness. Morning and evening. AM / PM
25. Coffee trash bin cleanliness and wipe. Inside and outside, morning and evening. AM / PM
26. Bar cloths cleanliness and washing. Morning and evening. AM / PM

Photo-catalog mapping (not enabled by this ingest): slush_machine_cleaning←item 2 mango machine; espresso_machine_cleaning←14; bar_surface_cleaning←7; sink_cleanliness←11; fruit_refrigerator_cleaning←12; floor_cleaning←21; shelves_cabinets_cleaning←9/19; food_handover_area←24; table_cleaning is under store/exterior not this list.`,
  },
  {
    key: 'qc-barista',
    locale: 'ar',
    title: 'مراقبة الجودة — الباريستا',
    sourceRef: ref('qc-barista'),
    qcDomain: 'cleaning',
    body: `${BANNER_AR}

## مراقبة الجودة — الباريستا
دليل تشغيلي مختصر: بنود مراقبة الجودة، النظافة، الترفيل، التجهيز، والاستلام والتسليم للشفتات — الباريستا والكتشن.
القسم: Barista & Kitchen. المستند: Quality Control. الحالة: Editable / Working Document.

طريقة القراءة: كل بند موضح حسب الشفت أو التوقيت المطلوب. علامة ☐ للمتابعة اليومية والتأشير عند الإنجاز.

1. نظافة البارات: صباحي ومسائي. AM / PM
2. نظافة ماكينة المانجو (المالك: هي ماكينة السلاش): صباحي، وتكون نظافتها أيام السبت والثلاثاء والخميس حسب الجدول.
3. ترفيل كوب هولدر: صباحي ومسائي. AM / PM
4. نظافة كوب هولدر الكاسات: صباحي، يوم الأحد والأربعاء.
5. ترفيل السيرابات: صباحي، بالإضافة إلى تنظيف الستاندات مسائي. AM / PM
6. مسح جميع علب السيرابات + البيوريهات: صباحي ومسائي. AM / PM
7. نظافة جلد البار: صباحي ومسائي. AM / PM
8. نظافة الخلاط: مسائي، داخلي وخارجي. PM
9. نظافة الخزائن: داخلي وخارجي، صباحي ومسائي. AM / PM
10. نظافة الـ Ice maker: داخلي وخارجي، مسائي. PM
11. نظافة المجلى (السنك)، والتأكد من عدم وجود أي شيء داخل السنك. AM / PM
12. نظافة ثلاجة البريستا: داخلي وخارجي، صباحي ومسائي، مع التشييك على البضاعة داخل الثلاجة ونظافة الدرويرات ويشمل ذلك الفراولة والموز والكيوي، والتشييك على شافت البرتقال سبانش والرمان، صباحي ومسائي. AM / PM
13. تاريخ البضاعة: التأكد من وجود التاريخ على البضاعة. AM / PM
14. نظافة ماكينة القهوة: صباحي ومسائي. AM / PM
15. نظافة مطحنة القهوة: داخلي وخارجي، صباحي ومسائي. AM / PM
16. ترفيل السترو: صباحي ومسائي. AM / PM
17. نظافة الأجهزة: السيستم، كريم، طلبات، أشيائي، صباحي ومسائي. AM / PM
18. نظافة الكاش: داخلي وخارجي، صباحي ومسائي. AM / PM
19. نظافة وترتيب الخزائن تحت المجلى: يومياً، صباحي ومسائي. AM / PM
20. ترفيل الكاسات + الأغطية: عند استلام الشفت المسائي من الشفت الصباحي. تسليم
21. نظافة الأرضية: للشفتين الصباحي والمسائي. AM / PM
22. نظافة الترَشات سلات الحاوية: صباحي ومسائي. AM / PM
23. ترفيل ثلاجة الماتركس: صباحي ومسائي، للكتشن والبريستا. AM / PM
24. نظافة الشبابيك + مناطق التسليم: صباحي ومسائي. AM / PM
25. نظافة ترش القهوة ومسحها: داخلي وخارجي، صباحي ومسائي. AM / PM
26. نظافة مماسح البار وغسلها: صباحي ومسائي. AM / PM`,
  },
  {
    key: 'store-exterior',
    locale: 'en',
    title: 'DRINKAT store and exterior control',
    sourceRef: ref('store-exterior'),
    qcDomain: 'cleaning',
    body: `${BANNER_EN}

## 02 Store & exterior control
Outside / shop cleanliness. Done daily morning and evening. Includes:

1. Stairs cleanliness
2. Plant-pot cleanliness
3. Tables and chairs cleanliness
4. Floor cleanliness
5. Trash-bin cleanliness and bag change
6. Napkin holders and hygiene-box cleanliness
7. Check exterior lighting
8. Check menu cleanliness
9. Cleanliness behind the shop

28. Warehouse cleanliness: Monday and Wednesday, evening.
29. Check water and gas. Morning and evening. AM / PM
30. Check fridge and warehouse cleanliness. AM / PM

Photo-catalog mapping (not enabled by this ingest): table_cleaning←3; floor_cleaning←4; branch_cleanliness_360 covers representative public area, not this full exterior list.`,
  },
  {
    key: 'store-exterior',
    locale: 'ar',
    title: 'نظافة المحل والمناطق الخارجية',
    sourceRef: ref('store-exterior'),
    qcDomain: 'cleaning',
    body: `${BANNER_AR}

## 02 نظافة المحل والمناطق الخارجية
نظافة المحل من الخارج. تنفَّذ يومياً صباحي ومسائي، وتشمل جميع النقاط التالية:

1. نظافة الدرج
2. نظافة قوارير الزريعة
3. نظافة الطاولات والكراسي
4. نظافة الأرضية
5. نظافة الترَشات وتغيير الأكياس
6. نظافة المكتات وعلب الهايجين
7. التشييك على الإنارة الخارجية
8. التشييك على نظافة المنيو
9. نظافة خلف المحل

28. نظافة المستودعات: يومي الاثنين والأربعاء، مسائي.
29. التشييك على المياه والغاز: صباحي ومسائي. AM / PM
30. التشييك على نظافة الثلاجات والمستودع. AM / PM`,
  },
  {
    key: 'kitchen-handover',
    locale: 'en',
    title: 'DRINKAT kitchen — morning handover',
    sourceRef: ref('kitchen-handover'),
    qcDomain: 'cleaning',
    body: `${BANNER_EN}

## 03 Kitchen — morning handover
Shift handover standard: morning hands to evening, evening hands to morning, confirming work-area readiness and cleanliness at every handover.

1. Clean hood inside and outside. HANDOVER
2. Clean walls under the hood + shelves. HANDOVER
3. Clean grill from the sides, above, and below. HANDOVER
4. Clean fryer inside, from the sides and below. HANDOVER
5. Clean the holding unit completely (potato holding unit). HANDOVER
6. Clean freezer every other day. HANDOVER
7. Clean sink inside and outside. HANDOVER
8. Clean matrix fridge inside and outside, including removing and cleaning shelves. HANDOVER
9. Meat-fridge cleanliness inside, outside, and under the fridge. HANDOVER
10. Check meat-fridge temperature from 0 to 5. CHECK
11. Clean salad fridge inside and outside, including doors, shelves, and under the fridge. HANDOVER
12. Clean the goods shelf above the fridge. HANDOVER
13. Clean toaster inside and outside + check the toaster butter paper. HANDOVER
14. Trash-bin cleanliness inside and outside; wash inside and outside. HANDOVER
15. Clean bar cloths daily, and every 10 minutes. HANDOVER
16. Serving-box cleanliness on the handover area. HANDOVER
17. Window and tracks cleanliness inside and outside, daily. HANDOVER
18. Floor cleanliness. HANDOVER
19. Rotate goods (FIFO). HANDOVER
20. Clean counters. HANDOVER
21. Bread refill. HANDOVER
22. Receive meat carefully; meat weight must not be less than 70 grams. CHECK
23. Refill pickle + lettuce + cheddar + parmesan. HANDOVER
24. Refill barbecue + sriracha. HANDOVER
25. Refill pepper + bacon. HANDOVER
26. Refill sauces. HANDOVER
27. Refill trash bags / bins. HANDOVER
28. Full package refill. HANDOVER
29. Butter refill. HANDOVER
30. Matrix fridge refill. HANDOVER

Photo-catalog mapping (not enabled by this ingest): ventilation_extractor_cleaning←1 hood; grill_cleanliness←3; fryer_cleanliness←4; sink_cleanliness←7; preparation_refrigerator←8/11; refrigerator_temperature_check←10 meat fridge 0–5 (not auto-applied); food_handover_area←16; trays_serving_equipment←16 serving boxes.`,
  },
  {
    key: 'kitchen-handover',
    locale: 'ar',
    title: 'الكتشن — الاستلام الصباحي',
    sourceRef: ref('kitchen-handover'),
    qcDomain: 'cleaning',
    body: `${BANNER_AR}

## 03 الكتشن — الاستلام الصباحي
معيار تسليم الشفت: الصباحي لازم يسلّم المسائي، والمسائي لازم يسلّم الصباحي، مع التأكد من جاهزية ونظافة منطقة العمل عند كل عملية تسليم واستلام.

1. تنظيف الهود داخلياً وخارجياً. HANDOVER
2. تنظيف الحيطان تحت الهود + الرفوف. HANDOVER
3. تنظيف القريل من الجوانب وفوق وتحت. HANDOVER
4. تنظيف الفراير داخلياً، من الجوانب وتحت. HANDOVER
5. تنظيف الحافظة كاملة (حافظة البطاطا). HANDOVER
6. تنظيف الفريزر يوم بعد يوم. HANDOVER
7. تنظيف السنك داخلياً وخارجياً. HANDOVER
8. تنظيف ثلاجة الماتركس داخلياً وخارجياً، مع إزالة الرفوف وتنظيفها. HANDOVER
9. نظافة ثلاجة اللحمة داخلياً وخارجياً وتحت الثلاجة. HANDOVER
10. التشييك على درجة حرارة ثلاجة اللحمة من 0 إلى 5. CHECK
11. تنظيف ثلاجة السلطات داخلياً وخارجياً، بما يشمل الأبواب والرفوف وتحت الثلاجة. HANDOVER
12. تنظيف رف البضاعة الموجود فوق الثلاجة. HANDOVER
13. تنظيف التوستر داخلياً وخارجياً + التشييك على ورقة الزبدة الخاصة بالتوستر. HANDOVER
14. نظافة الترَشات داخلياً وخارجياً، ويتم غسلها من الداخل والخارج. HANDOVER
15. تنظيف مماسح البار بشكل يومي، وكل 10 دقائق. HANDOVER
16. نظافة علب السيرفس على منطقة التسليم. HANDOVER
17. نظافة الشباك والسكك داخلياً وخارجياً بشكل يومي. HANDOVER
18. نظافة الأرضية. HANDOVER
19. ترويخة البضاعة. HANDOVER
20. تنظيف الكونترات. HANDOVER
21. ترفيل الخبز. HANDOVER
22. استلام اللحمة بشكل دقيق، على ألا يقل وزن اللحمة عن 70 غراماً. CHECK
23. ترفيل المخلل + ترفيل الخس + جبنة الشيدر + جبنة البارميزان. HANDOVER
24. ترفيل الباربكيو + السراتشا. HANDOVER
25. ترفيل الفلفل + البيكن. HANDOVER
26. ترفيل الصوصات. HANDOVER
27. ترفيل الترَشات. HANDOVER
28. ترفيل البكج بشكل كامل. HANDOVER
29. ترفيل الزبدة. HANDOVER
30. ترفيل ثلاجة الماتركس. HANDOVER`,
  },
  {
    key: 'operational-note',
    locale: 'en',
    title: 'DRINKAT operational note — clean check refill handover ready',
    sourceRef: ref('operational-note'),
    qcDomain: 'cleaning',
    body: `${BANNER_EN}

## 04 Operational note
Basic rule: every cleaning, arranging, refill, inspection, and prep item in this section is part of shift responsibilities and must be finished before handover to the next shift.

- Work area is handed over and received clean, arranged, and ready to operate.
- The receiving shift confirms the area condition at handover.
- Any shortage or note about cleanliness or readiness is handled inside the handover.

CLEAN · CHECK · REFILL · HANDOVER · READY`,
  },
  {
    key: 'operational-note',
    locale: 'ar',
    title: 'ملاحظة تشغيلية — نظافة فحص ترفيل تسليم جاهز',
    sourceRef: ref('operational-note'),
    qcDomain: 'cleaning',
    body: `${BANNER_AR}

## 04 ملاحظة تشغيلية
قاعدة أساسية: جميع بنود التنظيف، الترتيب، الترفيل، الفحص، والتجهيز الواردة في هذا القسم تعتبر جزءاً من مسؤوليات الشفت، ويجب إتمامها قبل التسليم للشفت التالي.

- يتم تسليم واستلام منطقة العمل بحالة نظيفة ومرتبة وجاهزة للتشغيل.
- الشفت المستلم يتأكد من حالة المنطقة عند الاستلام.
- أي نقص أو ملاحظة مرتبطة بالنظافة أو الجاهزية يتم التعامل معها ضمن عملية التسليم والاستلام.

CLEAN · CHECK · REFILL · HANDOVER · READY`,
  },
];

/** Suggested photo-type mapping. Not a schedule and not a scoring change. */
export const DRINKAT_MANUAL_PHOTO_MAP: {
  photoCode: string;
  manualKey: string;
  sopItem: string;
  note: string;
}[] = [
  { photoCode: 'coffee_machine_calibration', manualKey: 'morning-opening-barista', sopItem: 'morning 4–5', note: 'Owner-approved handwritten dose 18 g / yield 36 g. Working-manual 16 g / 50 g is superseded.' },
  { photoCode: 'slush_machine_cleaning', manualKey: 'qc-barista', sopItem: 'barista QC 2', note: 'Owner confirmed the manual mango machine is the Slush Machine. Catalog title: Slush Machine Cleaning. Saturday/Tuesday/Thursday morning in the manual.' },
  { photoCode: 'espresso_machine_cleaning', manualKey: 'qc-barista', sopItem: 'barista QC 14', note: 'Coffee machine cleanliness AM/PM.' },
  { photoCode: 'bar_surface_cleaning', manualKey: 'qc-barista', sopItem: 'barista QC 7', note: 'Bar leather / bar surface. Catalog title 8 is still provisional.' },
  { photoCode: 'sink_cleanliness', manualKey: 'qc-barista', sopItem: 'barista QC 11', note: 'Sink empty and clean AM/PM.' },
  { photoCode: 'fruit_refrigerator_cleaning', manualKey: 'qc-barista', sopItem: 'barista QC 12', note: 'Barista fridge + fruit drawers.' },
  { photoCode: 'floor_cleaning', manualKey: 'qc-barista', sopItem: 'barista QC 21', note: 'Floor both shifts.' },
  { photoCode: 'shelves_cabinets_cleaning', manualKey: 'qc-barista', sopItem: 'barista QC 9/19', note: 'Cabinets and under-sink cabinets.' },
  { photoCode: 'table_cleaning', manualKey: 'store-exterior', sopItem: 'exterior 3', note: 'Tables and chairs, exterior list.' },
  { photoCode: 'food_handover_area', manualKey: 'qc-barista', sopItem: 'barista QC 24 / kitchen 16', note: 'Windows + handover area. Catalog title 21 is still provisional.' },
  { photoCode: 'trays_serving_equipment', manualKey: 'kitchen-handover', sopItem: 'kitchen 16', note: 'Serving boxes on handover area. Catalog title 22 is still provisional.' },
  { photoCode: 'grill_cleanliness', manualKey: 'kitchen-handover', sopItem: 'kitchen 3 / opening grill 180–200', note: 'Photo is cleanliness. Opening temperatures are not inferred from a photo.' },
  { photoCode: 'fryer_cleanliness', manualKey: 'kitchen-handover', sopItem: 'kitchen 4 / opening fryer 160–180', note: 'Photo is cleanliness. Oil temperature is not inferred from a photo.' },
  { photoCode: 'ventilation_extractor_cleaning', manualKey: 'kitchen-handover', sopItem: 'kitchen 1 hood', note: 'Hood inside and outside. Catalog title 10 is still provisional.' },
  { photoCode: 'preparation_refrigerator', manualKey: 'kitchen-handover', sopItem: 'kitchen 8/11', note: 'Matrix and salad fridges.' },
  { photoCode: 'refrigerator_temperature_check', manualKey: 'kitchen-handover', sopItem: 'kitchen 10', note: 'Meat fridge 0 to 5. Requires a recorded measurement. Not auto-applied.' },
  { photoCode: 'portafilter_coffee_dose', manualKey: 'morning-opening-barista', sopItem: 'dose 18 g', note: 'Owner-approved handwritten 18 g. Working-manual 16 g is superseded. Measurement check.' },
  { photoCode: 'espresso_shot_weight', manualKey: 'morning-opening-barista', sopItem: 'yield 36 g', note: 'Owner-approved handwritten 36 g. Working-manual 50 g is superseded. Measurement check.' },
];

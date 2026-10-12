import {
  citationsForDomain,
  expandSopSearchQuery,
  FDA_FOOD_CODE_2026,
  type FdaCitation,
} from '@/lib/fda-food-code-2026';
import type { QcInspectionDomain } from '@/lib/qc-domains';

export const SOP_DRAFT_PREFIX = 'DRAFT:FDA-FC-2026:';

export type SopDraftDomain = QcInspectionDomain | 'opening_checklist';

export type DrinkatSopDraft = {
  key: string;
  domain: SopDraftDomain;
  locale: 'en' | 'ar';
  title: string;
  sourceRef: string;
  fdaSections: string[];
  missingDrinkatInfo: string[];
  body: string;
};

function sourceRef(domain: SopDraftDomain, key: string): string {
  return `${SOP_DRAFT_PREFIX}${domain}:${key}`;
}

function formatCitations(cites: FdaCitation[]): string {
  return cites
    .map((c) => `- FDA Food Code 2026 § ${c.section} (${c.title}): ${c.summary}`)
    .join('\n');
}

function wrapEn(opts: {
  title: string;
  domain: SopDraftDomain;
  cites: FdaCitation[];
  proposed: string;
  missing: string[];
  evidence: string[];
  corrective: string;
  keywords: string;
}): string {
  return [
    'STATUS: DRAFT — NOT APPROVED.',
    'This text is a QC review draft. It is not DRINKAT policy and must not be used as an approved SOP answer.',
    `SOURCE: ${FDA_FOOD_CODE_2026.title}. ${FDA_FOOD_CODE_2026.url}`,
    `LEGAL: ${FDA_FOOD_CODE_2026.legalNote}`,
    `QC DOMAIN: ${opts.domain}`,
    'DOCUMENT CLASS: approval-ready draft for QC review. Effective date, owner, and withdrawal are unset until a genuine DRINKAT SOP is signed.',
    '',
    '## FDA requirements (reference only)',
    formatCitations(opts.cites),
    '',
    '## Proposed DRINKAT operating procedure (DRAFT — not approved)',
    opts.proposed,
    '',
    '## Missing DRINKAT-specific operating information',
    ...opts.missing.map((m) => `- ${m}`),
    '',
    '## Required operational evidence (QC must name house method)',
    ...opts.evidence.map((m) => `- ${m}`),
    '',
    '## Corrective-action guidance (FDA-supported only — not DRINKAT policy)',
    opts.corrective,
    '',
    '## QC review checklist',
    '- [ ] FDA section numbers verified against Food Code 2026 PDF.',
    '- [ ] Local authority applicability confirmed or marked unknown (FDA is not automatic local law).',
    '- [ ] Every missing DRINKAT operating fact is filled by an authorized person — nothing invented here.',
    '- [ ] English and Arabic instructions match.',
    '- [ ] No drink recipes, equipment set-points, sanitizer ppm, or house thresholds were added.',
    '- [ ] Required evidence types are listed; house photo/log standards still missing where noted.',
    '- [ ] A new sourceRef (not DRAFT:, FDA:, or SYNTHETIC:) is prepared for the signed document.',
    '- [ ] QC reviewer + owner two-person sign-off is recorded on that new document.',
    '- [ ] This DRAFT row stays approved=0. The SOP assistant stays blocked until the signed document is ingested.',
    '',
    `## Retrieval keywords`,
    opts.keywords,
  ].join('\n');
}

function wrapAr(opts: {
  title: string;
  domain: SopDraftDomain;
  cites: FdaCitation[];
  proposed: string;
  missing: string[];
  evidence: string[];
  corrective: string;
  keywords: string;
}): string {
  return [
    'الحالة: مسودة — غير معتمدة.',
    'هذا النص للمراجعة فقط. ليس سياسة DRINKAT ولا يجوز تقديمه كإجابة إجراءات معتمدة.',
    `المصدر: ${FDA_FOOD_CODE_2026.title}. ${FDA_FOOD_CODE_2026.url}`,
    `تنبيه قانوني: ${FDA_FOOD_CODE_2026.legalNote}`,
    `مجال الجودة: ${opts.domain}`,
    'تصنيف المستند: مسودة جاهزة لمراجعة الجودة. تاريخ السريان والمالك والسحب غير محددة حتى توقيع إجراء DRINKAT حقيقي.',
    '',
    '## متطلبات إدارة الغذاء والدواء (مرجع فقط)',
    formatCitations(opts.cites),
    '',
    '## إجراء DRINKAT المقترح (مسودة — غير معتمد)',
    opts.proposed,
    '',
    '## معلومات تشغيل خاصة بـ DRINKAT ما زالت ناقصة',
    ...opts.missing.map((m) => `- ${m}`),
    '',
    '## أدلة تشغيل مطلوبة (على الجودة تسمية الطريقة الداخلية)',
    ...opts.evidence.map((m) => `- ${m}`),
    '',
    '## توجيه الإجراء التصحيحي (مدعوم بـ FDA فقط — ليس سياسة DRINKAT)',
    opts.corrective,
    '',
    '## قائمة مراجعة مدير الجودة',
    '- [ ] أرقام أقسام FDA مطابقة لملف كود الغذاء 2026.',
    '- [ ] انطباق الجهة المحلية مؤكد أو معلَّم مجهولاً (FDA ليست قانوناً محلياً تلقائياً).',
    '- [ ] كل معلومة تشغيل ناقصة تملأها جهة مخوّلة — لا اختراع هنا.',
    '- [ ] النص العربي والإنجليزي متطابقان.',
    '- [ ] لم تُضف وصفات أو ضبط معدات أو تراكيز مطهّر أو عتبات بيت.',
    '- [ ] أنواع الأدلة مذكورة؛ معيار الصورة/السجل الداخلي ما زال ناقصاً حيث وُصف.',
    '- [ ] يُحضَّر sourceRef جديد (ليس DRAFT: أو FDA: أو SYNTHETIC:) للمستند الموقع.',
    '- [ ] توقيع مزدوج: مراجع جودة + مالك على المستند الجديد.',
    '- [ ] تبقى هذه المسودة approved=0. يبقى مساعد الإجراءات محظوراً حتى إدخال المستند الموقع.',
    '',
    '## كلمات الاسترجاع',
    opts.keywords,
  ].join('\n');
}

function pair(opts: {
  key: string;
  domain: SopDraftDomain;
  titleEn: string;
  titleAr: string;
  proposedEn: string;
  proposedAr: string;
  missingEn: string[];
  missingAr: string[];
  evidenceEn: string[];
  evidenceAr: string[];
  correctiveEn: string;
  correctiveAr: string;
  keywords: string;
}): DrinkatSopDraft[] {
  const cites = citationsForDomain(opts.domain);
  const sections = cites.map((c) => c.section);
  return [
    {
      key: opts.key,
      domain: opts.domain,
      locale: 'en',
      title: `DRAFT — ${opts.titleEn}`,
      sourceRef: sourceRef(opts.domain, opts.key),
      fdaSections: sections,
      missingDrinkatInfo: opts.missingEn,
      body: wrapEn({
        title: opts.titleEn,
        domain: opts.domain,
        cites,
        proposed: opts.proposedEn,
        missing: opts.missingEn,
        evidence: opts.evidenceEn,
        corrective: opts.correctiveEn,
        keywords: opts.keywords,
      }),
    },
    {
      key: opts.key,
      domain: opts.domain,
      locale: 'ar',
      title: `مسودة — ${opts.titleAr}`,
      sourceRef: sourceRef(opts.domain, `${opts.key}:ar`),
      fdaSections: sections,
      missingDrinkatInfo: opts.missingAr,
      body: wrapAr({
        title: opts.titleAr,
        domain: opts.domain,
        cites,
        proposed: opts.proposedAr,
        missing: opts.missingAr,
        evidence: opts.evidenceAr,
        corrective: opts.correctiveAr,
        keywords: opts.keywords,
      }),
    },
  ];
}

export const DRINKAT_SOP_DRAFTS: DrinkatSopDraft[] = [
  ...pair({
    key: 'handwashing-health',
    domain: 'food_safety',
    titleEn: 'Handwashing, sinks, and employee health reporting',
    titleAr: 'غسل اليدين والمغاسل والإبلاغ عن مرض الموظف',
    keywords: 'handwash hands soap sick illness vomit diarrhea 20 seconds toilet gloves',
    proposedEn:
      'QC managers should confirm that each DRINKAT branch has a dedicated handwashing sink (not a prep, warewash, or mop sink), stocked with cleanser and a Code-compliant drying method, with visible wash signage. Staff should wash using the 2-301.12 sequence before food work and at the 2-301.14 moments. A written employee health reporting path matching 2-201.11 still has to be named by DRINKAT. Do not invent a house sanitizer, illness form, or local legal duty here.',
    proposedAr:
      'على مدير الجودة تأكيد أن لكل فرع مغسلة أيدٍ مخصصة (ليست مغسلة تحضير أو جلي أو ممسحة)، مزوّدة بمنظف وطريقة تجفيف مطابقة للكود، مع لافتة غسل ظاهرة. يغسل الموظفون وفق تسلسل 2-301.12 وقبل العمل بالطعام وفي مواقف 2-301.14. مسار الإبلاغ عن المرض وفق 2-201.11 لم تسمّه DRINKAT بعد. لا تخترع مطهراً أو نموذجاً مرضياً أو التزاماً قانونياً محلياً هنا.',
    missingEn: [
      'Which local authority, if any, adopted FDA Food Code 2026 or an equivalent.',
      'DRINKAT written employee health / exclusion form and who the Person in Charge is per shift.',
      'Who restocks soap and towels, and the branch-specific sink map.',
    ],
    missingAr: [
      'أي جهة محلية اعتمدت كود الغذاء 2026 أو ما يعادله إن وُجد.',
      'نموذج إبلاغ مرض / إبعاد معتمد واسم المسؤول عن الوردية.',
      'من يعبّئ الصابون والمناشف وخريطة المغاسل لكل فرع.',
    ],
    evidenceEn: [
      'Photo of each employee handwashing sink showing cleanser, a Code drying method, and visible wash signage (6-301.11/12/14).',
      'Named Person in Charge for the shift once DRINKAT writes the health-reporting form (2-201.11).',
      'Do not invent a house illness form or sanitizer as evidence.',
    ],
    evidenceAr: [
      'صورة لكل مغسلة موظفين تظهر المنظّف وطريقة التجفيف واللافتة (6-301.11/12/14).',
      'اسم المسؤول عن الوردية بعد كتابة نموذج الإبلاغ عن المرض (2-201.11).',
      'لا تخترع نموذج مرض أو مطهّراً كدليل.',
    ],
    correctiveEn:
      'FDA 2-201.12/13 require exclusion or restriction when reportable symptoms or diagnoses are known. FDA 2-301.15 requires washing only at a handwashing sink. Restock cleanser/drying per 6-301.11/12 before food work continues. A DRINKAT stop-sale or sick-leave policy is not written here.',
    correctiveAr:
      'يتطلب 2-201.12/13 الإبعاد أو التقييد عند الأعراض أو التشخيصات الواجب الإبلاغ عنها. يتطلب 2-301.15 الغسل في مغسلة الأيدي فقط. أعد تعبئة المنظّف/التجفيف وفق 6-301.11/12 قبل استمرار العمل بالطعام. سياسة إيقاف البيع أو الإجازة المرضية لـ DRINKAT غير مكتوبة هنا.',
  }),
  ...pair({
    key: 'cold-hold-date-mark',
    domain: 'food_safety',
    titleEn: 'Cold holding and date marking of TCS / ready-to-eat foods',
    titleAr: 'الحفظ البارد ووضع تاريخ أطعمة التحكم بالوقت والحرارة',
    keywords: 'cold hold refrigerator 41 date mark seven days milk discard ready-to-eat',
    proposedEn:
      'FDA 3-501.16 requires TCS food at 5°C (41°F) or below when not being prepared, cooked, cooled, or under time-as-public-health-control. FDA 3-501.17/18 require date marking of refrigerated RTE TCS food held more than 24 hours and discard after a maximum of seven days at that temperature. DRINKAT has not listed which menu or bar items are TCS, how milk/dairy pitchers are handled, or which date-mark method is used. Inspection item cold_hold_visible remains visual only until those decisions exist.',
    proposedAr:
      'يتطلب 3-501.16 حفظ طعام التحكم بالوقت والحرارة عند 5°م (41°ف) أو أقل ما لم يكن قيد التحضير أو الطبخ أو التبريد أو ضبط الوقت. يتطلب 3-501.17/18 تعليم تاريخ الأطعمة الجاهزة للأكل المحفوظة أكثر من 24 ساعة والتخلص بعد سبعة أيام كحد أقصى. لم تُحدد DRINKAT أي أصناف قائمة/بار تُعد TCS ولا طريقة الحليب ولا نظام التاريخ. بند المعاينة البصري يبقى بصرياً فقط حتى تلك القرارات.',
    missingEn: [
      'DRINKAT TCS item list (milk, sauces, cut fruit, prepared foods).',
      'Approved thermometer type and calibration schedule.',
      'House date-mark method (calendar, color, day-dots) disclosed to the local authority if required.',
    ],
    missingAr: [
      'قائمة أصناف TCS لدى DRINKAT (حليب، صلصات، فاكهة مقطعة، أطعمة محضّرة).',
      'نوع ميزان الحرارة المعتمد وجدول المعايرة.',
      'طريقة تعليم التاريخ المعتمدة إن طُلب إفصاحها للجهة المحلية.',
    ],
    evidenceEn: [
      'Visible date mark on refrigerated RTE TCS held more than 24 hours (3-501.17) once DRINKAT names the TCS list and mark method.',
      'Thermometer type and calibration remain unset — do not invent a house °C log as policy.',
      'Photo of the holding unit is visual only until those decisions exist.',
    ],
    evidenceAr: [
      'تاريخ ظاهر على RTE TCS المحفوظ أكثر من 24 ساعة (3-501.17) بعد تسمية القائمة وطريقة التعليم.',
      'نوع الميزان والمعايرة غير محددين — لا تخترع سجل درجات كسياسة.',
      'صورة وحدة الحفظ بصرية فقط حتى تلك القرارات.',
    ],
    correctiveEn:
      'FDA 3-501.18 requires discard of RTE TCS that exceeds the 3-501.17 time/temperature combination, lacks a date mark, or is marked beyond the allowed combination. 5°C/41°F and seven days are FDA model-code values, not a DRINKAT house recipe.',
    correctiveAr:
      'يتطلب 3-501.18 التخلص من RTE TCS الذي يتجاوز تركيبة 3-501.17 أو يفتقد التاريخ أو يتجاوز المدة المسموحة. 5°م/41°ف وسبعة أيام قيم نموذج FDA وليست وصفة بيت.',
  }),
  ...pair({
    key: 'barista-rte-contact',
    domain: 'barista_qc',
    titleEn: 'Barista ready-to-eat contact, tasting, and working containers',
    titleAr: 'ملامسة الباريستا للجاهز للأكل والتذوق وأوعية العمل',
    keywords: 'barista garnish milk pitcher bare hand ready-to-eat tasting syrup label',
    proposedEn:
      'Garnishes, pastry, and other RTE items at the bar are subject to 3-301.11 (no casual bare-hand contact unless a documented alternative exists). Tasting sold product more than once with the same utensil is prohibited by 3-301.12. Working containers of syrups, powders, and dairy removed from original packaging need a common-name label under 3-302.12. Milk held as TCS food is also under 3-501.16. DRINKAT must not treat espresso recipes, steam-wand temperatures, or texture standards as FDA requirements — those are brand/product decisions still missing.',
    proposedAr:
      'الزينة والمعجنات وغيرها من الجاهز للأكل في البار تخضع لـ 3-301.11 (لا ملامسة عارية عابرة إلا ببديل موثّق). تذوق المنتج المباع أكثر من مرة بنفس الأداة محظور في 3-301.12. أوعية الشراب والمساحيق والألبان المأخوذة من عبواتها تحتاج اسمًا شائعًا وفق 3-302.12. الحليب إن عُدّ TCS يخضع أيضًا لـ 3-501.16. وصفات الإسبريسو ودرجات عصا البخار ومعايير الرغوة ليست متطلبات FDA — وهي قرارات علامة ما زالت ناقصة.',
    missingEn: [
      'Whether DRINKAT authorizes any bare-hand RTE alternative under 3-301.11(E).',
      'Approved milk holding vessels and discard rule after steaming (not specified by FDA as a drink recipe).',
      'Espresso/steam equipment cleaning interval mapped to 4-602.11 (house schedule not set).',
    ],
    missingAr: [
      'هل تعتمد DRINKAT أي بديل لملامسة الجاهز للأكل باليد العارية وفق 3-301.11(E).',
      'أوعية حفظ الحليب المعتمدة وقاعدة التخلص بعد التبخير (ليست وصفة FDA).',
      'فترة تنظيف الإسبريسو/البخار مقابل 4-602.11 (الجدول الداخلي غير محدد).',
    ],
    evidenceEn: [
      'Common-name labels on working containers removed from original packaging (3-302.12).',
      'No invented espresso recipe, steam-wand °C, or milk-texture photo standard.',
      'Documented 3-301.11(E) alternative only if DRINKAT later authorizes one.',
    ],
    evidenceAr: [
      'اسم شائع على أوعية العمل المأخوذة من عبواتها الأصلية (3-302.12).',
      'لا وصفة إسبريسو مخترعة ولا درجة عصا بخار ولا معيار صورة رغوة.',
      'بديل 3-301.11(E) موثّق فقط إذا اعتمدته DRINKAT لاحقاً.',
    ],
    correctiveEn:
      'Stop reuse of the same tasting utensil for food to be sold (3-301.12). Restrict casual bare-hand RTE contact unless a documented alternative exists (3-301.11). Label unlabeled working containers (3-302.12). Do not invent a milk discard-after-steam rule here.',
    correctiveAr:
      'أوقف إعادة استخدام أداة التذوق نفسها لطعام سيُباع (3-301.12). قيّد ملامسة الجاهز للأكل باليد العارية ما لم يوجد بديل موثّق (3-301.11). سمِّ الأوعية غير الموسومة (3-302.12). لا تخترع قاعدة تخلص بعد التبخير هنا.',
  }),
  ...pair({
    key: 'kitchen-separation-cook',
    domain: 'kitchen_qc',
    titleEn: 'Kitchen separation, cooking records, and tasting',
    titleAr: 'فصل المطبخ وسجلات الطبخ والتذوق',
    keywords: 'kitchen raw poultry cook temperature log plating cross contamination',
    proposedEn:
      'Raw animal foods shall be separated from RTE foods as specified in 3-302.11. If DRINKAT cooks raw animal foods, FDA 3-401.11 states Code time/temperature combinations (including 74°C/165°F instantaneous for poultry and stuffed foods). Those values are FDA model-code requirements, not a DRINKAT house recipe. Inspection item cook_temp_logged currently asks only whether a visible log exists. Tasting rules in 3-301.12 apply. Plating “matches standard” is a brand quality item, not an FDA cook standard.',
    proposedAr:
      'تُفصل الأغذية الحيوانية النيئة عن الجاهزة للأكل وفق 3-302.11. إذا طبخت DRINKAT أغذية حيوانية نيئة فإن 3-401.11 يحدّد تركيبات الوقت/الحرارة في الكود (بما فيها 74°م/165°ف لحظيًا للدواجن والمحشو). هذه قيم نموذج FDA وليست وصفة بيت. بند سجل حرارة الطبخ يسأل اليوم عن وجود سجل ظاهر فقط. تسري قواعد التذوق 3-301.12. مطابقة التقديم للمعيار بند جودة علامة لا معيار طبخ FDA.',
    missingEn: [
      'Which DRINKAT kitchen items are raw animal foods vs fully supplier-cooked.',
      'The approved cook-log form and thermometer (FDA does not name a DRINKAT form).',
      'Local authority cook-temperature chart if different from the model Code.',
    ],
    missingAr: [
      'أي أصناف مطبخ DRINKAT حيوانية نيئة مقابل مطبوخة بالكامل لدى المورّد.',
      'نموذج سجل الطبخ وميزان الحرارة المعتمدان.',
      'جدول حرارة الجهة المحلية إن اختلف عن الكود النموذجي.',
    ],
    evidenceEn: [
      'Visible separation of raw animal foods from RTE during storage/prep (3-302.11) if such items exist.',
      'Cook-log form remains unnamed — inspection today only asks whether a log is visible.',
      '3-401.11 time/temperature combinations are FDA model-code values, not a house recipe.',
    ],
    evidenceAr: [
      'فصل ظاهر للأغذية الحيوانية النيئة عن الجاهزة للأكل (3-302.11) إن وُجدت تلك الأصناف.',
      'نموذج سجل الطبخ غير مسمّى — المعاينة تسأل اليوم عن وجود سجل ظاهر فقط.',
      'تركيبات 3-401.11 قيم نموذج FDA وليست وصفة بيت.',
    ],
    correctiveEn:
      'Separate raw animal foods from RTE (3-302.11). If undercooked product was to be sold without a 3-603.11 advisory, do not invent a DRINKAT recook/discard rule beyond quoting the Code cook combinations and the consumer-advisory requirement. Tasting utensil reuse is prohibited (3-301.12).',
    correctiveAr:
      'افصل الأغذية الحيوانية النيئة عن الجاهزة للأكل (3-302.11). إذا قُدّم منتج غير مكتمل الطبخ بلا إرشاد 3-603.11 فلا تخترع قاعدة إعادة طبخ/تخلص تتجاوز اقتباس تركيبات الكود ومتطلب الإرشاد. إعادة استخدام أداة التذوق محظورة (3-301.12).',
  }),
  ...pair({
    key: 'product-allergens-advisory',
    domain: 'product_quality',
    titleEn: 'Allergen notice, identity labels, and consumer advisory',
    titleAr: 'إشعار مسببات الحساسية وبطاقات الهوية وإرشاد المستهلك',
    keywords: 'allergen milk nuts menu advisory raw undercooked appearance portion',
    proposedEn:
      'FDA 3-602.12(C) requires written consumer notification of major food allergens in unpackaged foods. FDA 3-603.11 requires a disclosure and reminder if animal foods are served raw or undercooked. Container identity is 3-302.12. Drink/food appearance and portion consistency on the DRINKAT inspection are brand standards — the Food Code does not set latte art, cup fill, or garnish photos. Do not invent a DRINKAT allergen matrix or recipe book here.',
    proposedAr:
      'يتطلب 3-602.12(C) إشعاراً كتابياً للمستهلك بوجود مسببات الحساسية الرئيسية في الأطعمة غير المعبأة. يتطلب 3-603.11 إفصاحاً وتذكيراً إذا قُدّمت أغذية حيوانية نيئة أو غير مكتملة الطبخ. هوية الأوعية 3-302.12. مظهر المشروب/الطعام وتناسق الحصة في معاينة DRINKAT معايير علامة — الكود لا يحدّد فن اللاتيه أو امتلاء الكوب. لا تخترع مصفوفة حساسية أو كتاب وصفات هنا.',
    missingEn: [
      'DRINKAT major-allergen ingredient matrix per SKU / menu item.',
      'Whether any raw or undercooked animal food is sold (and the written advisory text).',
      'Approved product reference photos (brand, not FDA).',
    ],
    missingAr: [
      'مصفوفة مسببات الحساسية لكل صنف قائمة.',
      'هل يُباع أي غذاء حيواني نيء أو غير مكتمل الطبخ ونص الإرشاد المكتوب.',
      'صور المرجع المعتمدة للمنتج (علامة لا FDA).',
    ],
    evidenceEn: [
      'Written consumer notification of major food allergens in unpackaged items (3-602.12(C)) once DRINKAT names the method and SKU matrix.',
      'Disclosure + reminder text if any raw/undercooked animal food is sold (3-603.11).',
      'Common-name labels on working containers (3-302.12). Do not invent latte-art or fill-line photos as FDA evidence.',
    ],
    evidenceAr: [
      'إشعار كتابي بمسببات الحساسية الرئيسية في غير المعبأ (3-602.12(C)) بعد تسمية الوسيلة ومصفوفة الأصناف.',
      'نص إفصاح وتذكير إن بيع غذاء حيواني نيء أو غير مكتمل الطبخ (3-603.11).',
      'اسم شائع على أوعية العمل (3-302.12). لا تخترع صور لاتيه أو خط امتلاء كدليل FDA.',
    ],
    correctiveEn:
      'Until a written allergen notice exists, QC cannot treat the current menu board as compliant with 3-602.12(C). Do not invent allergen names or a recipe book. If raw/undercooked animal food is sold without 3-603.11 disclosure and reminder, that gap is an FDA advisory failure — the house stop-sale rule is still missing.',
    correctiveAr:
      'ما دام إشعار الحساسية الكتابي غير موجود فلا تُعد لوحة القائمة مطابقة لـ 3-602.12(C). لا تخترع أسماء حساسية أو كتاب وصفات. بيع غذاء حيواني نيء/غير مكتمل بلا 3-603.11 فجوة إرشاد FDA — قاعدة إيقاف البيع الداخلية ما زالت ناقصة.',
  }),
  ...pair({
    key: 'equipment-clean-sanitize',
    domain: 'equipment',
    titleEn: 'Food-contact equipment cleaning and sanitizing',
    titleAr: 'تنظيف وتعقيم المعدات الملامسة للطعام',
    keywords: 'espresso fridge sanitizer four hours thermometer warewash test kit',
    proposedEn:
      'Food-contact surfaces used with TCS food shall be cleaned at least every four hours under 4-602.11(C) unless a listed exception applies. After cleaning they shall be sanitized per 4-703.11 using a chemical that meets 4-501.114 and 7-204.11 and the EPA label. A concentration test kit is required by 4-302.14. Refrigeration must be capable of holding TCS food as specified in 3-501.16; the inspection item fridge_running is visual/audible only. Do not invent DRINKAT sanitizer ppm, espresso group-head °C, or fridge set-points as house policy.',
    proposedAr:
      'تُنظَّف الأسطح الملامسة للطعام المستخدمة مع TCS كل أربع ساعات على الأقل وفق 4-602.11(C) ما لم ينطبق استثناء مذكور. بعد التنظيف تُعقَّم وفق 4-703.11 بمادة تطابق 4-501.114 و7-204.11 وملصق EPA. يلزم طقم قياس التركيز 4-302.14. يجب أن تقدر التبريد على حفظ TCS وفق 3-501.16؛ بند الثلاجة في المعاينة بصري/سمعي فقط. لا تخترع تركيز مطهّر أو درجة مجموعة الإسبريسو أو ضبط الثلاجة كسياسة بيت.',
    missingEn: [
      'DRINKAT sanitizer product, EPA-label use, and who tests concentration.',
      'Which bar/kitchen machines are food-contact TCS surfaces vs non-food-contact.',
      'Fault-reporting channel already hinted by inspection item fault_reported.',
    ],
    missingAr: [
      'منتج المطهّر المعتمد وتعليمات الملصق ومن يقيس التركيز.',
      'أي آلات بار/مطبخ أسطح ملامسة لـ TCS مقابل غير ملامسة.',
      'قناة الإبلاغ عن الأعطال المشار إليها في بند المعاينة.',
    ],
    evidenceEn: [
      'Named sanitizer product, EPA-label use, and a concentration test kit on site (4-302.14, 4-501.114). None of those SKUs are invented here.',
      'Which machines are TCS food-contact surfaces subject to 4-602.11 (every four hours unless a listed exception applies).',
      'Fridge_running remains visual/audible; do not invent a house set-point as FDA evidence.',
    ],
    evidenceAr: [
      'منتج مطهّر مسمّى وتعليمات الملصق وطقم قياس التركيز في الموقع (4-302.14، 4-501.114). لا تُخترع هذه المنتجات هنا.',
      'أي آلات أسطح ملامسة لـ TCS تخضع لـ 4-602.11 (كل أربع ساعات ما لم ينطبق استثناء).',
      'بند الثلاجة يبقى بصرياً/سمعياً؛ لا تخترع ضبطاً بيتياً كدليل FDA.',
    ],
    correctiveEn:
      'Clean TCS food-contact surfaces at the 4-602.11 frequency, then sanitize per 4-703.11 using a chemical that meets 4-501.114 and the EPA label. Do not invent ppm, group-head °C, or fridge set-points. Fault reporting stays the existing inspection item until QC names the channel.',
    correctiveAr:
      'نظّف أسطح TCS وفق تكرار 4-602.11 ثم عقّم وفق 4-703.11 بمادة تطابق 4-501.114 وملصق EPA. لا تخترع ppm أو درجة مجموعة أو ضبط ثلاجة. الإبلاغ عن العطل يبقى بند المعاينة حتى تسمّي الجودة القناة.',
  }),
  ...pair({
    key: 'cleaning-facilities',
    domain: 'cleaning',
    titleEn: 'Facility cleaning, restrooms, and waste',
    titleAr: 'تنظيف المنشأة ودورات المياه والنفايات',
    keywords: 'floors restrooms bins waste sanitize back area closing',
    proposedEn:
      'Physical facilities shall be cleaned as often as necessary (6-501.12), preferably when the least food is exposed, such as after closing. Handwashing aids belong only at handwashing sinks (6-301.13). Waste handling must protect food and equipment (5-501 / 6-501; distressed goods 6-404.11). “Back area sanitized” on the DRINKAT form is broader than FDA’s food-contact sanitizing rules — QC must say whether that means 4-703.11 food-contact sanitizing, facility cleaning, or both. No house chemical concentration is invented here.',
    proposedAr:
      'تُنظَّف المنشأة كلما لزم (6-501.12)، ويفضّل عند أقل تعرّض للطعام مثل بعد الإغلاق. وسائل غسل اليدين للمغاسل المخصصة فقط (6-301.13). إدارة النفايات تحمي الطعام والمعدات (5-501 / 6-501؛ البضائع المتضررة 6-404.11). «تعقيم الخلف» في نموذج DRINKAT أوسع من تعقيم الأسطح الملامسة — على الجودة تحديد إن كان يعني 4-703.11 أو تنظيف المنشأة أو كليهما. لا يُخترع هنا تركيز كيميائي.',
    missingEn: [
      'Approved facility cleaner vs food-contact sanitizer SKUs.',
      'Closing clean sequence and owner of restroom checks.',
      'Waste-stream rules (organic / recycling) if any brand standard exists.',
    ],
    missingAr: [
      'منتجات تنظيف المنشأة مقابل مطهّر ملامسة الطعام المعتمدة.',
      'تسلسل تنظيف الإغلاق ومسؤول فحص دورة المياه.',
      'قواعد فرز النفايات إن وُجدت كمعيار علامة.',
    ],
    evidenceEn: [
      'Facility cleaned as often as necessary, preferably when least food is exposed (6-501.12).',
      'Handwashing aids only at handwashing sinks (6-301.13).',
      'QC must say whether “back area sanitized” means 4-703.11 food-contact sanitizing, 6-501.12 facility cleaning, or both. No house chemical concentration is listed.',
    ],
    evidenceAr: [
      'تنظيف المنشأة كلما لزم، ويفضّل عند أقل تعرّض للطعام (6-501.12).',
      'وسائل غسل اليدين عند مغاسل الأيدي فقط (6-301.13).',
      'على الجودة بيان إن كان «تعقيم الخلف» يعني 4-703.11 أو 6-501.12 أو كليهما. لا يُذكر تركيز كيميائي.',
    ],
    correctiveEn:
      'Clean soiled physical facilities (6-501.12). Segregate distressed merchandise (6-404.11). Protect food and equipment from refuse (5-501 / 6-501). Do not treat a generic “sanitize the back” checkbox as a 4-703.11 food-contact sanitizing record until QC defines it.',
    correctiveAr:
      'نظّف المنشأة المتسخة (6-501.12). افصل البضائع المتضررة (6-404.11). احمِ الطعام والمعدات من النفايات (5-501 / 6-501). لا تعامل خانة «تعقيم الخلف» كسجل 4-703.11 حتى تعرّفها الجودة.',
  }),
  ...pair({
    key: 'brand-hygiene-presentation',
    domain: 'brand_standards',
    titleEn: 'Hygiene presentation versus brand guest standards',
    titleAr: 'مظهر النظافة مقابل معايير الضيف للعلامة',
    keywords: 'uniform hair net beard clothing eat drink allergen menu board',
    proposedEn:
      'FDA-backed pieces of “uniform and grooming” are clean outer clothing (2-304.11), effective hair restraints (2-402.11), and eating/drinking only as allowed (2-401.11). Menu-board currency, music, and guest-area “feel” are brand standards with no FDA Food Code section. Allergen written notice (3-602.12(C)) may appear on menus or another written method — DRINKAT has not chosen the method. Do not treat a dress-code photo as a Food Code citation.',
    proposedAr:
      'الجوانب المسنودة بـ FDA في الزي والمظهر: لباس خارجي نظيف (2-304.11)، تثبيت شعر فعّال (2-402.11)، والأكل/الشرب وفق 2-401.11 فقط. حداثة لوحة القائمة والموسيقى وإحساس الضيف معايير علامة بلا قسم في الكود. إشعار الحساسية الكتابي (3-602.12(C)) قد يكون على القائمة أو وسيلة أخرى — لم تختر DRINKAT الوسيلة. لا تُعامل صورة الزي كاستشهاد بالكود.',
    missingEn: [
      'Written DRINKAT dress and hair-restraint standard (photos).',
      'Closed-cup staff drink rule beyond 2-401.11(B).',
      'Who updates menu boards and allergen notices.',
    ],
    missingAr: [
      'معيار الزي وتثبيت الشعر المكتوب (صور).',
      'قاعدة شراب الموظف بالكوب المغلق بما يزيد على 2-401.11(B).',
      'من يحدّث لوحات القائمة وإشعارات الحساسية.',
    ],
    evidenceEn: [
      'Clean outer clothing (2-304.11) and effective hair restraints (2-402.11) — house photo standard still missing.',
      'Staff eating/drinking only as 2-401.11 allows (closed beverage handled to prevent contamination).',
      'Menu-board “feel,” music, and dress-code photos are brand evidence, not Food Code citations.',
    ],
    evidenceAr: [
      'لباس خارجي نظيف (2-304.11) وتثبيت شعر فعّال (2-402.11) — معيار الصورة الداخلي ناقص.',
      'أكل/شرب الموظفين وفق 2-401.11 فقط (كوب مغلق يُتعامل معه لمنع التلوث).',
      'إحساس اللوحة والموسيقى وصور الزي أدلة علامة لا استشهادات بالكود.',
    ],
    correctiveEn:
      'Replace soiled outer clothing (2-304.11). Provide an effective hair restraint (2-402.11). Move eating/drinking to a designated area or a closed beverage per 2-401.11. Allergen written notice remains 3-602.12(C) and is not satisfied by a dress-code photo.',
    correctiveAr:
      'استبدل اللباس الخارجي المتسخ (2-304.11). وفّر تثبيتاً فعّالاً للشعر (2-402.11). انقل الأكل/الشرب إلى منطقة مخصصة أو كوب مغلق وفق 2-401.11. إشعار الحساسية يبقى 3-602.12(C) ولا تكفيه صورة زي.',
  }),
  ...pair({
    key: 'opening-handwash-station',
    domain: 'opening_checklist',
    titleEn: 'Opening — handwashing station ready',
    titleAr: 'الافتتاح — محطة غسل اليدين جاهزة',
    keywords: 'opening handwash stocked soap towels sign warm water station',
    proposedEn:
      'Before service, confirm each employee handwashing sink has cleanser (6-301.11), a Code drying method (6-301.12), visible wash signage (6-301.14), and water meeting 5-202.12. This supports inspection item handwash_stocked. Opening cash, doors, and lights have no FDA Food Code citation and stay operational, not food-code, tasks.',
    proposedAr:
      'قبل الخدمة تأكد أن لكل مغسلة موظفين منظفاً (6-301.11) وطريقة تجفيف مطابقة (6-301.12) ولافتة ظاهرة (6-301.14) وماء وفق 5-202.12. هذا يدعم بند محطة غسل اليدين. النقد والأبواب والإضاءة بلا استشهاد FDA وتبقى مهاماً تشغيلية لا مهام كود غذاء.',
    missingEn: [
      'Opening owner per branch and the sink checklist photo standard.',
      'What to do if hot water is unavailable (FDA does not write a DRINKAT stop-sale rule).',
    ],
    missingAr: [
      'مسؤول الافتتاح لكل فرع ومعيار صورة المغسلة.',
      'ما العمل إذا انقطع الماء الساخن (FDA لا يكتب قاعدة إيقاف بيع لـ DRINKAT).',
    ],
    evidenceEn: [
      'Opening photo of each employee handwashing sink: cleanser, Code drying method, visible signage, water available (6-301.11/12/14, 5-202.12).',
      'Cash, doors, and lights have no FDA citation and are not food-code evidence.',
      'House stop-sale if hot water fails remains unset.',
    ],
    evidenceAr: [
      'صورة افتتاح لكل مغسلة موظفين: منظّف، تجفيف مطابق، لافتة، ماء (6-301.11/12/14، 5-202.12).',
      'النقد والأبواب والإضاءة بلا استشهاد FDA وليست دليل كود غذاء.',
      'قاعدة إيقاف البيع عند انقطاع الماء الساخن غير محددة.',
    ],
    correctiveEn:
      'Do not start food work at a sink that lacks cleanser, a Code drying method, or signage (6-301.11/12/14). Water temperature at a handwashing sink is specified by FDA 5-202.12 as at least 38°C (100°F). Whether DRINKAT stops sale without that water is an owner decision, not written here.',
    correctiveAr:
      'لا تبدأ عمل الطعام عند مغسلة بلا منظّف أو تجفيف مطابق أو لافتة (6-301.11/12/14). حرارة ماء المغسلة في 5-202.12 لا تقل عن 38°م (100°ف). إيقاف البيع دون ذلك الماء قرار مالك غير مكتوب هنا.',
  }),
];

export function isUnapprovableSopSource(sourceRef: string): boolean {
  const s = sourceRef.trim().toUpperCase();
  return s.startsWith('SYNTHETIC:') || s.startsWith('DRAFT:') || s.startsWith('FDA:');
}

export function isSyntheticSopSourceRef(sourceRef: string): boolean {
  return sourceRef.trim().toUpperCase().startsWith('SYNTHETIC:');
}

/** Draft/FDA rows may be adopted into a new DRINKAT document. Synthetic test rows may not. */
export function canAdoptSopSource(sourceRef: string): boolean {
  const s = sourceRef.trim().toUpperCase();
  if (s.startsWith('SYNTHETIC:')) return false;
  return s.startsWith('DRAFT:') || s.startsWith('FDA:');
}

/** Only genuine DRINKAT sourceRefs (not SYNTHETIC/DRAFT/FDA) may be approved. */
export function canApproveSopSource(sourceRef: string): boolean {
  return !isUnapprovableSopSource(sourceRef);
}

export const DRINKAT_ADOPTED_PREFIX = 'DRINKAT-ADOPTED:';
export const JORDAN_SOP_LEGAL_EN =
  'OPERATING COUNTRY: Jordan. FDA Food Code 2026 is DRINKAT’s internal baseline. It is a U.S. model code, not automatically Jordanian law. JFDA / Food Law No. 30 of 2015 and applicable Jordanian technical regulations take precedence. This document is not a claim of JFDA compliance.';
export const JORDAN_SOP_LEGAL_AR =
  'بلد التشغيل: الأردن. كود الغذاء 2026 هو المرجع الداخلي لدى DRINKAT. هو كود نموذجي أمريكي وليس قانوناً أردنياً تلقائياً. تتقدم المؤسسة العامة للغذاء والدواء / قانون الغذاء رقم 30 لسنة 2015 والقواعد الفنية الأردنية. هذا المستند ليس ادعاء امتثال لـ JFDA.';

export function searchDraftLibrary(question: string, locale?: 'en' | 'ar'): DrinkatSopDraft[] {
  const words = expandSopSearchQuery(question)
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return DRINKAT_SOP_DRAFTS.map((d) => {
    const hay = `${d.title} ${d.body} ${d.fdaSections.join(' ')}`.toLowerCase();
    const hits = words.filter((w) => hay.includes(w)).length;
    const localeBonus = locale && d.locale === locale ? 1 : 0;
    return { d, score: hits + localeBonus };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.d);
}

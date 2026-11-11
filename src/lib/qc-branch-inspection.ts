export const BRANCH_INSPECTION_KIND = 'branch_inspection';
export const BRANCH_INSPECTION_VERSION = 1;
/** High enough for a real visit; still bounds upload/API size. */
export const INSPECTION_PHOTOS_PER_ITEM_MAX = 30;

export type InspectionResult = 'pass' | 'fail';

export type BranchInspectionItem = {
  id: string;
  n: number;
  titleEn: string;
  titleAr: string;
};

export type BranchInspectionSection = {
  id: 'A' | 'B' | 'C' | 'D' | 'E';
  titleEn: string;
  titleAr: string;
  items: readonly BranchInspectionItem[];
};

/** Official Drinkat Quality Department Branch Inspection Report (paper form). */
export const BRANCH_INSPECTION_SECTIONS: readonly BranchInspectionSection[] = [
  {
    id: 'A',
    titleEn: 'Policy compliance',
    titleAr: 'الالتزام بالسياسات',
    items: [
      { id: 'a1', n: 1, titleEn: 'Material storage', titleAr: 'حفظ المواد' },
      { id: 'a2', n: 2, titleEn: 'Potato timer', titleAr: 'تايمر البطاطا' },
      { id: 'a3', n: 3, titleEn: 'Refrigerator separation', titleAr: 'فصل الثلاجات' },
      { id: 'a4', n: 4, titleEn: 'Storage shelf organization', titleAr: 'ترتيب ارفف التخزين' },
      { id: 'a5', n: 5, titleEn: 'Equipment storage', titleAr: 'تخزين المعدات' },
      { id: 'a6', n: 6, titleEn: 'Health certificates', titleAr: 'الشهادات الصحية' },
      { id: 'a7', n: 7, titleEn: 'Uniform compliance', titleAr: 'الالتزام بالزي الرسمي' },
    ],
  },
  {
    id: 'B',
    titleEn: 'FIFO / FEFO consumption',
    titleAr: 'FIFO - FEFO نظام الاستهلاك',
    items: [
      { id: 'b1', n: 1, titleEn: 'Meat', titleAr: 'اللحمة' },
      { id: 'b2', n: 2, titleEn: 'Bread', titleAr: 'الخبز' },
      { id: 'b3', n: 3, titleEn: 'Sauces', titleAr: 'الصوصات' },
      { id: 'b4', n: 4, titleEn: 'Juices', titleAr: 'العصائر' },
      { id: 'b5', n: 5, titleEn: 'Prep materials', titleAr: 'مواد التحضير' },
      { id: 'b6', n: 6, titleEn: 'Vegetables & Fruits', titleAr: 'الخضار والفواكه' },
    ],
  },
  {
    id: 'C',
    titleEn: 'Packaging and dates',
    titleAr: 'التغليف والتواريخ',
    items: [
      { id: 'c1', n: 1, titleEn: 'Meat', titleAr: 'اللحمة' },
      { id: 'c2', n: 2, titleEn: 'Sauces', titleAr: 'الصوصات' },
      { id: 'c3', n: 3, titleEn: 'Juices', titleAr: 'العصائر' },
      { id: 'c4', n: 4, titleEn: 'Prep materials', titleAr: 'مواد التحضير' },
    ],
  },
  {
    id: 'D',
    titleEn: 'Cleanliness',
    titleAr: 'النظافة',
    items: [
      { id: 'd1', n: 1, titleEn: 'Outdoor tables', titleAr: 'الطاولات الخارجية' },
      { id: 'd2', n: 2, titleEn: 'Walls and floors', titleAr: 'الجدران والارضيات' },
      { id: 'd3', n: 3, titleEn: 'Grill', titleAr: 'الجريل' },
      { id: 'd4', n: 4, titleEn: 'Hood', titleAr: 'الهود' },
      { id: 'd5', n: 5, titleEn: 'Mats / stations', titleAr: 'البسطات' },
      { id: 'd6', n: 6, titleEn: 'Dishwashing', titleAr: 'الجلي' },
      { id: 'd7', n: 7, titleEn: 'Refrigerators', titleAr: 'الثلاجات' },
    ],
  },
  {
    id: 'E',
    titleEn: 'Sensory inspection',
    titleAr: 'الفحص الحسي',
    items: [
      { id: 'e1', n: 1, titleEn: 'Potato', titleAr: 'البطاطا' },
      { id: 'e2', n: 2, titleEn: 'Sauces', titleAr: 'الصوصات' },
      { id: 'e3', n: 3, titleEn: 'Juices', titleAr: 'العصائر' },
      { id: 'e4', n: 4, titleEn: 'Vegetables & Fruits', titleAr: 'الخضار والفواكه' },
    ],
  },
] as const;

export const BRANCH_INSPECTION_ITEMS = BRANCH_INSPECTION_SECTIONS.flatMap((s) => [...s.items]);
export const BRANCH_INSPECTION_ITEM_IDS = BRANCH_INSPECTION_ITEMS.map((i) => i.id);

export type InspectionAnswer = { result: InspectionResult; photoUrl: string | null; photoUrls: string[] };
export type InspectionAnswers = Record<string, InspectionAnswer>;

function isPhotoUrl(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 3;
}

export function normalizeInspectionPhotoUrls(row: { photoUrl?: unknown; photoUrls?: unknown } | null | undefined): string[] {
  const out: string[] = [];
  const add = (v: unknown) => {
    if (!isPhotoUrl(v)) return;
    const url = v.trim();
    if (!out.includes(url)) out.push(url);
  };
  if (Array.isArray(row?.photoUrls)) {
    for (const item of row.photoUrls) add(item);
  }
  add(row?.photoUrl);
  return out.slice(0, INSPECTION_PHOTOS_PER_ITEM_MAX);
}

export function inspectionAnswerPhotos(answer: InspectionAnswer | null | undefined): string[] {
  if (!answer) return [];
  return normalizeInspectionPhotoUrls(answer);
}

export type BranchInspectionPayload = {
  kind: typeof BRANCH_INSPECTION_KIND;
  v: number;
  answers: InspectionAnswers;
  notes: string;
};

function isResult(v: unknown): v is InspectionResult {
  return v === 'pass' || v === 'fail';
}

export function inspectionItemById(id: string): BranchInspectionItem | undefined {
  return BRANCH_INSPECTION_ITEMS.find((i) => i.id === id);
}

export function validateInspectionAnswers(raw: unknown): { ok: true; answers: InspectionAnswers } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Answer every checklist item' };
  }
  const rec = raw as Record<string, unknown>;
  const answers: InspectionAnswers = {};
  for (const id of BRANCH_INSPECTION_ITEM_IDS) {
    const row = rec[id];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { ok: false, error: 'Answer every checklist item' };
    }
    const result = (row as { result?: unknown }).result;
    if (!isResult(result)) return { ok: false, error: 'Answer every checklist item' };
    const photoUrls = normalizeInspectionPhotoUrls(row as { photoUrl?: unknown; photoUrls?: unknown });
    answers[id] = { result, photoUrl: photoUrls[0] ?? null, photoUrls };
  }
  return { ok: true, answers };
}

export function countInspectionResults(answers: InspectionAnswers): { pass: number; fail: number } {
  let pass = 0;
  let fail = 0;
  for (const id of BRANCH_INSPECTION_ITEM_IDS) {
    const result = answers[id]?.result;
    if (result === 'fail') fail += 1;
    else if (result === 'pass') pass += 1;
  }
  return { pass, fail };
}

export function inspectionSeverity(fail: number): 'low' | 'medium' | 'high' | 'critical' {
  if (fail <= 0) return 'low';
  if (fail <= 3) return 'medium';
  if (fail <= 8) return 'high';
  return 'critical';
}

export function inspectionComments(pass: number, fail: number, notes: string): string {
  const head = `Branch inspection · ${fail} fail · ${pass} pass`;
  const extra = notes.trim();
  return extra ? `${head}\n${extra}` : head;
}

export function encodeInspectionPayload(answers: InspectionAnswers, notes: string): BranchInspectionPayload {
  return { kind: BRANCH_INSPECTION_KIND, v: BRANCH_INSPECTION_VERSION, answers, notes: notes.trim() };
}

function parseStoredInspectionAnswers(raw: unknown): InspectionAnswers | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const answers: InspectionAnswers = {};
  let any = false;
  for (const id of BRANCH_INSPECTION_ITEM_IDS) {
    const row = rec[id];
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const result = (row as { result?: unknown }).result;
    if (!isResult(result)) continue;
    const photoUrls = normalizeInspectionPhotoUrls(row as { photoUrl?: unknown; photoUrls?: unknown });
    answers[id] = { result, photoUrl: photoUrls[0] ?? null, photoUrls };
    any = true;
  }
  return any ? answers : null;
}

export function parseInspectionPayload(raw: string): BranchInspectionPayload | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const obj = v as { kind?: unknown; answers?: unknown; notes?: unknown; v?: unknown };
    if (obj.kind !== BRANCH_INSPECTION_KIND) return null;
    const answers = parseStoredInspectionAnswers(obj.answers);
    if (!answers) return null;
    return {
      kind: BRANCH_INSPECTION_KIND,
      v: typeof obj.v === 'number' ? obj.v : BRANCH_INSPECTION_VERSION,
      answers,
      notes: typeof obj.notes === 'string' ? obj.notes : '',
    };
  } catch {
    return null;
  }
}

export function isBranchInspectionReport(item: { category?: string; photosJson?: string }): boolean {
  if (item.category === BRANCH_INSPECTION_KIND) return true;
  return Boolean(item.photosJson && parseInspectionPayload(item.photosJson));
}

export function listInspectionPhotos(payload: BranchInspectionPayload): string[] {
  const out: string[] = [];
  for (const id of BRANCH_INSPECTION_ITEM_IDS) {
    for (const url of inspectionAnswerPhotos(payload.answers[id])) {
      if (!out.includes(url)) out.push(url);
    }
  }
  return out;
}

/** Note reports store a URL array; inspections store a structured object. */
export function parseQcReportPhotos(raw: string): string[] {
  const inspection = parseInspectionPayload(raw);
  if (inspection) return listInspectionPhotos(inspection);
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.map((item) => String(item ?? '').trim()).filter((s) => s.length > 3);
  } catch {
    return [];
  }
}

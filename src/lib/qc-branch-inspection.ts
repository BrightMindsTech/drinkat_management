import { canonicalUploadPath, preferSignedUploadUrl } from '@/lib/upload-path';

export const BRANCH_INSPECTION_KIND = 'branch_inspection';
export const BRANCH_INSPECTION_VERSION = 1;
/** High enough for a real visit; still bounds upload/API size. */
export const INSPECTION_PHOTOS_PER_ITEM_MAX = 30;
export const INSPECTION_PHOTO_NOTE_MAX = 280;

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
      { id: 'd8', n: 8, titleEn: 'Cleaning tools', titleAr: 'ادوات التنظيف' },
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

export type InspectionAnswer = {
  result: InspectionResult;
  photoUrl: string | null;
  photoUrls: string[];
  photoNotes: Record<string, string>;
};
export type InspectionAnswers = Record<string, InspectionAnswer>;

function isPhotoUrl(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 3;
}

export function normalizeInspectionPhotoUrls(row: { photoUrl?: unknown; photoUrls?: unknown } | null | undefined): string[] {
  const byKey = new Map<string, string>();
  const order: string[] = [];
  const add = (v: unknown) => {
    if (!isPhotoUrl(v)) return;
    const raw = v.trim().split('#')[0] ?? v.trim();
    const key = canonicalUploadPath(raw) || raw;
    if (!key) return;
    if (!byKey.has(key)) order.push(key);
    byKey.set(key, preferSignedUploadUrl(byKey.get(key), raw));
  };
  if (Array.isArray(row?.photoUrls)) {
    for (const item of row.photoUrls) add(item);
  }
  add(row?.photoUrl);
  return order.map((key) => byKey.get(key)!).slice(0, INSPECTION_PHOTOS_PER_ITEM_MAX);
}

export function inspectionAnswerPhotos(answer: InspectionAnswer | null | undefined): string[] {
  if (!answer) return [];
  return normalizeInspectionPhotoUrls(answer);
}

export function normalizeInspectionPhotoNotes(
  row: { photoNotes?: unknown } | null | undefined,
  photoUrls: string[]
): Record<string, string> {
  const urlByKey = new Map(photoUrls.map((url) => [canonicalUploadPath(url) || url, url]));
  const out: Record<string, string> = {};
  const raw = row?.photoNotes;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [url, note] of Object.entries(raw as Record<string, unknown>)) {
    const match = urlByKey.get(canonicalUploadPath(url) || url);
    if (!match) continue;
    if (typeof note !== 'string') continue;
    const trimmed = note.trim().slice(0, INSPECTION_PHOTO_NOTE_MAX);
    if (trimmed) out[match] = trimmed;
  }
  return out;
}

export function inspectionPhotoNote(answer: InspectionAnswer | null | undefined, url: string): string {
  const notes = answer?.photoNotes;
  if (!notes) return '';
  const exact = notes[url];
  if (typeof exact === 'string') return exact;
  const want = canonicalUploadPath(url) || url;
  for (const [k, note] of Object.entries(notes)) {
    if ((canonicalUploadPath(k) || k) === want && typeof note === 'string') return note;
  }
  return '';
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

export function validateInspectionAnswersFor(
  itemIds: readonly string[],
  raw: unknown
): { ok: true; answers: InspectionAnswers } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Answer every checklist item' };
  }
  const rec = raw as Record<string, unknown>;
  const answers: InspectionAnswers = {};
  for (const id of itemIds) {
    const row = rec[id];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { ok: false, error: 'Answer every checklist item' };
    }
    const result = (row as { result?: unknown }).result;
    if (!isResult(result)) return { ok: false, error: 'Answer every checklist item' };
    const photoUrls = normalizeInspectionPhotoUrls(row as { photoUrl?: unknown; photoUrls?: unknown });
    const photoNotes = normalizeInspectionPhotoNotes(row as { photoNotes?: unknown }, photoUrls);
    answers[id] = { result, photoUrl: photoUrls[0] ?? null, photoUrls, photoNotes };
  }
  return { ok: true, answers };
}

export function validateInspectionAnswers(raw: unknown): { ok: true; answers: InspectionAnswers } | { ok: false; error: string } {
  return validateInspectionAnswersFor(BRANCH_INSPECTION_ITEM_IDS, raw);
}

export function countInspectionResultsFor(
  itemIds: readonly string[],
  answers: InspectionAnswers
): { pass: number; fail: number } {
  let pass = 0;
  let fail = 0;
  for (const id of itemIds) {
    const result = answers[id]?.result;
    if (result === 'fail') fail += 1;
    else if (result === 'pass') pass += 1;
  }
  return { pass, fail };
}

export function countInspectionResults(answers: InspectionAnswers): { pass: number; fail: number } {
  return countInspectionResultsFor(BRANCH_INSPECTION_ITEM_IDS, answers);
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

export function canonicalizeInspectionAnswers(answers: InspectionAnswers): InspectionAnswers {
  const out: InspectionAnswers = {};
  for (const [id, row] of Object.entries(answers)) {
    const photoUrls = normalizeInspectionPhotoUrls({
      photoUrls: row.photoUrls.map((u) => canonicalUploadPath(u) || u),
      photoUrl: row.photoUrl ? canonicalUploadPath(row.photoUrl) : null,
    });
    const photoNotes = normalizeInspectionPhotoNotes({ photoNotes: row.photoNotes }, photoUrls);
    out[id] = { result: row.result, photoUrl: photoUrls[0] ?? null, photoUrls, photoNotes };
  }
  return out;
}

export function encodeInspectionPayload(answers: InspectionAnswers, notes: string): BranchInspectionPayload {
  return {
    kind: BRANCH_INSPECTION_KIND,
    v: BRANCH_INSPECTION_VERSION,
    answers: canonicalizeInspectionAnswers(answers),
    notes: notes.trim(),
  };
}

export function parseStoredInspectionAnswersFor(itemIds: readonly string[], raw: unknown): InspectionAnswers | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const answers: InspectionAnswers = {};
  let any = false;
  for (const id of itemIds) {
    const row = rec[id];
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const result = (row as { result?: unknown }).result;
    if (!isResult(result)) continue;
    const photoUrls = normalizeInspectionPhotoUrls(row as { photoUrl?: unknown; photoUrls?: unknown });
    const photoNotes = normalizeInspectionPhotoNotes(row as { photoNotes?: unknown }, photoUrls);
    answers[id] = { result, photoUrl: photoUrls[0] ?? null, photoUrls, photoNotes };
    any = true;
  }
  return any ? answers : null;
}

function parseStoredInspectionAnswers(raw: unknown): InspectionAnswers | null {
  return parseStoredInspectionAnswersFor(BRANCH_INSPECTION_ITEM_IDS, raw);
}

function parseStoredInspectionAnswersLoose(raw: unknown): InspectionAnswers | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return parseStoredInspectionAnswersFor(Object.keys(raw as Record<string, unknown>), raw);
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

export function listInspectionPhotosFromAnswers(answers: InspectionAnswers): string[] {
  const out: string[] = [];
  for (const ans of Object.values(answers)) {
    for (const url of inspectionAnswerPhotos(ans)) {
      if (!out.includes(url)) out.push(url);
    }
  }
  return out;
}

export function listInspectionPhotos(payload: BranchInspectionPayload): string[] {
  return listInspectionPhotosFromAnswers(payload.answers);
}

/** Note reports store a URL array; inspections/complaints store a structured object. */
export function parseQcReportPhotos(raw: string): string[] {
  const inspection = parseInspectionPayload(raw);
  if (inspection) return listInspectionPhotos(inspection);
  try {
    const v = JSON.parse(raw) as unknown;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const rec = v as { kind?: unknown; answers?: unknown };
      if (rec.kind === 'warehouse_inspection' && rec.answers && typeof rec.answers === 'object' && !Array.isArray(rec.answers)) {
        const answers = parseStoredInspectionAnswersLoose(rec.answers);
        if (answers) return listInspectionPhotosFromAnswers(answers);
      }
    }
  } catch {
    /* fall through */
  }
  try {
    const v = JSON.parse(raw) as unknown;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const rec = v as { kind?: unknown; photoUrls?: unknown; talabat?: unknown; careem?: unknown; extraChannels?: unknown };
      if (rec.kind === 'customer_complaint') {
        const fromSlots: string[] = [];
        const extraSlots = Array.isArray(rec.extraChannels)
          ? rec.extraChannels.flatMap((ch) =>
              ch && typeof ch === 'object' && Array.isArray((ch as { slots?: unknown }).slots)
                ? ((ch as { slots: unknown[] }).slots as unknown[])
                : []
            )
          : [];
        for (const row of [...(Array.isArray(rec.talabat) ? rec.talabat : []), ...(Array.isArray(rec.careem) ? rec.careem : []), ...extraSlots]) {
          if (!row || typeof row !== 'object') continue;
          const url = String((row as { photoUrl?: unknown }).photoUrl ?? '').trim();
          if (url.length > 3 && !fromSlots.includes(url)) fromSlots.push(url);
        }
        if (fromSlots.length) return fromSlots;
        if (Array.isArray(rec.photoUrls)) {
          return rec.photoUrls.map((item) => String(item ?? '').trim()).filter((s) => s.length > 3);
        }
        return [];
      }
      return [];
    }
    if (!Array.isArray(v)) return [];
    return v.map((item) => String(item ?? '').trim()).filter((s) => s.length > 3);
  } catch {
    return [];
  }
}

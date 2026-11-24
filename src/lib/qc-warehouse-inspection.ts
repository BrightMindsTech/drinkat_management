import {
  countInspectionResultsFor,
  parseStoredInspectionAnswersFor,
  validateInspectionAnswersFor,
  type InspectionAnswers,
} from '@/lib/qc-branch-inspection';

export const WAREHOUSE_INSPECTION_KIND = 'warehouse_inspection';
export const WAREHOUSE_INSPECTION_VERSION = 1;

export type WarehouseInspectionSection = {
  id: 'A' | 'B' | 'C' | 'D';
  titleEn: string;
  titleAr: string;
  items: readonly { id: string; n: number; titleEn: string; titleAr: string }[];
};

/** QC paper form: Central kitchen – Warehouse (not cafe branches). */
export const WAREHOUSE_INSPECTION_SECTIONS: readonly WarehouseInspectionSection[] = [
  {
    id: 'A',
    titleEn: 'Policy compliance',
    titleAr: 'الالتزام بالسياسات',
    items: [
      { id: 'wa1', n: 1, titleEn: 'Material storage', titleAr: 'حفظ المواد' },
      { id: 'wa2', n: 2, titleEn: 'Uniform compliance', titleAr: 'الالتزام بالزي الرسمي' },
      { id: 'wa3', n: 3, titleEn: 'Health certificates', titleAr: 'الشهادات الصحية' },
      { id: 'wa4', n: 4, titleEn: 'Storage methods', titleAr: 'طرق التخزين' },
    ],
  },
  {
    id: 'B',
    titleEn: 'Cleanliness',
    titleAr: 'النظافة',
    items: [
      { id: 'wb1', n: 1, titleEn: 'Refrigerators', titleAr: 'الثلاجات' },
      { id: 'wb2', n: 2, titleEn: 'Storage shelves', titleAr: 'ارفف التخزين' },
      { id: 'wb3', n: 3, titleEn: 'Station mats', titleAr: 'البسطات' },
      { id: 'wb4', n: 4, titleEn: 'Walls and floors', titleAr: 'الجدران والارضيات' },
      { id: 'wb5', n: 5, titleEn: 'Warehouse', titleAr: 'المستودع' },
      { id: 'wb6', n: 6, titleEn: 'External area', titleAr: 'المنطقة الخارجية' },
      { id: 'wb7', n: 7, titleEn: 'Cleaning tools', titleAr: 'ادوات التنظيف' },
    ],
  },
  {
    id: 'C',
    titleEn: 'Packaging and dates',
    titleAr: 'التغليف والتواريخ',
    items: [
      { id: 'wc1', n: 1, titleEn: 'Sauces', titleAr: 'الصوصات' },
      { id: 'wc2', n: 2, titleEn: 'Juices', titleAr: 'العصائر' },
      { id: 'wc3', n: 3, titleEn: 'Prep materials', titleAr: 'مواد التحضير' },
      { id: 'wc4', n: 4, titleEn: 'Vegetables & Fruits', titleAr: 'الخضار والفواكه' },
    ],
  },
  {
    id: 'D',
    titleEn: 'Sensory inspection',
    titleAr: 'الفحص الحسي',
    items: [
      { id: 'wd1', n: 1, titleEn: 'Sauces', titleAr: 'الصوصات' },
      { id: 'wd2', n: 2, titleEn: 'Juices', titleAr: 'العصائر' },
      { id: 'wd3', n: 3, titleEn: 'Vegetables & Fruits', titleAr: 'الخضار والفواكه' },
    ],
  },
] as const;

export const WAREHOUSE_INSPECTION_ITEMS = WAREHOUSE_INSPECTION_SECTIONS.flatMap((s) => [...s.items]);
export const WAREHOUSE_INSPECTION_ITEM_IDS = WAREHOUSE_INSPECTION_ITEMS.map((i) => i.id);

export function isWarehouseInspectionBranchName(name: string | null | undefined): boolean {
  const n = (name ?? '').trim().toLowerCase();
  if (!n) return false;
  return (
    n.includes('cloud kitchen') ||
    n.includes('central kitchen') ||
    n.includes('warehouse') ||
    n.includes('مطبخ مركزي') ||
    n.includes('مستودع')
  );
}

export function warehouseInspectionBranches<T extends { name: string }>(branches: T[]): T[] {
  return branches.filter((b) => isWarehouseInspectionBranchName(b.name));
}

export function validateWarehouseInspectionAnswers(raw: unknown) {
  return validateInspectionAnswersFor(WAREHOUSE_INSPECTION_ITEM_IDS, raw);
}

export function countWarehouseInspectionResults(answers: InspectionAnswers) {
  return countInspectionResultsFor(WAREHOUSE_INSPECTION_ITEM_IDS, answers);
}

export function warehouseInspectionComments(pass: number, fail: number, notes: string): string {
  const head = `Central kitchen – Warehouse · ${fail} fail · ${pass} pass`;
  const extra = notes.trim();
  return extra ? `${head}\n${extra}` : head;
}

export type WarehouseInspectionPayload = {
  kind: typeof WAREHOUSE_INSPECTION_KIND;
  v: number;
  answers: InspectionAnswers;
  notes: string;
};

export function encodeWarehouseInspectionPayload(
  answers: InspectionAnswers,
  notes: string
): WarehouseInspectionPayload {
  return {
    kind: WAREHOUSE_INSPECTION_KIND,
    v: WAREHOUSE_INSPECTION_VERSION,
    answers,
    notes: notes.trim(),
  };
}

export function parseWarehouseInspectionPayload(raw: string): WarehouseInspectionPayload | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const obj = v as { kind?: unknown; answers?: unknown; notes?: unknown; v?: unknown };
    if (obj.kind !== WAREHOUSE_INSPECTION_KIND) return null;
    const answers = parseStoredInspectionAnswersFor(WAREHOUSE_INSPECTION_ITEM_IDS, obj.answers);
    if (!answers) return null;
    return {
      kind: WAREHOUSE_INSPECTION_KIND,
      v: typeof obj.v === 'number' ? obj.v : WAREHOUSE_INSPECTION_VERSION,
      answers,
      notes: typeof obj.notes === 'string' ? obj.notes : '',
    };
  } catch {
    return null;
  }
}

export function isWarehouseInspectionReport(item: { category?: string; photosJson?: string }): boolean {
  if (item.category === WAREHOUSE_INSPECTION_KIND) return true;
  return Boolean(item.photosJson && parseWarehouseInspectionPayload(item.photosJson));
}

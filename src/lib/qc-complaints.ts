export const CUSTOMER_COMPLAINT_KIND = 'customer_complaint';
export const CUSTOMER_COMPLAINT_VERSION = 1;
export const COMPLAINT_PHOTOS_MAX = 12;
export const COMPLAINT_PHOTO_NOTE_MAX = 280;

export type ComplaintTypeId =
  | 'food_quality'
  | 'service'
  | 'cleanliness'
  | 'delay'
  | 'wrong_order'
  | 'other';

export const COMPLAINT_TYPES: readonly {
  id: ComplaintTypeId;
  titleEn: string;
  titleAr: string;
}[] = [
  { id: 'food_quality', titleEn: 'Food quality', titleAr: 'جودة الطعام' },
  { id: 'service', titleEn: 'Service', titleAr: 'الخدمة' },
  { id: 'cleanliness', titleEn: 'Cleanliness', titleAr: 'النظافة' },
  { id: 'delay', titleEn: 'Delay', titleAr: 'التأخير' },
  { id: 'wrong_order', titleEn: 'Wrong order', titleAr: 'طلب خاطئ' },
  { id: 'other', titleEn: 'Other', titleAr: 'أخرى' },
];

const TYPE_IDS = new Set<string>(COMPLAINT_TYPES.map((t) => t.id));

export type CustomerComplaintPayload = {
  kind: typeof CUSTOMER_COMPLAINT_KIND;
  v: number;
  complainantName: string;
  phone: string;
  orderNumber: string;
  types: ComplaintTypeId[];
  description: string;
  staffInvolved: string;
  actionTaken: string;
  photoUrls: string[];
  photoNotes: Record<string, string>;
};

function trimField(v: unknown, max: number): string {
  return String(v ?? '')
    .trim()
    .slice(0, max);
}

function uniqueUrls(urls: unknown, max: number): string[] {
  const out: string[] = [];
  if (!Array.isArray(urls)) return out;
  for (const item of urls) {
    const s = String(item ?? '').trim();
    if (s.length > 3 && !out.includes(s)) out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function normalizeTypes(raw: unknown): ComplaintTypeId[] {
  const out: ComplaintTypeId[] = [];
  if (!Array.isArray(raw)) return out;
  for (const item of raw) {
    const id = String(item ?? '').trim();
    if (TYPE_IDS.has(id) && !out.includes(id as ComplaintTypeId)) out.push(id as ComplaintTypeId);
  }
  return out;
}

export function normalizeComplaintPhotoNotes(
  photoUrls: string[],
  raw: unknown
): Record<string, string> {
  const notes: Record<string, string> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return notes;
  const rec = raw as Record<string, unknown>;
  for (const url of photoUrls) {
    const note = trimField(rec[url], COMPLAINT_PHOTO_NOTE_MAX);
    if (note) notes[url] = note;
  }
  return notes;
}

export function encodeComplaintPayload(input: {
  complainantName?: string;
  phone?: string;
  orderNumber?: string;
  types?: string[];
  description: string;
  staffInvolved?: string;
  actionTaken?: string;
  photoUrls?: string[];
  photoNotes?: Record<string, string>;
}): CustomerComplaintPayload {
  const photoUrls = uniqueUrls(input.photoUrls ?? [], COMPLAINT_PHOTOS_MAX);
  return {
    kind: CUSTOMER_COMPLAINT_KIND,
    v: CUSTOMER_COMPLAINT_VERSION,
    complainantName: trimField(input.complainantName, 120),
    phone: trimField(input.phone, 40),
    orderNumber: trimField(input.orderNumber, 80),
    types: normalizeTypes(input.types),
    description: trimField(input.description, 4000),
    staffInvolved: trimField(input.staffInvolved, 400),
    actionTaken: trimField(input.actionTaken, 2000),
    photoUrls,
    photoNotes: normalizeComplaintPhotoNotes(photoUrls, input.photoNotes),
  };
}

export function parseComplaintPayload(raw: string | null | undefined): CustomerComplaintPayload | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const rec = v as Record<string, unknown>;
    if (rec.kind !== CUSTOMER_COMPLAINT_KIND) return null;
    const description = trimField(rec.description, 4000);
    if (!description) return null;
    return encodeComplaintPayload({
      complainantName: String(rec.complainantName ?? ''),
      phone: String(rec.phone ?? ''),
      orderNumber: String(rec.orderNumber ?? ''),
      types: Array.isArray(rec.types) ? rec.types.map((x) => String(x)) : [],
      description,
      staffInvolved: String(rec.staffInvolved ?? ''),
      actionTaken: String(rec.actionTaken ?? ''),
      photoUrls: Array.isArray(rec.photoUrls) ? rec.photoUrls.map((x) => String(x)) : [],
      photoNotes: rec.photoNotes && typeof rec.photoNotes === 'object' ? (rec.photoNotes as Record<string, string>) : {},
    });
  } catch {
    return null;
  }
}

export function isCustomerComplaintReport(item: { category?: string; photosJson?: string }): boolean {
  if (item.category === CUSTOMER_COMPLAINT_KIND) return true;
  return Boolean(item.photosJson && parseComplaintPayload(item.photosJson));
}

export function complaintComments(payload: CustomerComplaintPayload): string {
  const typeBit = payload.types.length ? payload.types.join(', ') : 'complaint';
  return `${typeBit} · ${payload.description}`.slice(0, 4000);
}

export function complaintSeverity(payload: CustomerComplaintPayload): 'medium' | 'high' {
  return payload.types.includes('food_quality') ? 'high' : 'medium';
}

export function complaintTypeTitle(id: ComplaintTypeId, locale: string): string {
  const row = COMPLAINT_TYPES.find((t) => t.id === id);
  if (!row) return id;
  return locale === 'ar' ? row.titleAr : row.titleEn;
}

export function complaintPhotoNote(payload: CustomerComplaintPayload, url: string): string {
  return payload.photoNotes[url] ?? '';
}

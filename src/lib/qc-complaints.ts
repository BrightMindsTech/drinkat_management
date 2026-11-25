import { canonicalUploadPath } from '@/lib/upload-path';

export const CUSTOMER_COMPLAINT_KIND = 'customer_complaint';
export const CUSTOMER_COMPLAINT_VERSION = 2;
export const COMPLAINT_SLOT_NOTE_MAX = 2000;
export const COMPLAINT_ADDITIONAL_MAX = 4000;

export const COMPLAINT_SLOTS_MAX = 20;
export const COMPLAINT_CHANNELS = [
  { id: 'talabat', startSlots: 3, titleEn: 'Talabat', titleAr: 'طلبات' },
  { id: 'careem', startSlots: 2, titleEn: 'Careem', titleAr: 'كريم' },
] as const;

export type ComplaintChannelId = (typeof COMPLAINT_CHANNELS)[number]['id'];

export type ComplaintSlot = {
  note: string;
  photoUrl: string | null;
};

export type CustomerComplaintPayload = {
  kind: typeof CUSTOMER_COMPLAINT_KIND;
  v: number;
  talabat: ComplaintSlot[];
  careem: ComplaintSlot[];
  additionalNotes: string;
  description: string;
};

function trimField(v: unknown, max: number): string {
  return String(v ?? '')
    .trim()
    .slice(0, max);
}

function normalizeSlot(raw: unknown, keepSignature: boolean): ComplaintSlot {
  const rec = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const full = trimField(rec.photoUrl, 2000).split('#')[0] ?? '';
  const photo = keepSignature ? full : canonicalUploadPath(full);
  return {
    note: trimField(rec.note, COMPLAINT_SLOT_NOTE_MAX),
    photoUrl: photo.length > 3 ? photo : null,
  };
}

function slotHasContent(slot: ComplaintSlot): boolean {
  return Boolean(slot.note || slot.photoUrl);
}

function normalizeSlots(raw: unknown, keepSignature: boolean): ComplaintSlot[] {
  const arr = Array.isArray(raw) ? raw : [];
  const slots = arr.slice(0, COMPLAINT_SLOTS_MAX).map((row) => normalizeSlot(row, keepSignature));
  while (slots.length && !slotHasContent(slots[slots.length - 1]!)) slots.pop();
  return slots;
}

export function listComplaintPhotos(payload: CustomerComplaintPayload): string[] {
  const out: string[] = [];
  for (const slot of [...payload.talabat, ...payload.careem]) {
    if (slot.photoUrl && !out.includes(slot.photoUrl)) out.push(slot.photoUrl);
  }
  return out;
}

export function complaintFilledSlots(payload: CustomerComplaintPayload): { channel: ComplaintChannelId; n: number; slot: ComplaintSlot }[] {
  const out: { channel: ComplaintChannelId; n: number; slot: ComplaintSlot }[] = [];
  payload.talabat.forEach((slot, i) => {
    if (slotHasContent(slot)) out.push({ channel: 'talabat', n: i + 1, slot });
  });
  payload.careem.forEach((slot, i) => {
    if (slotHasContent(slot)) out.push({ channel: 'careem', n: i + 1, slot });
  });
  return out;
}

export function complaintHasContent(payload: CustomerComplaintPayload): boolean {
  return Boolean(payload.additionalNotes || complaintFilledSlots(payload).length);
}

export function complaintComments(payload: CustomerComplaintPayload): string {
  const bits = complaintFilledSlots(payload).map((row) => row.slot.note).filter(Boolean);
  if (payload.additionalNotes) bits.push(payload.additionalNotes);
  return (bits.join(' · ') || 'Complaints').slice(0, 4000);
}

export function complaintSeverity(_payload: CustomerComplaintPayload): 'medium' {
  return 'medium';
}

export function encodeComplaintPayload(input: {
  talabat?: unknown;
  careem?: unknown;
  additionalNotes?: string;
  description?: string;
  complainantName?: string;
  phone?: string;
  orderNumber?: string;
  types?: string[];
  staffInvolved?: string;
  actionTaken?: string;
  photoUrls?: unknown;
  photoNotes?: Record<string, string>;
}): CustomerComplaintPayload {
  let talabat = normalizeSlots(input.talabat, false);
  const careem = normalizeSlots(input.careem, false);
  const additionalNotes = trimField(input.additionalNotes ?? input.description, COMPLAINT_ADDITIONAL_MAX);

  const legacyPhotos = Array.isArray(input.photoUrls)
    ? input.photoUrls
        .map((item) => canonicalUploadPath(String(item ?? '').trim()) || String(item ?? '').trim())
        .filter((s) => s.length > 3)
    : [];
  if (legacyPhotos.length && !talabat.some((s) => s.photoUrl) && !careem.some((s) => s.photoUrl)) {
    const needed = Math.min(COMPLAINT_SLOTS_MAX, Math.max(talabat.length, legacyPhotos.length));
    talabat = Array.from({ length: needed }, (_, i) => ({
      note: talabat[i]?.note ?? '',
      photoUrl: talabat[i]?.photoUrl ?? legacyPhotos[i] ?? null,
    }));
  }

  const description = complaintComments({
    kind: CUSTOMER_COMPLAINT_KIND,
    v: CUSTOMER_COMPLAINT_VERSION,
    talabat,
    careem,
    additionalNotes,
    description: '',
  });
  return {
    kind: CUSTOMER_COMPLAINT_KIND,
    v: CUSTOMER_COMPLAINT_VERSION,
    talabat,
    careem,
    additionalNotes,
    description,
  };
}

function overlaySignedPhotos(stored: ComplaintSlot[], signed: ComplaintSlot[]): ComplaintSlot[] {
  return stored.map((slot, i) => {
    const src = signed[i]?.photoUrl;
    if (src && src.includes('?u=')) return { ...slot, photoUrl: src };
    return slot;
  });
}

export function parseComplaintPayload(raw: string | null | undefined): CustomerComplaintPayload | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const rec = v as Record<string, unknown>;
    if (rec.kind !== CUSTOMER_COMPLAINT_KIND) return null;
    const payload = encodeComplaintPayload(rec);
    if (!complaintHasContent(payload)) return null;
    let talabat = overlaySignedPhotos(payload.talabat, normalizeSlots(rec.talabat, true));
    const careem = overlaySignedPhotos(payload.careem, normalizeSlots(rec.careem, true));
    if (Array.isArray(rec.photoUrls)) {
      const signedLegacy = rec.photoUrls
        .map((item) => String(item ?? '').trim().split('#')[0] ?? '')
        .filter((s) => s.includes('?u='));
      if (signedLegacy.length) {
        talabat = talabat.map((slot, i) =>
          signedLegacy[i] ? { ...slot, photoUrl: signedLegacy[i]! } : slot
        );
      }
    }
    return { ...payload, talabat, careem };
  } catch {
    return null;
  }
}

export function isCustomerComplaintReport(item: { category?: string; photosJson?: string }): boolean {
  if (item.category === CUSTOMER_COMPLAINT_KIND) return true;
  return Boolean(item.photosJson && parseComplaintPayload(item.photosJson));
}

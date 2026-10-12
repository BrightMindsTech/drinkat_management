export const PHOTO_DEFAULT_MIN_PHOTOS = 1;
export const PHOTO_DEFAULT_MAX_PHOTOS = 3;
export const PHOTO_360_CODE = 'branch_cleanliness_360';
export const PHOTO_360_MIN_PHOTOS = 1;
export const PHOTO_360_MAX_PHOTOS = 3;
export const PHOTO_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

export function normalizeSubmissionUploadPaths(input: {
  uploadPath?: string;
  uploadPaths?: unknown;
}): string[] {
  const extra = Array.isArray(input.uploadPaths) ? input.uploadPaths : [];
  const raw = [...extra, ...(input.uploadPath ? [input.uploadPath] : [])];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const s = String(item ?? '').trim();
    if (s.length < 4) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function clampPhotoLimits(minPhotos: number, maxPhotos: number): { min: number; max: number } {
  const max = Math.min(PHOTO_DEFAULT_MAX_PHOTOS, Math.max(1, Math.floor(maxPhotos) || PHOTO_DEFAULT_MAX_PHOTOS));
  const min = Math.min(max, Math.max(1, Math.floor(minPhotos) || PHOTO_DEFAULT_MIN_PHOTOS));
  return { min, max };
}

export function submissionUploadPaths(row: {
  uploadPath: string;
  images?: { uploadPath: string; sortOrder: number }[];
}): string[] {
  const fromRows = [...(row.images ?? [])]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((i) => i.uploadPath)
    .filter(Boolean);
  if (fromRows.length) return fromRows;
  return row.uploadPath ? [row.uploadPath] : [];
}

/** Client draft slots: replace overwrites, remove shrinks, add never exceeds max (3). */
export function applyPhotoSlotChange<T>(
  current: T[],
  nextItem: T | null,
  opts: { mode: 'add' | 'replace' | 'remove'; index?: number; max: number }
): T[] {
  const max = Math.min(PHOTO_DEFAULT_MAX_PHOTOS, Math.max(1, Math.floor(opts.max) || PHOTO_DEFAULT_MAX_PHOTOS));
  if (opts.mode === 'remove') {
    const i = opts.index ?? -1;
    if (i < 0 || i >= current.length) return current;
    return current.filter((_, idx) => idx !== i);
  }
  if (!nextItem) return current;
  if (opts.mode === 'replace') {
    const i = opts.index ?? -1;
    if (i < 0 || i >= current.length) return current;
    const copy = [...current];
    copy[i] = nextItem;
    return copy;
  }
  if (current.length >= max) return current;
  return [...current, nextItem].slice(0, max);
}

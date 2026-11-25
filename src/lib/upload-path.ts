/** Path-only helpers. Safe in the browser — no Node `crypto`. */

export function canonicalUploadPath(filePath: string): string {
  return String(filePath ?? '').trim().split('#')[0]?.split('?')[0] ?? '';
}

/** Prefer a signed `/api/uploads` URL when the same file appears twice. */
export function preferSignedUploadUrl(existing: string | undefined, next: string): string {
  const incoming = next.trim();
  if (!existing) return incoming;
  if (incoming.includes('?u=') && !existing.includes('?u=')) return incoming;
  return existing;
}

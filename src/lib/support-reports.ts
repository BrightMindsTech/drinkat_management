const MAX_SCREENSHOTS = 5;

export function parseScreenshotPaths(screenshotsJson: string | null | undefined): string[] {
  if (!screenshotsJson?.trim()) return [];
  try {
    const parsed = JSON.parse(screenshotsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is string => typeof p === 'string' && p.length > 0);
  } catch {
    return [];
  }
}

/** Only paths created by our upload flow (prevents arbitrary URL injection). */
export function isAllowedScreenshotPath(path: string): boolean {
  if (path.includes('..')) return false;
  return path.startsWith('/api/uploads/') || path.startsWith('/uploads/');
}

export function normalizeScreenshotPaths(paths: string[]): string[] {
  const out: string[] = [];
  for (const p of paths) {
    const trimmed = p.trim();
    if (!isAllowedScreenshotPath(trimmed)) continue;
    if (out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= MAX_SCREENSHOTS) break;
  }
  return out;
}

export function serializeScreenshotPaths(paths: string[]): string {
  return JSON.stringify(normalizeScreenshotPaths(paths));
}

export { MAX_SCREENSHOTS };

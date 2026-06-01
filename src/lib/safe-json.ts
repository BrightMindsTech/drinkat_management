/** Parse JSON text without crashing SSR when DB rows are empty or corrupted. */
export function safeParseJsonRecord(json: string | null | undefined): Record<string, string> {
  const trimmed = json?.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

export function safeParseJsonUnknown(json: string | null | undefined): Record<string, unknown> {
  const trimmed = json?.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

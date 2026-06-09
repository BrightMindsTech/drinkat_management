/** Turn API JSON errors (string, Zod flatten, field errors) into user-visible text. */
export function parseApiErrorPayload(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const row = data as Record<string, unknown>;
  if (typeof row.error === 'string' && row.error.trim()) return row.error;
  if (typeof row.message === 'string' && row.message.trim()) return row.message;
  const formErrors = row.formErrors;
  if (Array.isArray(formErrors) && formErrors.length > 0) {
    return formErrors.map(String).join('; ');
  }
  const fieldErrors = row.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object') {
    const parts: string[] = [];
    for (const [key, vals] of Object.entries(fieldErrors as Record<string, unknown>)) {
      if (Array.isArray(vals) && vals.length > 0) parts.push(`${key}: ${vals.map(String).join(', ')}`);
    }
    if (parts.length > 0) return parts.join('; ');
  }
  return fallback;
}

import { z } from 'zod';

/** Show this field only when another field's current value matches. */
export const formFieldShowIfSchema = z.object({
  key: z.string().min(1),
  in: z.array(z.string()).optional(),
  eq: z.string().optional(),
});

export const formFieldDefSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_]+$/i, 'keys: letters, numbers, underscore'),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'number', 'date', 'checkbox', 'select', 'photo']),
  required: z.boolean().optional(),
  options: z.array(z.string().min(1)).optional(),
  /** Optional stepper section label (guided inspections). */
  section: z.string().min(1).optional(),
  showIf: formFieldShowIfSchema.optional(),
  /** Answer-weighted KPI quality. Zero-weight answers are excluded. */
  weight: z.number().nonnegative().optional(),
  /** Values that count as a pass (select/checkbox/text). */
  passValues: z.array(z.string()).optional(),
  failValues: z.array(z.string()).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  /** Failed visible answers that require photo evidence. */
  requiredEvidence: z.boolean().optional(),
});

export const formTemplateFieldsSchema = z.array(formFieldDefSchema);

export type FormFieldDef = z.infer<typeof formFieldDefSchema>;

function answerAsString(raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'boolean') return raw ? 'true' : 'false';
  return String(raw);
}

export function isFieldVisible(field: FormFieldDef, answers: Record<string, unknown>): boolean {
  const rule = field.showIf;
  if (!rule) return true;
  const value = answerAsString(answers[rule.key]);
  if (rule.in && rule.in.length > 0) return rule.in.includes(value);
  if (rule.eq !== undefined) return value === rule.eq;
  return true;
}

export function parseTemplateFields(json: string): FormFieldDef[] {
  const trimmed = json?.trim();
  if (!trimmed) return [];
  try {
    const raw = JSON.parse(trimmed) as unknown;
    return formTemplateFieldsSchema.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Server-side answer validation.
 * Hidden conditional fields are skipped (not required, not stored as missing).
 */
export function validateAnswersAgainstFields(
  fields: FormFieldDef[],
  answers: Record<string, unknown>
): Record<string, string> {
  if (fields.length === 0) return {};
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (!isFieldVisible(f, answers)) continue;
    const raw = answers[f.key];
    const missing = raw === undefined || raw === null || raw === '';
    if (f.required && missing && f.type !== 'checkbox') {
      throw new Error(`Missing: ${f.label}`);
    }
    if (f.type === 'checkbox') {
      const v = raw === true || raw === 'true' || raw === 'on' || raw === 1 || raw === '1';
      out[f.key] = v ? 'true' : 'false';
      if (f.required && !v) throw new Error(`Required: ${f.label}`);
      continue;
    }
    if (missing) continue;
    if (f.type === 'number') {
      const n = typeof raw === 'number' ? raw : Number(String(raw));
      if (Number.isNaN(n)) throw new Error(`Invalid number: ${f.label}`);
      out[f.key] = String(n);
      continue;
    }
    if (f.type === 'select') {
      const s = String(raw);
      if (f.options && !f.options.includes(s)) throw new Error(`Invalid option: ${f.label}`);
      out[f.key] = s;
      continue;
    }
    out[f.key] = String(raw);
  }
  for (const f of fields) {
    if (!isFieldVisible(f, answers) || !f.requiredEvidence) continue;
    const value = out[f.key] ?? '';
    if (!answerFailsField(f, value)) continue;
    if (f.type === 'photo' && value) continue;
    const evidence = answerAsString(answers[`${f.key}_photo`] || answers[`${f.key}_evidence`]);
    if (!evidence) throw new Error(`Missing evidence: ${f.label}`);
    if (!out[`${f.key}_photo`] && evidence) out[`${f.key}_photo`] = evidence;
  }
  return out;
}

export function answerFailsField(field: FormFieldDef, value: string): boolean {
  if (field.failValues && field.failValues.length > 0) {
    return field.failValues.includes(value);
  }
  if (field.passValues && field.passValues.length > 0) {
    return !field.passValues.includes(value);
  }
  if (field.type === 'checkbox') return value !== 'true';
  if (field.type === 'select' && (field.options ?? []).includes('no')) {
    return value === 'no' || value === 'fail';
  }
  return false;
}

export function uniqueSections(fields: FormFieldDef[]): string[] {
  const out: string[] = [];
  for (const f of fields) {
    const s = f.section ?? 'General';
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

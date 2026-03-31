import { z } from 'zod';

export const formFieldDefSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_]+$/i, 'keys: letters, numbers, underscore'),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'number', 'date', 'checkbox', 'select', 'photo']),
  required: z.boolean().optional(),
  options: z.array(z.string().min(1)).optional(),
});

export const formTemplateFieldsSchema = z.array(formFieldDefSchema);

export type FormFieldDef = z.infer<typeof formFieldDefSchema>;

export function parseTemplateFields(json: string): FormFieldDef[] {
  const raw = JSON.parse(json) as unknown;
  return formTemplateFieldsSchema.parse(raw);
}

export function validateAnswersAgainstFields(
  fields: FormFieldDef[],
  answers: Record<string, unknown>
): Record<string, string> {
  if (fields.length === 0) return {};
  const out: Record<string, string> = {};
  for (const f of fields) {
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
  return out;
}

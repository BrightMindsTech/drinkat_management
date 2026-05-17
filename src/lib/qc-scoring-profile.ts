import type { FormFieldDef } from '@/lib/formTemplate';

export type QcScoringProfile = 'standard' | 'no-kitchen';

/** Field keys used only for kitchen scoring (standard profile). */
export const QC_KITCHEN_SCORING_KEYS = [
  'kitchen_fridge_temp_ok',
  'kitchen_clean',
  'food_storage_ok',
  'expiry_labels_ok',
] as const;

export function templateHasKitchenScoringFields(fields: FormFieldDef[]): boolean {
  const keys = new Set(fields.map((f) => f.key));
  return QC_KITCHEN_SCORING_KEYS.some((k) => keys.has(k));
}

export function resolveQcScoringProfile(input: {
  title?: string;
  fields?: FormFieldDef[];
}): QcScoringProfile {
  const title = input.title?.trim() ?? '';
  if (/\bHU\b/i.test(title) || /no kitchen/i.test(title)) {
    return 'no-kitchen';
  }
  if (input.fields?.length && !templateHasKitchenScoringFields(input.fields)) {
    return 'no-kitchen';
  }
  return 'standard';
}

/** Fallback when template metadata is unavailable (e.g. legacy report rows). */
export function inferQcScoringProfileFromAnswers(
  answers: Record<string, string>
): QcScoringProfile | null {
  const hasKitchenKey = QC_KITCHEN_SCORING_KEYS.some((k) => k in answers);
  if (!hasKitchenKey && 'customer_service_rating' in answers && 'team_uniform_hygiene_ok' in answers) {
    return 'no-kitchen';
  }
  if (hasKitchenKey) return 'standard';
  return null;
}

export function resolveQcScoringProfileForSubmission(input: {
  title?: string;
  fields?: FormFieldDef[];
  answers: Record<string, string>;
}): QcScoringProfile {
  const fromTemplate = resolveQcScoringProfile({ title: input.title, fields: input.fields });
  if (fromTemplate === 'no-kitchen') return 'no-kitchen';
  if (input.fields?.length) return fromTemplate;
  return inferQcScoringProfileFromAnswers(input.answers) ?? fromTemplate;
}

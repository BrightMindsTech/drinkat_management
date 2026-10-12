import { z } from 'zod';

export const photoQcSuggestionSchema = z.object({
  unassessable: z.boolean().optional().default(false),
  imageClarity: z.enum(['good', 'poor', 'unusable']).catch('poor'),
  criteria: z
    .array(
      z.object({
        key: z.string(),
        met: z.boolean().nullable(),
        note: z.string().optional(),
      })
    )
    .default([]),
  explanation: z
    .string()
    .optional()
    .transform((s) => (s && s.trim() ? s.trim() : 'No explanation returned.')),
  cannotAssess: z.array(z.string()).default([]),
  humanMustConfirm: z
    .union([z.literal(true), z.boolean()])
    .optional()
    .transform(() => true as const),
});

export const productRefSuggestionSchema = z.object({
  visibleDifferences: z.array(z.string()),
  presentationObservations: z.array(z.string()),
  suggestedCompliance: z.enum(['meets', 'does_not_meet', 'uncertain']),
  uncertainty: z.string(),
  recommendHumanReview: z.literal(true),
});

export const dailyBriefSuggestionSchema = z.object({
  summary: z.union([z.string(), z.record(z.unknown())]).transform((v) =>
    typeof v === 'string' ? v : JSON.stringify(v)
  ),
  priorityActions: z.array(z.string()).default([]),
  usedOnlySuppliedFacts: z.literal(true).or(z.boolean()),
});

export const coachingSuggestionSchema = z.object({
  recommendations: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
  inventedFailures: z.literal(false),
});

export const sopSuggestionSchema = z.object({
  answer: z.string(),
  sources: z.array(z.string()),
  grounded: z.boolean(),
  uncertain: z.boolean(),
});

export type PhotoQcSuggestion = z.infer<typeof photoQcSuggestionSchema>;
export type ProductRefSuggestion = z.infer<typeof productRefSuggestionSchema>;
export type DailyBriefSuggestion = z.infer<typeof dailyBriefSuggestionSchema>;
export type CoachingSuggestion = z.infer<typeof coachingSuggestionSchema>;

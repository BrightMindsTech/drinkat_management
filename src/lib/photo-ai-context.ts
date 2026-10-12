import { FDA_FOOD_CODE_2026, FDA_FOOD_CODE_2026_INDEX } from '@/lib/fda-food-code-2026';
import { retrieveApprovedSops } from '@/lib/ai-sop';
import type { PrismaClient } from '@prisma/client';

const TYPE_KEYWORDS: Record<string, string[]> = {
  coffee_machine_calibration: ['equipment', 'clean'],
  slush_machine_cleaning: ['clean', 'equipment', 'food-contact'],
  floor_cleaning: ['clean', 'floor'],
  fruit_refrigerator_cleaning: ['clean', 'refrigerat', 'cold'],
  refrigerator_temperature_check: ['thermometer', 'temperature measuring', 'refrigerat'],
  branch_cleanliness_360: ['clean'],
  espresso_machine_cleaning: ['clean', 'equipment', 'food-contact'],
  bar_surface_cleaning: ['clean', 'food-contact'],
  sink_cleanliness: ['handwashing sink', 'sink', 'clean'],
  ventilation_extractor_cleaning: ['clean', 'equipment'],
  shelves_cabinets_cleaning: ['clean', 'storage'],
  table_cleaning: ['clean'],
  espresso_shot_weight: ['equipment'],
  portafilter_coffee_dose: ['equipment'],
  espresso_temperature: ['thermometer'],
  water_quality_tds: ['water'],
  fryer_cleanliness: ['clean', 'equipment', 'food-contact'],
  preparation_refrigerator: ['refrigerat', 'cold', 'clean'],
  grill_cleanliness: ['clean', 'equipment', 'food-contact'],
  food_handover_area: ['clean'],
  trays_serving_equipment: ['clean', 'food-contact', 'equipment'],
};

export async function photoAiContext(
  prisma: PrismaClient,
  opts: { code: string; titleEn: string; locale?: string }
) {
  const keys = TYPE_KEYWORDS[opts.code] ?? ['clean'];
  const fdaHints = FDA_FOOD_CODE_2026_INDEX.filter((c) =>
    keys.some((k) => c.keywords.some((kw) => kw.toLowerCase().includes(k) || k.includes(kw.toLowerCase())))
  )
    .slice(0, 3)
    .map((c) => ({
      section: c.section,
      title: c.title,
      summary: c.summary,
      legalNote: FDA_FOOD_CODE_2026.legalNote,
    }));

  let sopExcerpts: { title: string; sourceRef: string; excerpt: string }[] = [];
  try {
    const retrieved = await retrieveApprovedSops(prisma, opts.titleEn, opts.locale ?? 'en');
    sopExcerpts = retrieved.refuse ? [] : retrieved.passages.slice(0, 4);
  } catch {
    sopExcerpts = [];
  }

  return { fdaHints, sopExcerpts };
}

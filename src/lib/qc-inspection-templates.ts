import type { FormFieldDef } from '@/lib/formTemplate';
import { QC_INSPECTION_DOMAIN_LABELS, type QcInspectionDomain } from '@/lib/qc-domains';

function yn(
  key: string,
  label: string,
  section: string,
  opts: Partial<FormFieldDef> = {}
): FormFieldDef[] {
  const severity = opts.severity ?? 'medium';
  const weight = opts.weight ?? 1;
  const requiredEvidence = opts.requiredEvidence ?? true;
  return [
    {
      key,
      label,
      type: 'select',
      required: true,
      options: ['pass', 'fail'],
      passValues: ['pass'],
      failValues: ['fail'],
      severity,
      weight,
      requiredEvidence,
      section,
    },
    {
      key: `${key}_photo`,
      label: `${label} evidence`,
      type: 'photo',
      required: false,
      showIf: { key, in: ['fail'] },
      section,
    },
  ];
}

export const QC_DOMAIN_TEMPLATE_FIELDS: Record<QcInspectionDomain, FormFieldDef[]> = {
  barista_qc: [
    ...yn('station_ready', 'Bar station ready and stocked', 'Opening', { severity: 'medium', weight: 2 }),
    ...yn('recipe_followed', 'Drink built to recipe', 'Product', { severity: 'high', weight: 3 }),
    {
      key: 'milk_texture',
      label: 'Milk texture acceptable',
      type: 'select',
      required: true,
      options: ['pass', 'fail'],
      passValues: ['pass'],
      failValues: ['fail'],
      severity: 'medium',
      weight: 2,
      requiredEvidence: true,
      section: 'Product',
    },
    {
      key: 'milk_texture_photo',
      label: 'Milk texture evidence',
      type: 'photo',
      required: false,
      showIf: { key: 'milk_texture', in: ['fail'] },
      section: 'Product',
    },
    ...yn('closing_clean', 'Bar closed and cleaned', 'Closing', { severity: 'medium', weight: 2 }),
  ],
  kitchen_qc: [
    ...yn('prep_ready', 'Prep list complete', 'Opening', { severity: 'medium', weight: 2 }),
    ...yn('cook_temp_logged', 'Cook temperature logged (visible log only)', 'Cook', {
      severity: 'high',
      weight: 3,
    }),
    ...yn('plating_standard', 'Plating matches standard', 'Product', { severity: 'medium', weight: 2 }),
    ...yn('kitchen_close', 'Kitchen closing complete', 'Closing', { severity: 'medium', weight: 2 }),
  ],
  food_safety: [
    ...yn('handwash_stocked', 'Handwash station stocked', 'Hygiene', { severity: 'critical', weight: 3 }),
    ...yn('cold_hold_visible', 'Cold-hold items look correctly stored (visual only)', 'Storage', {
      severity: 'high',
      weight: 3,
    }),
    ...yn('allergen_labels', 'Allergen labels present', 'Labeling', { severity: 'high', weight: 3 }),
    ...yn('waste_separated', 'Waste separated correctly', 'Hygiene', { severity: 'medium', weight: 1 }),
  ],
  product_quality: [
    ...yn('drink_appearance', 'Drink appearance matches reference', 'Drinks', { severity: 'high', weight: 3 }),
    ...yn('food_appearance', 'Food appearance matches reference', 'Food', { severity: 'high', weight: 3 }),
    ...yn('portion_consistent', 'Portion looks consistent', 'Consistency', { severity: 'medium', weight: 2 }),
  ],
  equipment: [
    ...yn('espresso_ready', 'Espresso machine ready', 'Bar', { severity: 'high', weight: 2 }),
    ...yn('fridge_running', 'Refrigeration running (visual/audible only)', 'Cold', {
      severity: 'critical',
      weight: 3,
    }),
    ...yn('fault_reported', 'Known faults reported', 'Maintenance', {
      severity: 'medium',
      weight: 1,
      requiredEvidence: false,
    }),
  ],
  cleaning: [
    ...yn('floors_clean', 'Floors clean', 'Front', { severity: 'medium', weight: 2 }),
    ...yn('restrooms_ok', 'Restrooms acceptable', 'Front', { severity: 'high', weight: 2 }),
    ...yn('back_sanitized', 'Back area sanitized', 'Back', { severity: 'high', weight: 3 }),
    ...yn('bins_emptied', 'Bins emptied', 'Closing', { severity: 'low', weight: 1 }),
  ],
  brand_standards: [
    ...yn('uniform_ok', 'Uniform and grooming meet standard', 'People', { severity: 'medium', weight: 2 }),
    ...yn('menu_boards', 'Menu boards current', 'Guest', { severity: 'low', weight: 1 }),
    ...yn('music_temp_feel', 'Guest area presentation acceptable', 'Guest', { severity: 'low', weight: 1 }),
  ],
};

export function qcDomainTemplateTitle(domain: QcInspectionDomain, locale: 'en' | 'ar' = 'en'): string {
  return QC_INSPECTION_DOMAIN_LABELS[domain][locale];
}

export const QC_WINDOW_TEMPLATES: { key: string; title: string; window: string; fields: FormFieldDef[] }[] = [
  {
    key: 'opening_checklist',
    title: 'Opening Checklist',
    window: 'opening',
    fields: [
      ...yn('doors_ready', 'Doors and lights ready', 'Opening', { severity: 'medium', weight: 1 }),
      ...yn('cash_float', 'Cash float counted', 'Opening', { severity: 'high', weight: 2 }),
      ...yn('stations_set', 'Stations set for service', 'Opening', { severity: 'medium', weight: 2 }),
    ],
  },
  {
    key: 'closing_checklist',
    title: 'Closing Checklist',
    window: 'closing',
    fields: [
      ...yn('close_cash', 'Cash closed and stored', 'Closing', { severity: 'high', weight: 2 }),
      ...yn('close_clean', 'Closing clean complete', 'Closing', { severity: 'medium', weight: 2 }),
      ...yn('alarms_set', 'Close-down / alarms checked', 'Closing', { severity: 'medium', weight: 1 }),
    ],
  },
];

/** Seven QC inspection domains. Stored on ManagementFormTemplate.category for QC templates. */

export const QC_INSPECTION_DOMAINS = [
  'barista_qc',
  'kitchen_qc',
  'food_safety',
  'product_quality',
  'equipment',
  'cleaning',
  'brand_standards',
] as const;

export type QcInspectionDomain = (typeof QC_INSPECTION_DOMAINS)[number];

const DOMAIN_SET = new Set<string>(QC_INSPECTION_DOMAINS);

export function isQcInspectionDomain(category: string | null | undefined): boolean {
  return DOMAIN_SET.has(String(category ?? ''));
}

export const QC_INSPECTION_DOMAIN_LABELS: Record<QcInspectionDomain, { en: string; ar: string }> = {
  barista_qc: { en: 'Barista QC', ar: 'مراقبة جودة الباريستا' },
  kitchen_qc: { en: 'Kitchen QC', ar: 'مراقبة جودة المطبخ' },
  food_safety: { en: 'Food Safety', ar: 'سلامة الغذاء' },
  product_quality: { en: 'Product Quality', ar: 'جودة المنتج' },
  equipment: { en: 'Equipment', ar: 'المعدات' },
  cleaning: { en: 'Cleaning', ar: 'النظافة' },
  brand_standards: { en: 'Brand Standards', ar: 'معايير العلامة' },
};

export const INSPECTION_TASK_STATUSES = [
  'scheduled',
  'due',
  'in_progress',
  'completed',
  'overdue',
  'excused',
  'cancelled',
] as const;

export type InspectionTaskStatus = (typeof INSPECTION_TASK_STATUSES)[number];

export const ISSUE_STATUSES = [
  'open',
  'acknowledged',
  'in_progress',
  'fixed',
  'reopened',
  'verified',
  'closed',
] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const RESPONSIBILITY_CLASSES = [
  'employee_error',
  'equipment',
  'supplier',
  'operational',
  'not_employee',
  'unassigned',
] as const;

export type ResponsibilityClass = (typeof RESPONSIBILITY_CLASSES)[number];

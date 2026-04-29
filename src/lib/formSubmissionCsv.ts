import type { FormFieldDef } from '@/lib/formTemplate';
import { downloadCsvWithMobileFallback } from '@/lib/client-download';

export type SubmissionReportCsvInput = {
  id: string;
  status: string;
  submittedAt: Date | string;
  reviewedAt?: Date | string | null;
  rating: number | null;
  comments: string | null;
  answers: Record<string, string>;
  template: { title: string; fields: FormFieldDef[] };
  employee: { name: string };
  branch: { name: string };
  departmentName?: string | null;
  reportsToManager?: { name: string } | null;
};

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function fieldColumnHeaders(fields: FormFieldDef[]): string[] {
  const labelCounts = new Map<string, number>();
  return fields.map((f) => {
    const base = (f.label || f.key).trim() || f.key;
    const n = (labelCounts.get(base) ?? 0) + 1;
    labelCounts.set(base, n);
    return n > 1 ? `${base} (${f.key})` : base;
  });
}

function toIso(d: Date | string | null | undefined): string {
  if (d == null) return '';
  const x = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(x.getTime()) ? '' : x.toISOString();
}

/** One submission row — matches columns used by /api/forms/templates/[id]/export */
export function buildSubmissionReportCsvRows(s: SubmissionReportCsvInput): { header: string; row: string } {
  const fields = s.template.fields;
  const coreHeaders = [
    'submission_id',
    'submitted_at_utc',
    'employee_name',
    'branch_name',
    'department_name',
    'reports_to',
    'status',
    'rating',
    'comments',
    'reviewed_at_utc',
  ];
  const fieldHeaders = fieldColumnHeaders(fields);
  const headerLine = [...coreHeaders, ...fieldHeaders].map(escapeCsvCell).join(',');

  const core = [
    s.id,
    toIso(s.submittedAt),
    s.employee.name,
    s.branch.name,
    s.departmentName ?? '',
    s.reportsToManager?.name ?? '',
    s.status,
    s.rating == null ? '' : String(s.rating),
    s.comments ?? '',
    toIso(s.reviewedAt ?? null),
  ];
  const fieldVals = fields.map((f) => {
    const v = s.answers[f.key];
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  });
  const row = [...core, ...fieldVals].map(escapeCsvCell).join(',');

  return { header: headerLine, row };
}

export async function downloadSubmissionReportCsv(s: SubmissionReportCsvInput, filenameBase: string): Promise<void> {
  const { header, row } = buildSubmissionReportCsvRows(s);
  const csvBody = `${header}\r\n${row}\r\n`;
  const safe = filenameBase.replace(/[/\\?%*:|"<>]/g, '-').trim().slice(0, 100) || 'submission';
  const day = new Date().toISOString().slice(0, 10);
  const filename = `${safe}-report-${day}.csv`;
  await downloadCsvWithMobileFallback(filename, csvBody);
}

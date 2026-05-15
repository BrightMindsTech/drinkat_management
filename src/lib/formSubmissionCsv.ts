import type { FormFieldDef } from '@/lib/formTemplate';
import type { ReportTableData } from '@/lib/report-table';

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

function fieldColumnHeaders(fields: FormFieldDef[]): string[] {
  const labelCounts = new Map<string, number>();
  return fields.map((f) => {
    const base = (f.label || f.key).trim() || f.key;
    const n = (labelCounts.get(base) ?? 0) + 1;
    labelCounts.set(base, n);
    return n > 1 ? `${base} (${f.key})` : base;
  });
}

function formatDate(d: Date | string | null | undefined): string {
  if (d == null) return '—';
  const x = typeof d === 'string' ? new Date(d) : d;
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleString();
}

function formatAnswer(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Build a two-column table (field / value) for screenshot-friendly submission reports. */
export function buildSubmissionReportTable(
  s: SubmissionReportCsvInput,
  labels?: { field: string; value: string }
): ReportTableData {
  const fieldHeaders = fieldColumnHeaders(s.template.fields);
  const rows: string[][] = [
    ['Submission ID', s.id],
    ['Submitted', formatDate(s.submittedAt)],
    ['Employee', s.employee.name],
    ['Branch', s.branch.name],
    ['Department', s.departmentName?.trim() || '—'],
    ['Reports to', s.reportsToManager?.name ?? '—'],
    ['Status', s.status],
    ['Rating', s.rating == null ? '—' : String(s.rating)],
    ['Comments', s.comments?.trim() || '—'],
    ['Reviewed', formatDate(s.reviewedAt ?? null)],
  ];

  s.template.fields.forEach((f, i) => {
    rows.push([fieldHeaders[i] ?? f.key, formatAnswer(s.answers[f.key])]);
  });

  return {
    title: s.template.title,
    subtitle: `${s.employee.name} · ${s.branch.name}`,
    headers: [labels?.field ?? 'Field', labels?.value ?? 'Value'],
    rows,
  };
}

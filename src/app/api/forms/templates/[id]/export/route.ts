import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { parseTemplateFields, type FormFieldDef } from '@/lib/formTemplate';

const EXPORT_LIMIT = 10_000;

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

function buildDispositionFilename(title: string): { ascii: string; star: string } {
  const day = new Date().toISOString().slice(0, 10);
  const base = `${title.replace(/[/\\?%*:|"<>]/g, '-').trim().slice(0, 72) || 'form'}-reports-${day}.csv`;
  const ascii = base.replace(/[^\x20-\x7E]/g, '_') || `form-export-${day}.csv`;
  const star = encodeURIComponent(base);
  return { ascii, star };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role !== 'owner' && role !== 'manager') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: templateId } = await params;
  const template = await prisma.managementFormTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!template.active && role !== 'owner') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  let fields: FormFieldDef[];
  try {
    fields = parseTemplateFields(template.fieldsJson);
  } catch {
    return Response.json({ error: 'Invalid template' }, { status: 500 });
  }

  const whereBase = { templateId };
  let list;

  if (role === 'owner') {
    list = await prisma.managementFormSubmission.findMany({
      where: whereBase,
      include: {
        employee: {
          include: { branch: true, department: true, reportsToEmployee: { select: { name: true } } },
        },
        branch: true,
      },
      orderBy: { submittedAt: 'asc' },
      take: EXPORT_LIMIT,
    });
  } else {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: true },
    });
    if (!user?.employee) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const mgr = user.employee;
    list = await prisma.managementFormSubmission.findMany({
      where: {
        ...whereBase,
        branchId: mgr.branchId,
        employee: { reportsToEmployeeId: mgr.id, branchId: mgr.branchId },
      },
      include: {
        employee: {
          include: { branch: true, department: true, reportsToEmployee: { select: { name: true } } },
        },
        branch: true,
      },
      orderBy: { submittedAt: 'asc' },
      take: EXPORT_LIMIT,
    });
  }

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

  const lines = [headerLine];
  for (const s of list) {
    let answers: Record<string, string> = {};
    try {
      answers = JSON.parse(s.answersJson) as Record<string, string>;
    } catch {
      /* keep empty row for malformed legacy rows */
    }
    const core = [
      s.id,
      s.submittedAt.toISOString(),
      s.employee.name,
      s.branch.name,
      s.employee.department?.name ?? '',
      s.employee.reportsToEmployee?.name ?? '',
      s.status,
      s.rating == null ? '' : String(s.rating),
      s.comments ?? '',
      s.reviewedAt ? s.reviewedAt.toISOString() : '',
    ];
    const fieldVals = fields.map((f) => answers[f.key] ?? '');
    lines.push([...core, ...fieldVals].map(escapeCsvCell).join(','));
  }

  const csvBody = lines.join('\r\n');
  const bom = '\uFEFF';
  const { ascii, star } = buildDispositionFilename(template.title);

  return new Response(bom + csvBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${star}`,
      'X-Submission-Count': String(list.length),
    },
  });
}

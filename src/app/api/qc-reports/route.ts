import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability, requireQcReportsInbox } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { dataScopeForRole, normalizeUserRole } from '@/lib/permissions';
import { notifyUsers } from '@/lib/user-notify';
import {
  listQcNotifyPeople,
  qcReportNotifyOptions,
  resolveBranchInspectionRecipients,
  resolveQcReportRecipients,
} from '@/lib/qc-field-reports';
import {
  BRANCH_INSPECTION_KIND,
  countInspectionResults,
  encodeInspectionPayload,
  inspectionComments,
  inspectionSeverity,
  validateInspectionAnswers,
} from '@/lib/qc-branch-inspection';
import { z } from 'zod';

const noteSchema = z.object({
  kind: z.literal('note').optional(),
  branchId: z.string(),
  comments: z.string().min(1).max(4000),
  photoUrls: z.array(z.string()).max(3).default([]),
  category: z.string().min(1).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  notifyTo: z.string().min(1).max(80).optional(),
});

const inspectionSchema = z.object({
  kind: z.literal('branch_inspection'),
  branchId: z.string(),
  notes: z.string().max(4000).optional().default(''),
  answers: z.record(
    z.object({
      result: z.enum(['pass', 'fail']),
      photoUrl: z.string().max(2000).optional().nullable(),
    })
  ),
});

export const GET = withApiErrors(async function GET() {
  const session = await requireQcReportsInbox();
  const role = normalizeUserRole(session.user.role);
  const scope = dataScopeForRole(role);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  const where =
    scope === 'organization' || user?.qcReportsInbox
      ? {}
      : scope === 'branch' && user?.employee?.branchId
        ? { branchId: user.employee.branchId }
        : { id: '__none__' };
  const items = await prisma.qcFieldReport.findMany({
    where,
    include: {
      createdBy: { select: { email: true, employee: { select: { name: true } } } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 120,
  });
  const branches = await prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  const notifyPeople = await listQcNotifyPeople(prisma);
  return Response.json({ items, branches, notifyOptions: qcReportNotifyOptions(notifyPeople) });
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const session = await requireCapability('qc:review');
  const actorRole = normalizeUserRole(session.user.role);
  if (actorRole !== 'owner' && actorRole !== 'qc') {
    return Response.json({ error: 'Only QC or Owner can submit field reports' }, { status: 403 });
  }
  const body = (await req.json()) as { kind?: unknown };
  if (body?.kind === BRANCH_INSPECTION_KIND) {
    return postInspection(session.user.id, body);
  }
  return postNote(session.user.id, body);
});

async function postNote(userId: string, body: unknown) {
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'branch and comments required' }, { status: 400 });
  const branch = await prisma.branch.findUnique({ where: { id: parsed.data.branchId } });
  if (!branch) return Response.json({ error: 'Branch not found' }, { status: 404 });
  const item = await prisma.qcFieldReport.create({
    data: {
      createdById: userId,
      branchId: parsed.data.branchId,
      category: parsed.data.category?.trim() || 'observation',
      severity: parsed.data.severity ?? 'medium',
      comments: parsed.data.comments,
      photosJson: JSON.stringify(parsed.data.photoUrls),
    },
  });

  const ids = await resolveQcReportRecipients(prisma, userId, parsed.data.notifyTo ?? 'all');
  const pushTitle = `QC report · ${branch.name}`;
  const pushBody = parsed.data.comments.slice(0, 140);
  if (ids.length) {
    await notifyUsers(prisma, ids, {
      category: 'qc_field_report',
      title: pushTitle,
      body: pushBody,
      dataJson: JSON.stringify({ type: 'qc_field_report', reportId: item.id, url: '/dashboard/qc-reports' }),
      push: {
        title: pushTitle,
        body: pushBody,
        data: { type: 'qc_field_report', url: '/dashboard/qc-reports', reportId: item.id },
      },
    });
  }
  return Response.json({ item });
}

async function postInspection(userId: string, body: unknown) {
  const parsed = inspectionSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Answer every checklist item' }, { status: 400 });
  const checked = validateInspectionAnswers(parsed.data.answers);
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 });
  const branch = await prisma.branch.findUnique({ where: { id: parsed.data.branchId } });
  if (!branch) return Response.json({ error: 'Branch not found' }, { status: 404 });
  const { pass, fail } = countInspectionResults(checked.answers);
  const notes = parsed.data.notes ?? '';
  const item = await prisma.qcFieldReport.create({
    data: {
      createdById: userId,
      branchId: parsed.data.branchId,
      category: BRANCH_INSPECTION_KIND,
      severity: inspectionSeverity(fail),
      comments: inspectionComments(pass, fail, notes),
      photosJson: JSON.stringify(encodeInspectionPayload(checked.answers, notes)),
    },
  });

  const ids = await resolveBranchInspectionRecipients(prisma, userId, parsed.data.branchId);
  const pushTitle = `Branch inspection · ${branch.name}`;
  const pushBody = `${fail} fail · ${pass} pass${notes.trim() ? ` · ${notes.trim().slice(0, 80)}` : ''}`;
  if (ids.length) {
    await notifyUsers(prisma, ids, {
      category: 'qc_field_report',
      title: pushTitle,
      body: pushBody,
      dataJson: JSON.stringify({ type: 'qc_field_report', reportId: item.id, url: '/dashboard/qc-reports' }),
      push: {
        title: pushTitle,
        body: pushBody,
        data: { type: 'qc_field_report', url: '/dashboard/qc-reports', reportId: item.id },
      },
    });
  }
  return Response.json({ item });
}

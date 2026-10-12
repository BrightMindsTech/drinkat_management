import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability, requireQcReportsInbox } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { dataScopeForRole, normalizeUserRole } from '@/lib/permissions';
import { notifyUsers } from '@/lib/user-notify';
import { resolveQcReportRecipients } from '@/lib/qc-field-reports';
import { z } from 'zod';

const postSchema = z.object({
  branchId: z.string(),
  comments: z.string().min(1).max(4000),
  photoUrls: z.array(z.string()).max(3).default([]),
  category: z.string().min(1).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
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
    take: 80,
  });
  const branches = await prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  return Response.json({ items, branches });
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const session = await requireCapability('qc:review');
  const actorRole = normalizeUserRole(session.user.role);
  if (actorRole !== 'owner' && actorRole !== 'qc') {
    return Response.json({ error: 'Only QC or Owner can submit field reports' }, { status: 403 });
  }
  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'branch and comments required' }, { status: 400 });
  const branch = await prisma.branch.findUnique({ where: { id: parsed.data.branchId } });
  if (!branch) return Response.json({ error: 'Branch not found' }, { status: 404 });
  const item = await prisma.qcFieldReport.create({
    data: {
      createdById: session.user.id,
      branchId: parsed.data.branchId,
      category: parsed.data.category?.trim() || 'observation',
      severity: parsed.data.severity ?? 'medium',
      comments: parsed.data.comments,
      photosJson: JSON.stringify(parsed.data.photoUrls),
    },
  });

  const ids = await resolveQcReportRecipients(prisma, session.user.id);
  const pushTitle = `QC report · ${branch.name}`;
  const pushBody = parsed.data.comments.slice(0, 140);
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
  return Response.json({ item });
});

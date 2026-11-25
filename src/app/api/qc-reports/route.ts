import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCapability, requireQcReportsInbox } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { dataScopeForRole, normalizeUserRole } from '@/lib/permissions';
import { notifyUsers } from '@/lib/user-notify';
import {
  listQcNotifyPeople,
  qcReportNotifyOptions,
  resolveQcReportRecipients,
} from '@/lib/qc-field-reports';
import {
  BRANCH_INSPECTION_KIND,
  countInspectionResults,
  encodeInspectionPayload,
  INSPECTION_PHOTO_NOTE_MAX,
  INSPECTION_PHOTOS_PER_ITEM_MAX,
  inspectionComments,
  inspectionSeverity,
  validateInspectionAnswers,
} from '@/lib/qc-branch-inspection';
import {
  WAREHOUSE_INSPECTION_KIND,
  countWarehouseInspectionResults,
  encodeWarehouseInspectionPayload,
  isWarehouseInspectionBranchName,
  validateWarehouseInspectionAnswers,
  warehouseInspectionComments,
} from '@/lib/qc-warehouse-inspection';
import {
  COMPLAINT_ADDITIONAL_MAX,
  COMPLAINT_SLOT_NOTE_MAX,
  COMPLAINT_SLOTS_MAX,
  CUSTOMER_COMPLAINT_KIND,
  complaintComments,
  complaintHasContent,
  complaintSeverity,
  encodeComplaintPayload,
} from '@/lib/qc-complaints';
import { signUploadUrlsInJsonString } from '@/lib/upload-signed-url';
import { runSubmitSideEffects } from '@/lib/submit-side-effects';
import { z } from 'zod';

const notifyToSchema = z.union([z.string().min(1).max(80), z.array(z.string().min(1).max(80)).min(1).max(40)]).optional();

const noteSchema = z.object({
  kind: z.literal('note').optional(),
  branchId: z.string(),
  comments: z.string().min(1).max(4000),
  photoUrls: z.array(z.string()).max(3).default([]),
  category: z.string().min(1).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  notifyTo: notifyToSchema,
});

const complaintSlotSchema = z.object({
  note: z.string().max(COMPLAINT_SLOT_NOTE_MAX).optional().default(''),
  photoUrl: z.string().max(2000).nullable().optional(),
});

const complaintSchema = z.object({
  kind: z.literal(CUSTOMER_COMPLAINT_KIND),
  branchId: z.string(),
  talabat: z.array(complaintSlotSchema).max(COMPLAINT_SLOTS_MAX).optional().default([]),
  careem: z.array(complaintSlotSchema).max(COMPLAINT_SLOTS_MAX).optional().default([]),
  additionalNotes: z.string().max(COMPLAINT_ADDITIONAL_MAX).optional().default(''),
  notifyTo: notifyToSchema,
});

const inspectionSchema = z.object({
  kind: z.enum(['branch_inspection', 'warehouse_inspection']),
  branchId: z.string(),
  notes: z.string().max(4000).optional().default(''),
  notifyTo: notifyToSchema,
  answers: z.record(
    z.object({
      result: z.enum(['pass', 'fail']),
      photoUrl: z.string().max(2000).optional().nullable(),
      photoUrls: z.array(z.string().max(2000)).max(INSPECTION_PHOTOS_PER_ITEM_MAX).optional(),
      photoNotes: z.record(z.string().max(2000), z.string().max(INSPECTION_PHOTO_NOTE_MAX)).optional(),
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
  return Response.json({
    items: items.map((item) => ({
      ...item,
      photosJson: signUploadUrlsInJsonString(item.photosJson),
    })),
    branches,
    notifyOptions: qcReportNotifyOptions(notifyPeople),
  });
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const session = await requireCapability('qc:review');
  const actorRole = normalizeUserRole(session.user.role);
  if (actorRole !== 'owner' && actorRole !== 'qc') {
    return Response.json({ error: 'Only QC or Owner can submit field reports' }, { status: 403 });
  }
  const body = (await req.json()) as { kind?: unknown };
  if (body?.kind === BRANCH_INSPECTION_KIND || body?.kind === WAREHOUSE_INSPECTION_KIND) {
    return postInspection(session.user.id, body);
  }
  if (body?.kind === CUSTOMER_COMPLAINT_KIND) {
    return postComplaint(session.user.id, body);
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

  await runSubmitSideEffects('qc-note-notify', async () => {
    const ids = await resolveQcReportRecipients(prisma, userId, parsed.data.notifyTo ?? 'all');
    const pushTitle = `QC report · ${branch.name}`;
    const pushBody = parsed.data.comments.slice(0, 140);
    if (!ids.length) return;
    await notifyUsers(prisma, ids, {
      category: 'qc_field_report',
      title: pushTitle,
      body: pushBody,
      dataJson: JSON.stringify({
        type: 'qc_field_report',
        reportId: item.id,
        url: `/dashboard/qc-reports?report=${encodeURIComponent(item.id)}`,
      }),
      push: {
        title: pushTitle,
        body: pushBody,
        data: {
          type: 'qc_field_report',
          url: `/dashboard/qc-reports?report=${encodeURIComponent(item.id)}`,
          reportId: item.id,
        },
      },
    });
  });
  return Response.json({
    item: { ...item, photosJson: signUploadUrlsInJsonString(item.photosJson) },
  });
}

async function postInspection(userId: string, body: unknown) {
  const parsed = inspectionSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Answer every checklist item' }, { status: 400 });
  const warehouse = parsed.data.kind === WAREHOUSE_INSPECTION_KIND;
  const checked = warehouse
    ? validateWarehouseInspectionAnswers(parsed.data.answers)
    : validateInspectionAnswers(parsed.data.answers);
  if (!checked.ok) return Response.json({ error: checked.error }, { status: 400 });
  const branch = await prisma.branch.findUnique({ where: { id: parsed.data.branchId } });
  if (!branch) return Response.json({ error: 'Branch not found' }, { status: 404 });
  if (warehouse && !isWarehouseInspectionBranchName(branch.name)) {
    return Response.json({ error: 'This inspection is only for Central kitchen – Warehouse' }, { status: 400 });
  }
  const { pass, fail } = warehouse
    ? countWarehouseInspectionResults(checked.answers)
    : countInspectionResults(checked.answers);
  const notes = parsed.data.notes ?? '';
  const item = await prisma.qcFieldReport.create({
    data: {
      createdById: userId,
      branchId: parsed.data.branchId,
      category: warehouse ? WAREHOUSE_INSPECTION_KIND : BRANCH_INSPECTION_KIND,
      severity: inspectionSeverity(fail),
      comments: warehouse
        ? warehouseInspectionComments(pass, fail, notes)
        : inspectionComments(pass, fail, notes),
      photosJson: JSON.stringify(
        warehouse
          ? encodeWarehouseInspectionPayload(checked.answers, notes)
          : encodeInspectionPayload(checked.answers, notes)
      ),
    },
  });

  await runSubmitSideEffects('qc-inspection-notify', async () => {
    const ids = await resolveQcReportRecipients(prisma, userId, parsed.data.notifyTo ?? 'all');
    const pushTitle = warehouse
      ? `Central kitchen – Warehouse · ${branch.name}`
      : `Branch inspection · ${branch.name}`;
    const pushBody = `${fail} fail · ${pass} pass${notes.trim() ? ` · ${notes.trim().slice(0, 80)}` : ''}`;
    if (!ids.length) return;
    await notifyUsers(prisma, ids, {
      category: 'qc_field_report',
      title: pushTitle,
      body: pushBody,
      dataJson: JSON.stringify({
        type: 'qc_field_report',
        reportId: item.id,
        url: `/dashboard/qc-reports?report=${encodeURIComponent(item.id)}`,
      }),
      push: {
        title: pushTitle,
        body: pushBody,
        data: {
          type: 'qc_field_report',
          url: `/dashboard/qc-reports?report=${encodeURIComponent(item.id)}`,
          reportId: item.id,
        },
      },
    });
  });
  return Response.json({
    item: { ...item, photosJson: signUploadUrlsInJsonString(item.photosJson) },
  });
}

async function postComplaint(userId: string, body: unknown) {
  const parsed = complaintSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Describe the complaint' }, { status: 400 });
  const branch = await prisma.branch.findUnique({ where: { id: parsed.data.branchId } });
  if (!branch) return Response.json({ error: 'Branch not found' }, { status: 404 });
  const payload = encodeComplaintPayload(parsed.data);
  if (!complaintHasContent(payload)) return Response.json({ error: 'Add at least one complaint note or photo' }, { status: 400 });
  const item = await prisma.qcFieldReport.create({
    data: {
      createdById: userId,
      branchId: parsed.data.branchId,
      category: CUSTOMER_COMPLAINT_KIND,
      severity: complaintSeverity(payload),
      comments: complaintComments(payload),
      photosJson: JSON.stringify(payload),
    },
  });

  await runSubmitSideEffects('qc-complaint-notify', async () => {
    const ids = await resolveQcReportRecipients(prisma, userId, parsed.data.notifyTo ?? 'all');
    const pushTitle = `Complaint · ${branch.name}`;
    const pushBody = payload.description.slice(0, 140);
    if (!ids.length) return;
    await notifyUsers(prisma, ids, {
      category: 'qc_field_report',
      title: pushTitle,
      body: pushBody,
      dataJson: JSON.stringify({
        type: 'qc_complaint',
        reportId: item.id,
        url: `/dashboard/qc-reports?report=${encodeURIComponent(item.id)}`,
      }),
      push: {
        title: pushTitle,
        body: pushBody,
        data: {
          type: 'qc_complaint',
          url: `/dashboard/qc-reports?report=${encodeURIComponent(item.id)}`,
          reportId: item.id,
        },
      },
    });
  });
  return Response.json({
    item: { ...item, photosJson: signUploadUrlsInJsonString(item.photosJson) },
  });
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { parseTemplateFields, validateAnswersAgainstFields } from '@/lib/formTemplate';
import {
  canUserFillTemplate,
  managerManagementFormSubmissionWhere,
  normalizeUserRole,
  type FormViewContext,
} from '@/lib/formVisibility';
import { getManagerUserIdForEmployee, getOwnerUserIds } from '@/lib/time-clock-helpers';
import { notifyUsers } from '@/lib/user-notify';
import { maybePurgeOldManagementFormSubmissions } from '@/lib/form-submission-retention';
import { z } from 'zod';

const createSchema = z.object({
  templateId: z.string().min(1),
  answers: z.record(z.unknown()),
});

export async function GET(req: NextRequest) {
  await maybePurgeOldManagementFormSubmissions(prisma);
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const branchId = searchParams.get('branchId');

  if (role === 'owner') {
    const where: { template?: { category?: string }; branchId?: string } = {};
    if (category) where.template = { category };
    if (branchId) where.branchId = branchId;
    const list = await prisma.managementFormSubmission.findMany({
      where,
      include: {
        template: true,
        employee: { include: { branch: true, department: true } },
        branch: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
    return Response.json(
      list.map((s) => ({
        ...s,
        answers: JSON.parse(s.answersJson) as Record<string, string>,
        template: { ...s.template, fields: JSON.parse(s.template.fieldsJson) },
      }))
    );
  }

  if (role === 'manager') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: true },
    });
    if (!user?.employee) return Response.json([]);
    const mgr = user.employee;
    const list = await prisma.managementFormSubmission.findMany({
      where: managerManagementFormSubmissionWhere(mgr),
      include: {
        template: true,
        employee: { include: { branch: true, department: true, reportsToEmployee: { select: { id: true, name: true } } } },
        branch: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
    return Response.json(
      list.map((s) => ({
        ...s,
        answers: JSON.parse(s.answersJson) as Record<string, string>,
        template: { ...s.template, fields: JSON.parse(s.template.fieldsJson) },
      }))
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.employee) return Response.json([]);

  const list = await prisma.managementFormSubmission.findMany({
    where: { employeeId: user.employee.id },
    include: {
      template: true,
      employee: { include: { branch: true } },
      branch: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return Response.json(
    list.map((s) => ({
      ...s,
      answers: JSON.parse(s.answersJson) as Record<string, string>,
      template: { ...s.template, fields: JSON.parse(s.template.fieldsJson) },
    }))
  );
}

export async function POST(req: NextRequest) {
  await maybePurgeOldManagementFormSubmissions(prisma);
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: { include: { department: true } } },
  });
  if (!user?.employee) {
    return Response.json({ error: 'No employee record' }, { status: 403 });
  }
  const emp = user.employee;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const template = await prisma.managementFormTemplate.findUnique({
    where: { id: parsed.data.templateId },
    include: { departmentAssignments: true, employeeAssignments: true },
  });
  if (!template || !template.active) {
    return Response.json({ error: 'Template not found' }, { status: 404 });
  }

  const ctx: FormViewContext = {
    userRole: normalizeUserRole(session.user.role),
    employeeDepartmentId: emp.departmentId,
    employeeDepartmentName: emp.department?.name ?? null,
  };

  const allowed = canUserFillTemplate(
    ctx,
    template,
    { id: emp.id, role: emp.role, name: emp.name },
    session.user.email
  );
  if (!allowed) {
    if (template.category === 'qc') {
      return Response.json({ error: 'Only QC employees can submit quality control forms' }, { status: 403 });
    }
    if (template.category === 'cash') {
      return Response.json({ error: 'Cash forms are for managers or employees assigned by a manager' }, { status: 403 });
    }
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let fields;
  try {
    fields = parseTemplateFields(template.fieldsJson);
  } catch {
    return Response.json({ error: 'Invalid template' }, { status: 500 });
  }

  let answersNorm: Record<string, string>;
  try {
    answersNorm = validateAnswersAgainstFields(fields, parsed.data.answers);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return Response.json({ error: msg }, { status: 400 });
  }

  const submission = await prisma.managementFormSubmission.create({
    data: {
      templateId: template.id,
      employeeId: emp.id,
      branchId: emp.branchId,
      answersJson: JSON.stringify(answersNorm),
      status: 'submitted',
    },
    include: {
      template: true,
      employee: { include: { branch: true } },
      branch: true,
    },
  });

  // Notify owners immediately for every submission.
  const ownerIds = await getOwnerUserIds();

  const inboxTitle = `New form submission: ${template.title}`;
  const inboxBody = `${emp.name} submitted "${template.title}" (${submission.branch.name}).`;
  const inboxData = JSON.stringify({
    submissionId: submission.id,
    templateId: template.id,
    employeeId: emp.id,
    type: 'form_submitted',
  });

  const notifiedUserIds = new Set<string>(ownerIds);
  if (template.category === 'qc' && emp.branchId) {
    const branchManagerUserId = await getManagerUserIdForEmployee({
      reportsToEmployeeId: null,
      branchId: emp.branchId,
    });
    if (branchManagerUserId) notifiedUserIds.add(branchManagerUserId);
  }

  if (notifiedUserIds.size > 0) {
    const ownerCategory =
      template.category === 'cash' ? 'forms_cash_submitted_to_owner' : 'forms_submission_owner_direct';
    const formsHref = '/dashboard/forms';
    try {
      await notifyUsers(prisma, [...notifiedUserIds], {
        category: ownerCategory,
        title: inboxTitle,
        body: inboxBody,
        dataJson: inboxData,
        push: {
          title: inboxTitle,
          body: inboxBody,
          data: {
            type: 'management_form_submitted',
            url: formsHref,
            submissionId: submission.id,
          },
        },
      });
    } catch {
      /* notification optional */
    }
  }

  return Response.json({
    ...submission,
    answers: answersNorm,
    template: { ...submission.template, fields },
  });
}

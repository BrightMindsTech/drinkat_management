import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { parseTemplateFields, validateAnswersAgainstFields } from '@/lib/formTemplate';
import { canFillManagementForm, normalizeUserRole, type FormViewContext } from '@/lib/formVisibility';
import { z } from 'zod';

const createSchema = z.object({
  templateId: z.string().min(1),
  answers: z.record(z.unknown()),
});

export async function GET(req: NextRequest) {
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

  if (role === 'qc') {
    const where: { branchId?: string } = {};
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
      where: {
        branchId: mgr.branchId,
        employee: { reportsToEmployeeId: mgr.id, branchId: mgr.branchId },
      },
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

  const explicitlyAssigned = template.employeeAssignments.some((a) => a.employeeId === emp.id);
  if (!explicitlyAssigned && !canFillManagementForm(ctx, template)) {
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

  return Response.json({
    ...submission,
    answers: answersNorm,
    template: { ...submission.template, fields },
  });
}

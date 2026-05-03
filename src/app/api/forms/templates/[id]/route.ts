import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner, requireSession } from '@/lib/session';
import { formTemplateFieldsSchema, parseTemplateFields } from '@/lib/formTemplate';
import { canFillManagementForm, normalizeUserRole, type FormViewContext } from '@/lib/formVisibility';
import { isZainBadarneh } from '@/lib/named-employee-policy';
import { z } from 'zod';

const patchSchema = z.object({
  category: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  fields: z.unknown().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  departmentIds: z.array(z.string()).optional(),
  employeeIds: z.array(z.string()).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  const { id } = await params;
  const t = await prisma.managementFormTemplate.findUnique({
    where: { id },
    include: { departmentAssignments: true, employeeAssignments: true },
  });
  if (!t) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!t.active && role !== 'owner') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  if (role !== 'owner') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: { include: { department: true } } },
    });
    if (
      t.category === 'cash' &&
      user?.employee &&
      isZainBadarneh({ name: user.employee.name }, session.user.email)
    ) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const ctx: FormViewContext = {
      userRole: role,
      employeeDepartmentId: user?.employee?.departmentId ?? null,
      employeeDepartmentName: user?.employee?.department?.name ?? null,
    };
    const employeeId = user?.employee?.id ?? null;
    const explicitlyAssigned = !!(employeeId && t.employeeAssignments.some((a) => a.employeeId === employeeId));
    const ok =
      explicitlyAssigned ||
      canFillManagementForm(ctx, {
        category: t.category,
        departmentAssignments: t.departmentAssignments,
      });
    if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let fields: unknown;
  try {
    fields = parseTemplateFields(t.fieldsJson);
  } catch {
    return Response.json({ error: 'Invalid template fields' }, { status: 500 });
  }
  return Response.json({
    ...t,
    fields,
    departmentIds: t.departmentAssignments.map((a) => a.departmentId),
    employeeIds: t.employeeAssignments.map((a) => a.employeeId),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role !== 'owner' && role !== 'manager') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const existing = await prisma.managementFormTemplate.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  // Managers can only update employee assignments (not template structure/departments).
  if (role === 'manager') {
    const hasNonEmployeeChanges =
      parsed.data.category !== undefined ||
      parsed.data.title !== undefined ||
      parsed.data.description !== undefined ||
      parsed.data.fields !== undefined ||
      parsed.data.active !== undefined ||
      parsed.data.sortOrder !== undefined ||
      parsed.data.departmentIds !== undefined;
    if (hasNonEmployeeChanges) {
      return Response.json({ error: 'Managers can only assign templates to employees' }, { status: 403 });
    }
  }

  let fieldsJson: string | undefined;
  if (parsed.data.fields !== undefined) {
    const fieldsParsed = formTemplateFieldsSchema.safeParse(parsed.data.fields);
    if (!fieldsParsed.success) return Response.json(fieldsParsed.error.flatten(), { status: 400 });
    if (fieldsParsed.data.length === 0) {
      return Response.json({ error: 'Add at least one field' }, { status: 400 });
    }
    const keys = fieldsParsed.data.map((f) => f.key);
    if (new Set(keys).size !== keys.length) {
      return Response.json({ error: 'Duplicate field keys' }, { status: 400 });
    }
    fieldsJson = JSON.stringify(fieldsParsed.data);
  }

  const t = await prisma.managementFormTemplate.update({
    where: { id },
    data: {
      ...(parsed.data.category !== undefined && { category: parsed.data.category }),
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(fieldsJson !== undefined && { fieldsJson }),
      ...(parsed.data.active !== undefined && { active: parsed.data.active }),
      ...(parsed.data.sortOrder !== undefined && { sortOrder: parsed.data.sortOrder }),
    },
    include: { departmentAssignments: true, employeeAssignments: true },
  });

  if (parsed.data.departmentIds !== undefined) {
    if (role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });
    await prisma.formTemplateDepartment.deleteMany({ where: { templateId: id } });
    if (parsed.data.departmentIds.length > 0) {
      await prisma.formTemplateDepartment.createMany({
        data: parsed.data.departmentIds.map((departmentId) => ({ templateId: id, departmentId })),
      });
    }
  }

  if (parsed.data.employeeIds !== undefined) {
    if (role === 'owner' && parsed.data.employeeIds.length > 0) {
      const count = await prisma.employee.count({ where: { id: { in: parsed.data.employeeIds } } });
      if (count !== parsed.data.employeeIds.length) {
        return Response.json({ error: 'One or more employees not found' }, { status: 400 });
      }
    }
    let allowedEmployeeIds = parsed.data.employeeIds;
    if (role === 'manager') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { employee: true },
      });
      if (!user?.employee) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const managerEmployee = user.employee;
      const validEmployees = await prisma.employee.findMany({
        where: {
          id: { in: parsed.data.employeeIds },
          reportsToEmployeeId: managerEmployee.id,
          status: { not: 'terminated' },
        },
        select: { id: true },
      });
      const validSet = new Set(validEmployees.map((e) => e.id));
      if (validSet.size !== parsed.data.employeeIds.length) {
        return Response.json({ error: 'Managers can only assign forms to their direct reports' }, { status: 403 });
      }
      allowedEmployeeIds = parsed.data.employeeIds.filter((eid) => validSet.has(eid));
    }

    await prisma.formTemplateEmployee.deleteMany({ where: { templateId: id } });
    if (allowedEmployeeIds.length > 0) {
      await prisma.formTemplateEmployee.createMany({
        data: allowedEmployeeIds.map((employeeId) => ({ templateId: id, employeeId })),
      });
    }
  }

  const updated = await prisma.managementFormTemplate.findUniqueOrThrow({
    where: { id },
    include: { departmentAssignments: true, employeeAssignments: true },
  });

  let fields: unknown;
  try {
    fields = parseTemplateFields(updated.fieldsJson);
  } catch {
    fields = [];
  }
  return Response.json({
    ...updated,
    fields,
    departmentIds: updated.departmentAssignments.map((a) => a.departmentId),
    employeeIds: updated.employeeAssignments.map((a) => a.employeeId),
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  await prisma.managementFormTemplate.delete({ where: { id } });
  return new Response(null, { status: 204 });
}

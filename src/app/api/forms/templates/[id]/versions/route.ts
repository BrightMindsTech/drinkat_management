import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { parseTemplateFields } from '@/lib/formTemplate';
import { canUserFillTemplate, normalizeUserRole, type FormViewContext } from '@/lib/formVisibility';

export const GET = withApiErrors(async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  const { id } = await params;
  const template = await prisma.managementFormTemplate.findUnique({
    where: { id },
    include: { departmentAssignments: true, employeeAssignments: true },
  });
  if (!template) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!template.active && role !== 'owner') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  if (role !== 'owner') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: { include: { department: true } } },
    });
    const ctx: FormViewContext = {
      userRole: role,
      employeeDepartmentId: user?.employee?.departmentId ?? null,
      employeeDepartmentName: user?.employee?.department?.name ?? null,
    };
    const employeeForForms = user?.employee
      ? { id: user.employee.id, role: user.employee.role, name: user.employee.name }
      : null;
    const ok = canUserFillTemplate(
      ctx,
      {
        category: template.category,
        departmentAssignments: template.departmentAssignments,
        employeeAssignments: template.employeeAssignments,
      },
      employeeForForms,
      session.user.email
    );
    if (!ok) return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const versions = await prisma.formTemplateVersion.findMany({
    where: { templateId: id },
    orderBy: { versionNumber: 'desc' },
    select: {
      id: true,
      versionNumber: true,
      category: true,
      title: true,
      description: true,
      fieldsJson: true,
      publishedAt: true,
    },
  });
  return Response.json({
    currentVersionId: template.currentVersionId,
    liveFieldCount: parseTemplateFields(template.fieldsJson).length,
    versions: versions.map((v) => ({
      ...v,
      fields: parseTemplateFields(v.fieldsJson),
      immutable: true,
    })),
  });
});

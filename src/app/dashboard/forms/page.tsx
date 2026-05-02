import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseTemplateFields } from '@/lib/formTemplate';
import { canFillManagementForm, normalizeUserRole, type FormViewContext } from '@/lib/formVisibility';
import { isQcReviewerUser } from '@/lib/qc-reviewer';
import { isZainBadarneh } from '@/lib/named-employee-policy';
import {
  ManagementFormsView,
  type FormsMySubmission,
  type FormsReviewSubmission,
  type FormsTemplateRow,
} from '@/components/forms/ManagementFormsView';

export const dynamic = 'force-dynamic';

export default async function FormsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const role = normalizeUserRole(session.user.role);

  const allTemplates = await prisma.managementFormTemplate.findMany({
    where: role === 'owner' ? {} : { active: true },
    include: { departmentAssignments: true, employeeAssignments: true },
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: { include: { department: true } } },
  });

  const qcReviewer = isQcReviewerUser(session.user.role, user?.employee ?? null);

  const ctx: FormViewContext = {
    userRole: role,
    employeeDepartmentId: user?.employee?.departmentId ?? null,
    employeeDepartmentName: user?.employee?.department?.name ?? null,
  };

  const mapToRow = (t: (typeof allTemplates)[0]): FormsTemplateRow => {
    let fields: ReturnType<typeof parseTemplateFields> = [];
    try {
      fields = parseTemplateFields(t.fieldsJson);
    } catch {
      fields = [];
    }
    return {
      id: t.id,
      category: t.category,
      title: t.title,
      description: t.description,
      departmentIds: t.departmentAssignments.map((a) => a.departmentId),
      employeeIds: t.employeeAssignments.map((a) => a.employeeId),
      fields,
    };
  };

  const templatesForFill: FormsTemplateRow[] =
    role === 'owner'
      ? []
      : allTemplates
          .filter(
            (t) =>
              t.active &&
              (t.employeeAssignments.some((a) => a.employeeId === user?.employee?.id) ||
                canFillManagementForm(ctx, {
                  category: t.category,
                  departmentAssignments: t.departmentAssignments,
                }))
          )
          .filter(
            (t) =>
              !(
                t.category === 'cash' &&
                user?.employee &&
                isZainBadarneh({ name: user.employee.name }, session.user.email)
              )
          )
          .map(mapToRow);

  const allTemplatesForOwner: FormsTemplateRow[] | undefined =
    role === 'owner' || role === 'manager' || role === 'qc' || qcReviewer ? allTemplates.map(mapToRow) : undefined;

  const departments =
    role === 'owner'
      ? await prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
      : undefined;

  const assignmentEmployees =
    role === 'owner'
      ? (
          await prisma.employee.findMany({
            where: { status: { not: 'terminated' } },
            include: { branch: { select: { name: true } } },
            orderBy: { name: 'asc' },
          })
        ).map((e) => ({ id: e.id, name: e.name, branchName: e.branch.name }))
      : undefined;

  const managerEmployees =
    role === 'manager' && user?.employee
      ? await prisma.employee.findMany({
          where: {
            reportsToEmployeeId: user.employee.id,
            branchId: user.employee.branchId,
            status: { in: ['active', 'on_leave'] },
          },
          select: { id: true, name: true, role: true },
          orderBy: { name: 'asc' },
        })
      : undefined;

  let reviewSubmissions: FormsReviewSubmission[] = [];
  if (role === 'owner' || role === 'manager' || role === 'qc' || qcReviewer) {
    if (role === 'manager') {
      const userWithEmployee = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { employee: { include: { branch: true } } },
      });
      if (!userWithEmployee?.employee) {
        return (
          <div>
            <ManagementFormsView
              role={role}
              managerUserId={undefined}
              templatesForFill={[]}
              initialReviewSubmissions={[]}
              initialMySubmissions={[]}
              allTemplatesForOwner={[]}
              departments={undefined}
              managerEmployees={undefined}
              staffEmptyHint={null}
              qcReviewer={qcReviewer}
            />
          </div>
        );
      }

      const managerEmployee = userWithEmployee.employee;
      const list = await prisma.managementFormSubmission.findMany({
        where: {
          branchId: managerEmployee.branchId,
          employee: { reportsToEmployeeId: managerEmployee.id, branchId: managerEmployee.branchId },
        },
        include: {
          template: { include: { departmentAssignments: true } },
          employee: {
            include: {
              branch: true,
              department: true,
              reportsToEmployee: { select: { id: true, name: true } },
            },
          },
          branch: true,
        },
        orderBy: { submittedAt: 'desc' },
        take: 300,
      });

      reviewSubmissions = list.map((s) => ({
        id: s.id,
        status: s.status,
        submittedAt: s.submittedAt,
        reviewedAt: s.reviewedAt,
        rating: s.rating,
        comments: s.comments,
        answers: JSON.parse(s.answersJson) as Record<string, string>,
        template: {
          id: s.template.id,
          category: s.template.category,
          title: s.template.title,
          description: s.template.description,
          departmentIds: s.template.departmentAssignments.map((a) => a.departmentId),
          fields: (() => {
            try {
              return parseTemplateFields(s.template.fieldsJson);
            } catch {
              return [];
            }
          })(),
        },
        employee: { name: s.employee.name },
        branch: { name: s.branch.name },
        departmentName: s.employee.department?.name ?? null,
        reportsToManager: s.employee.reportsToEmployee
          ? { name: s.employee.reportsToEmployee.name }
          : null,
      }));
    } else {
      const whereSub = {};
      const list = await prisma.managementFormSubmission.findMany({
        where: whereSub,
        include: {
          template: { include: { departmentAssignments: true } },
          employee: {
            include: {
              branch: true,
              department: true,
              reportsToEmployee: { select: { id: true, name: true } },
            },
          },
          branch: true,
        },
        orderBy: { submittedAt: 'desc' },
        take: 300,
      });
      reviewSubmissions = list.map((s) => ({
        id: s.id,
        status: s.status,
        submittedAt: s.submittedAt,
        reviewedAt: s.reviewedAt,
        rating: s.rating,
        comments: s.comments,
        answers: JSON.parse(s.answersJson) as Record<string, string>,
        template: {
          id: s.template.id,
          category: s.template.category,
          title: s.template.title,
          description: s.template.description,
          departmentIds: s.template.departmentAssignments.map((a) => a.departmentId),
          fields: (() => {
            try {
              return parseTemplateFields(s.template.fieldsJson);
            } catch {
              return [];
            }
          })(),
        },
        employee: { name: s.employee.name },
        branch: { name: s.branch.name },
        departmentName: s.employee.department?.name ?? null,
        reportsToManager: s.employee.reportsToEmployee
          ? { name: s.employee.reportsToEmployee.name }
          : null,
      }));
    }
  }

  let mySubmissions: FormsMySubmission[] = [];
  if (role === 'staff' || role === 'qc' || role === 'marketing' || role === 'manager') {
    if (user?.employee) {
      const list = await prisma.managementFormSubmission.findMany({
        where: { employeeId: user.employee.id },
        include: { template: true, branch: true },
        orderBy: { submittedAt: 'desc' },
        take: 100,
      });
      mySubmissions = list.map((s) => ({
        id: s.id,
        status: s.status,
        submittedAt: s.submittedAt,
        answers: JSON.parse(s.answersJson) as Record<string, string>,
        template: {
          id: s.template.id,
          title: s.template.title,
          category: s.template.category,
        },
        branch: { name: s.branch.name },
      }));
    }
  }

  let staffEmptyHint: 'noEmployee' | 'noDepartment' | 'noneForDept' | null = null;
  if ((role === 'staff' || role === 'marketing' || role === 'manager') && templatesForFill.length === 0) {
    if (!user?.employee) staffEmptyHint = 'noEmployee';
    else if (!user.employee.departmentId) staffEmptyHint = 'noDepartment';
    else staffEmptyHint = 'noneForDept';
  }

  return (
    <ManagementFormsView
      role={role}
      managerUserId={role === 'manager' ? session.user.id : undefined}
      templatesForFill={templatesForFill}
      allTemplatesForOwner={allTemplatesForOwner}
      departments={departments}
      assignmentEmployees={assignmentEmployees}
      managerEmployees={managerEmployees}
      initialReviewSubmissions={reviewSubmissions}
      initialMySubmissions={mySubmissions}
      staffEmptyHint={staffEmptyHint}
      qcReviewer={qcReviewer}
    />
  );
}

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { normalizeUserRole } from '@/lib/formVisibility';
import { prisma } from '@/lib/prisma';
import { ManagerReportsInbox, type OwnerManagerReport } from '@/components/reports/ManagerReportsInbox';

export default async function OwnerManagerReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const role = normalizeUserRole(session.user.role);
  if (role !== 'owner') redirect('/dashboard');

  const reports = await prisma.inboxNotification.findMany({
    where: {
      userId: session.user.id,
      category: { in: ['manager_time_clock_report', 'manager_form_report', 'weekly_rating_submitted'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const parsed = reports.map((r) => {
    let data: Record<string, unknown> = {};
    try {
      data = r.dataJson ? (JSON.parse(r.dataJson) as Record<string, unknown>) : {};
    } catch {
      data = {};
    }
    return {
      id: r.id,
      category: r.category as
        | 'manager_time_clock_report'
        | 'manager_form_report'
        | 'weekly_rating_submitted',
      title: r.title,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.readAt ? r.readAt.toISOString() : null,
      reportedByUserId: String(data.reportedByUserId ?? ''),
      reporterDisplay: String(data.raterName ?? data.reporterDisplay ?? '').trim(),
      employeeId: String(data.targetEmployeeId ?? data.employeeId ?? ''),
      reportType: String(data.type ?? r.category ?? ''),
      details: String(data.details ?? r.body),
      reportAt: String(data.when ?? r.createdAt.toISOString()),
    };
  });

  const managerUserIds = [...new Set(parsed.map((x) => x.reportedByUserId).filter(Boolean))];
  const employeeIds = [...new Set(parsed.map((x) => x.employeeId).filter(Boolean))];

  const [managers, employees] = await Promise.all([
    managerUserIds.length
      ? prisma.employee.findMany({
          where: { userId: { in: managerUserIds } },
          select: { userId: true, name: true },
        })
      : Promise.resolve([]),
    employeeIds.length
      ? prisma.employee.findMany({
          where: { id: { in: employeeIds } },
          include: { branch: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const managerMap = new Map(managers.map((m) => [m.userId ?? '', m.name]));
  const employeeMap = new Map(employees.map((e) => [e.id, { name: e.name, branchName: e.branch.name }]));

  const normalized: OwnerManagerReport[] = parsed.map((r) => ({
    id: r.id,
    category: r.category,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt,
    managerName: r.reporterDisplay || managerMap.get(r.reportedByUserId) || 'Unknown manager',
    employeeName: employeeMap.get(r.employeeId)?.name ?? 'Unknown employee',
    branchName: employeeMap.get(r.employeeId)?.branchName ?? 'Unknown branch',
    reportType: r.reportType || 'unknown',
    reportAt: r.reportAt,
    details: r.details,
  }));

  return <ManagerReportsInbox initialReports={normalized} />;
}

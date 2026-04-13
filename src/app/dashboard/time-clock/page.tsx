import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { normalizeUserRole } from '@/lib/formVisibility';
import { TimeClockView } from '@/components/time-clock/TimeClockView';
import { prisma } from '@/lib/prisma';

type ManagerLog = {
  id: string;
  when: string;
  employeeId: string;
  employeeName: string;
  type: 'clock_in' | 'clock_out' | 'away_started';
  details: string;
  reportedToOwner: boolean;
};

type ManagerAlert = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  employeeId: string | null;
  employeeName: string | null;
  type: 'clock_in' | 'clock_out' | 'away_started';
  details: string;
  reportedToOwner: boolean;
};

export default async function TimeClockPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  const role = normalizeUserRole(session.user.role);
  if (role === 'owner') redirect('/dashboard');

  let managerLogs: ManagerLog[] = [];
  let managerAlerts: ManagerAlert[] = [];
  if (role === 'manager') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: true },
    });
    if (user?.employee) {
      const [alerts, ownerReports] = await Promise.all([
        prisma.inboxNotification.findMany({
          where: { userId: session.user.id, category: 'time_clock' },
          orderBy: { createdAt: 'desc' },
          take: 40,
        }),
        prisma.inboxNotification.findMany({
          where: { category: 'manager_time_clock_report' },
          orderBy: { createdAt: 'desc' },
          take: 500,
        }),
      ]);
      const reportedIds = new Set<string>();
      for (const r of ownerReports) {
        let data: Record<string, unknown> = {};
        try {
          data = r.dataJson ? (JSON.parse(r.dataJson) as Record<string, unknown>) : {};
        } catch {
          data = {};
        }
        if (String(data.reportedByUserId ?? '') !== session.user.id) continue;
        const logId = String(data.logId ?? '');
        if (logId) reportedIds.add(logId);
      }
      const alertRows = alerts.map((a) => {
        let data: Record<string, unknown> = {};
        try {
          data = a.dataJson ? (JSON.parse(a.dataJson) as Record<string, unknown>) : {};
        } catch {
          data = {};
        }
        const kind = String(data.kind ?? '');
        const mappedType: 'clock_in' | 'clock_out' | 'away_started' =
          kind === 'clock_in' ? 'clock_in' : kind === 'clock_out' ? 'clock_out' : 'away_started';
        return {
          id: a.id,
          title: a.title,
          body: a.body,
          createdAt: a.createdAt.toISOString(),
          employeeId: data.employeeId ? String(data.employeeId) : null,
          type: mappedType,
          details: a.body,
          reportedToOwner: reportedIds.has(`alert-${a.id}`),
        };
      });
      const employeeIds = [...new Set(alertRows.map((x) => x.employeeId).filter(Boolean) as string[])];
      const employees = employeeIds.length
        ? await prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, name: true },
          })
        : [];
      const employeeMap = new Map(employees.map((e) => [e.id, e.name]));
      managerAlerts = alertRows.map((a) => ({
        ...a,
        employeeName: a.employeeId ? (employeeMap.get(a.employeeId) ?? null) : null,
      }));

      const team = await prisma.employee.findMany({
        where: {
          reportsToEmployeeId: user.employee.id,
          branchId: user.employee.branchId,
          status: { in: ['active', 'on_leave'] },
        },
        select: { id: true },
      });
      const teamIds = team.map((e) => e.id);
      if (teamIds.length > 0) {
        const [entries, aways] = await Promise.all([
          prisma.timeClockEntry.findMany({
            where: { employeeId: { in: teamIds } },
            include: { employee: { select: { name: true } } },
            orderBy: { clockInAt: 'desc' },
            take: 120,
          }),
          prisma.awaySession.findMany({
            where: { employeeId: { in: teamIds } },
            include: { employee: { select: { name: true } } },
            orderBy: { startedAt: 'desc' },
            take: 120,
          }),
        ]);

        const rows: ManagerLog[] = [];
        for (const e of entries) {
          rows.push({
            id: `in-${e.id}`,
            when: e.clockInAt.toISOString(),
            employeeId: e.employeeId,
            employeeName: e.employee.name,
            type: 'clock_in',
            details: 'Clock-in',
            reportedToOwner: reportedIds.has(`in-${e.id}`),
          });
          if (e.clockOutAt) {
            rows.push({
              id: `out-${e.id}`,
              when: e.clockOutAt.toISOString(),
              employeeId: e.employeeId,
              employeeName: e.employee.name,
              type: 'clock_out',
              details:
                e.clockOutReason === 'away_timer_expired'
                  ? 'Clock-out (auto after away)'
                  : e.clockOutReason === 'force_hr_manager' || e.clockOutReason === 'force_hr_owner'
                    ? 'Clock-out (forced from HR)'
                    : 'Clock-out',
              reportedToOwner: reportedIds.has(`out-${e.id}`),
            });
          }
        }
        for (const a of aways) {
          rows.push({
            id: `away-${a.id}`,
            when: a.startedAt.toISOString(),
            employeeId: a.employeeId,
            employeeName: a.employee.name,
            type: 'away_started',
            details: `Away started: ${a.kind}${a.otherNote ? ` (${a.otherNote})` : ''}`,
            reportedToOwner: reportedIds.has(`away-${a.id}`),
          });
        }
        rows.sort((a, b) => (a.when < b.when ? 1 : -1));
        managerLogs = rows.slice(0, 150);
      }
    }
  }

  return (
    <TimeClockView
      isManager={role === 'manager'}
      managerUserId={role === 'manager' ? session.user.id : undefined}
      managerLogs={managerLogs}
      managerAlerts={managerAlerts}
    />
  );
}

'use client';

import { useEffect, useState } from 'react';
import { interpolate, useLanguage } from '@/contexts/LanguageContext';
import { AdvancesList } from './AdvancesList';
import { LeaveRequestsSection } from './LeaveRequestsSection';
import { PerformanceReviewsSection } from './PerformanceReviewsSection';
import type { Advance, Branch, Employee, LeaveRequest, PerformanceReview } from '@prisma/client';
type EmployeeWithBranch = Employee & { branch: { name: string } };
type AdvanceWithEmployee = Advance & { employee: Employee & { branch: { name: string } } };
type LeaveWithEmployee = LeaveRequest & { employee: Employee & { branch: { name: string } } };

export function HRManagerView({
  manager,
  teamEmployees,
  reviewsByEmployeeId,
  initialTeamAdvances,
  initialMyAdvances,
  initialLeaveRequests,
  branches,
}: {
  manager: EmployeeWithBranch;
  teamEmployees: EmployeeWithBranch[];
  reviewsByEmployeeId: Record<string, PerformanceReview[]>;
  initialTeamAdvances: AdvanceWithEmployee[];
  initialMyAdvances: AdvanceWithEmployee[];
  initialLeaveRequests: LeaveWithEmployee[];
  branches: Branch[];
}) {
  const { t } = useLanguage();
  const [myAdvanceList, setMyAdvanceList] = useState(initialMyAdvances);
  const [teamAdvanceList, setTeamAdvanceList] = useState(initialTeamAdvances);
  const [forceClockBusyId, setForceClockBusyId] = useState<string | null>(null);
  const [forceClockNoticeById, setForceClockNoticeById] = useState<Record<string, string>>({});
  const [hoursMonth, setHoursMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [hoursLoading, setHoursLoading] = useState(false);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [monthlyHoursRows, setMonthlyHoursRows] = useState<
    {
      employeeId: string;
      employeeName: string;
      branchName: string;
      employmentType: string;
      totalHours: number;
      shiftsCount: number;
      openShifts: number;
    }[]
  >([]);

  const sectionClass = 'app-section scroll-mt-28';
  const myApprovedSum = myAdvanceList.filter((a) => a.status === 'approved').reduce((s, a) => s + a.amount, 0);

  function onMyAdvanceRequested(a: AdvanceWithEmployee) {
    setMyAdvanceList((prev) => [a, ...prev]);
  }

  function onTeamAdvanceUpdated(a: AdvanceWithEmployee) {
    setTeamAdvanceList((prev) => prev.map((x) => (x.id === a.id ? a : x)));
  }

  async function refreshTeamAdvances() {
    try {
      const res = await fetch('/api/advances?team=1', { cache: 'no-store' });
      if (!res.ok) return;
      const rows = (await res.json()) as AdvanceWithEmployee[];
      setTeamAdvanceList(rows);
    } catch {
      // keep current snapshot if refresh fails
    }
  }

  useEffect(() => {
    void refreshTeamAdvances();
    const id = window.setInterval(() => {
      void refreshTeamAdvances();
    }, 12000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setHoursLoading(true);
    setHoursError(null);
    const params = new URLSearchParams({ month: hoursMonth });
    fetch(`/api/time-clock/monthly-hours?${params}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load: ${r.status}`);
        return r.json() as Promise<{ rows: typeof monthlyHoursRows }>;
      })
      .then((json) => setMonthlyHoursRows(json.rows ?? []))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Failed to load';
        setHoursError(msg);
      })
      .finally(() => setHoursLoading(false));
  }, [hoursMonth]);

  async function forceClockOutTeamMember(emp: EmployeeWithBranch) {
    if (!confirm(interpolate(t.hr.forceClockOutConfirm, { name: emp.name }))) return;
    setForceClockBusyId(emp.id);
    setForceClockNoticeById((prev) => ({ ...prev, [emp.id]: '' }));
    try {
      const res = await fetch('/api/time-clock/force-clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: emp.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        alreadyClockedOut?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setForceClockNoticeById((prev) => ({
          ...prev,
          [emp.id]: data.error ?? t.hr.forceClockOutFailed,
        }));
        return;
      }
      if (data.alreadyClockedOut) {
        setForceClockNoticeById((prev) => ({
          ...prev,
          [emp.id]: interpolate(t.hr.alreadyClockedOutNotice, { name: emp.name }),
        }));
        return;
      }
      if (data.ok) {
        setForceClockNoticeById((prev) => ({ ...prev, [emp.id]: t.hr.forceClockOutSuccess }));
      }
    } finally {
      setForceClockBusyId(null);
    }
  }

  return (
    <div className="app-page">
      <section id="hr-manager-info" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.myInformation}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/50 dark:bg-ios-dark-elevated-2/20 p-3">
            <p className="text-xs text-app-muted">{t.common.name}</p>
            <p className="text-sm font-semibold text-app-primary mt-0.5">{manager.name}</p>
          </div>
          <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/50 dark:bg-ios-dark-elevated-2/20 p-3">
            <p className="text-xs text-app-muted">{t.common.branch}</p>
            <p className="text-sm font-semibold text-app-primary mt-0.5">{manager.branch.name}</p>
          </div>
          <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/50 dark:bg-ios-dark-elevated-2/20 p-3">
            <p className="text-xs text-app-muted">{t.common.role}</p>
            <p className="text-sm font-semibold text-app-primary mt-0.5">{manager.role}</p>
          </div>
          {manager.contact && (
            <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/50 dark:bg-ios-dark-elevated-2/20 p-3">
              <p className="text-xs text-app-muted">{t.common.contact}</p>
              <p className="text-sm font-semibold text-app-primary mt-0.5">{manager.contact}</p>
            </div>
          )}
        </div>
      </section>

      <section id="hr-manager-my-advances" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.myAdvanceRequests}</h2>
        <AdvancesList
          advances={myAdvanceList}
          onRequested={onMyAdvanceRequested}
          advanceLimit={manager.advanceLimit ?? undefined}
          approvedSum={myApprovedSum}
        />
      </section>

      <section id="hr-owner-leave" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.leaveRequests}</h2>
        <LeaveRequestsSection initialLeaves={initialLeaveRequests} branches={branches} />
      </section>

      <section id="hr-manager-monthly-hours" className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-app-primary">Monthly worked hours</h2>
          <label className="text-sm text-app-secondary">
            Month
            <input
              type="month"
              value={hoursMonth}
              onChange={(e) => setHoursMonth(e.target.value)}
              className="ml-2 rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1"
            />
          </label>
        </div>
        {hoursError ? <p className="text-sm text-red-600">{hoursError}</p> : null}
        {hoursLoading ? (
          <p className="text-sm text-app-muted">{t.common.loading}</p>
        ) : monthlyHoursRows.length === 0 ? (
          <p className="text-sm text-app-muted">{t.common.noData}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated">
            <table className="w-full text-sm min-w-[680px]">
              <thead>
                <tr className="bg-gray-100 dark:bg-ios-dark-elevated-2/50 text-left">
                  <th className="p-2 font-semibold">Employee</th>
                  <th className="p-2 font-semibold">Branch</th>
                  <th className="p-2 font-semibold">Type</th>
                  <th className="p-2 font-semibold text-right">Hours</th>
                  <th className="p-2 font-semibold text-right">Shifts</th>
                  <th className="p-2 font-semibold text-right">Open shifts</th>
                </tr>
              </thead>
              <tbody>
                {monthlyHoursRows.map((row, i) => (
                  <tr
                    key={row.employeeId}
                    className={`border-t border-gray-200 dark:border-ios-dark-separator ${
                      i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-ios-dark-elevated-2/20'
                    }`}
                  >
                    <td className="p-2 font-medium text-app-primary">{row.employeeName}</td>
                    <td className="p-2">{row.branchName}</td>
                    <td className="p-2">{row.employmentType === 'part_time' ? 'Part-time' : 'Full-time'}</td>
                    <td className="p-2 text-right tabular-nums">{row.totalHours.toFixed(2)}</td>
                    <td className="p-2 text-right tabular-nums">{row.shiftsCount}</td>
                    <td className="p-2 text-right tabular-nums">{row.openShifts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="hr-manager-team" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.staff}</h2>
        {teamEmployees.length === 0 ? (
          <p className="text-sm text-app-muted">{t.common.noData}</p>
        ) : (
          <ul className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 [scrollbar-width:none] [-ms-overflow-style:none]">
            {teamEmployees.map((emp) => (
              <li
                key={emp.id}
                className="snap-start shrink-0 w-[92%] sm:w-[70%] lg:w-[52%] rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator px-3 py-3 sm:px-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-app-primary">{emp.name}</p>
                    <p className="text-xs text-app-secondary">{emp.branch.name}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void forceClockOutTeamMember(emp)}
                      disabled={forceClockBusyId === emp.id}
                      className="rounded-lg border border-amber-600/70 bg-amber-500/10 text-amber-800 dark:text-amber-200 px-2.5 py-1 text-xs font-semibold hover:bg-amber-500/15 disabled:opacity-50"
                    >
                      {forceClockBusyId === emp.id ? t.common.loading : t.hr.forceClockOut}
                    </button>
                    <span className="text-xs rounded-full px-2 py-0.5 bg-gray-100 dark:bg-ios-dark-elevated-2 text-app-secondary">
                      {emp.role}
                    </span>
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 ${
                        emp.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                          : emp.status === 'on_leave'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                      }`}
                    >
                      {t.status[emp.status as keyof typeof t.status] ?? emp.status}
                    </span>
                  </div>
                </div>
                {forceClockNoticeById[emp.id] ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300/90 mb-2">{forceClockNoticeById[emp.id]}</p>
                ) : null}
                <div className="border-t border-gray-100 dark:border-ios-dark-separator pt-3">
                  <p className="text-xs font-medium text-app-secondary mb-2">{t.reviews.title}</p>
                  <PerformanceReviewsSection
                    employeeId={emp.id}
                    canAddReviews
                    initialData={reviewsByEmployeeId[emp.id] ?? []}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="hr-owner-advances" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.teamAdvanceRequests}</h2>
        <AdvancesList advances={teamAdvanceList} ownerView onUpdated={onTeamAdvanceUpdated} />
      </section>
    </div>
  );
}

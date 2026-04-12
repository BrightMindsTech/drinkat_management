'use client';

import { useState } from 'react';
import { AdvancesList } from './AdvancesList';
import { LeaveRequestsSection } from './LeaveRequestsSection';
import { PerformanceReviewsSection } from './PerformanceReviewsSection';
import { useLanguage } from '@/contexts/LanguageContext';
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

  const sectionClass = 'app-section scroll-mt-28';
  const myApprovedSum = myAdvanceList.filter((a) => a.status === 'approved').reduce((s, a) => s + a.amount, 0);

  function onMyAdvanceRequested(a: AdvanceWithEmployee) {
    setMyAdvanceList((prev) => [a, ...prev]);
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

      <section id="hr-manager-team" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.staff}</h2>
        {teamEmployees.length === 0 ? (
          <p className="text-sm text-app-muted">{t.common.noData}</p>
        ) : (
          <ul className="space-y-4">
            {teamEmployees.map((emp) => (
              <li
                key={emp.id}
                className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator px-3 py-3 sm:px-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-app-primary">{emp.name}</p>
                    <p className="text-xs text-app-secondary">{emp.branch.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
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
        <AdvancesList advances={initialTeamAdvances} ownerView />
      </section>
    </div>
  );
}

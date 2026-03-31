'use client';

import { useState } from 'react';
import type { Employee, LeaveRequest } from '@prisma/client';
import type { Advance } from '@prisma/client';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';
import { AdvancesList } from './AdvancesList';
import { RequestLeaveForm } from './RequestLeaveForm';
import { LeaveList } from './LeaveList';
import { EmployeeDocumentsSection } from './EmployeeDocumentsSection';
import { SalaryHistorySection } from './SalaryHistorySection';
import { PerformanceReviewsSection } from './PerformanceReviewsSection';
import { SectionJumpNav } from '@/components/SectionJumpNav';

type EmployeeWithBranch = Employee & { branch: { name: string } };
type AdvanceWithEmployee = Advance & { employee: Employee & { branch: { name: string } } };
type LeaveWithEmployee = LeaveRequest & { employee: Employee & { branch: { name: string } } };

type Doc = { id: string; employeeId: string; filePath: string; title: string; createdAt: Date };
type SalaryRow = { id: string; periodMonth: string; amount: number };
type ReviewRow = { id: string; reviewedAt: string | Date; rating: number; notes: string | null };
export function HRStaffView({ employee, advances, leaveRequests, documents, salaryHistory, reviews }: { employee: EmployeeWithBranch; advances: AdvanceWithEmployee[]; leaveRequests: LeaveWithEmployee[]; documents: Doc[]; salaryHistory: SalaryRow[]; reviews: ReviewRow[] }) {
  const [advanceList, setAdvanceList] = useState(advances);
  const [leaveList, setLeaveList] = useState(leaveRequests);

  function onAdvanceRequested(a: AdvanceWithEmployee) {
    setAdvanceList((prev) => [a, ...prev]);
  }

  function onLeaveRequested(l: LeaveWithEmployee) {
    setLeaveList((prev) => [l, ...prev]);
  }

  const { t } = useLanguage();
  const sectionClass =
    'rounded-lg border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-6 scroll-mt-28 app-animate-in app-surface';

  const staffNavItems = [
    { id: 'hr-staff-info', label: t.hr.myInformation },
    { id: 'hr-staff-leave', label: t.hr.myLeave },
    { id: 'hr-staff-documents', label: t.employeeCard.myDocuments },
    { id: 'hr-staff-salary', label: t.employeeCard.mySalaryHistory },
    { id: 'hr-staff-reviews', label: t.employeeCard.myReviews },
    { id: 'hr-staff-advances', label: t.hr.myAdvanceRequests },
  ];

  return (
    <div className="space-y-6 app-stagger">
      <SectionJumpNav items={staffNavItems} />
      <section id="hr-staff-info" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.myInformation}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/50 dark:bg-ios-dark-elevated-2/20 p-3">
            <p className="text-xs text-app-muted">{t.common.name}</p>
            <p className="text-sm font-semibold text-app-primary mt-0.5">{employee.name}</p>
          </div>
          <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/50 dark:bg-ios-dark-elevated-2/20 p-3">
            <p className="text-xs text-app-muted">{t.common.branch}</p>
            <p className="text-sm font-semibold text-app-primary mt-0.5">{employee.branch.name}</p>
          </div>
          <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/50 dark:bg-ios-dark-elevated-2/20 p-3">
            <p className="text-xs text-app-muted">{t.common.role}</p>
            <p className="text-sm font-semibold text-app-primary mt-0.5">{employee.role}</p>
          </div>
          {employee.contact && (
            <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/50 dark:bg-ios-dark-elevated-2/20 p-3">
              <p className="text-xs text-app-muted">{t.common.contact}</p>
              <p className="text-sm font-semibold text-app-primary mt-0.5">{employee.contact}</p>
            </div>
          )}
          {employee.joinDate && (
            <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/50 dark:bg-ios-dark-elevated-2/20 p-3 sm:col-span-2">
              <p className="text-xs text-app-muted">{t.hr.joinDate}</p>
              <p className="text-sm font-semibold text-app-primary mt-0.5">{new Date(employee.joinDate).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </section>

      <section id="hr-staff-leave" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.myLeave}</h2>
        {employee.leaveBalanceDays != null && (
          <div className="mb-3 rounded-ios-lg border border-ios-blue/30 bg-ios-blue/5 px-3 py-2">
            <p className="text-sm text-app-secondary">
              {t.hr.leaveBalance}: <span className="font-semibold text-app-primary">{interpolate(t.hr.daysRemaining, { count: String(employee.leaveBalanceDays) })}</span>
            </p>
          </div>
        )}
        <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/40 dark:bg-ios-dark-elevated-2/20 p-3 mb-3">
          <RequestLeaveForm onRequested={onLeaveRequested} />
        </div>
        <LeaveList leaves={leaveList} />
      </section>

      <section id="hr-staff-documents" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.employeeCard.myDocuments}</h2>
        <EmployeeDocumentsSection employeeId={employee.id} documents={documents} ownerView={false} />
      </section>

      <section id="hr-staff-salary" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.employeeCard.mySalaryHistory}</h2>
        <SalaryHistorySection employeeId={employee.id} initialData={salaryHistory} />
      </section>

      <section id="hr-staff-reviews" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.employeeCard.myReviews}</h2>
        <PerformanceReviewsSection employeeId={employee.id} ownerView={false} initialData={reviews} />
      </section>

      <section id="hr-staff-advances" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.myAdvanceRequests}</h2>
        <AdvancesList
          advances={advanceList}
          onRequested={onAdvanceRequested}
          advanceLimit={employee.advanceLimit ?? undefined}
          approvedSum={advanceList.filter((a) => a.status === 'approved').reduce((s, a) => s + a.amount, 0)}
        />
      </section>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Branch, Department, Employee, Advance } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LeaveRequest } from '@prisma/client';
import { EmployeeCard } from './EmployeeCard';
import { RegisterStaffForm } from './RegisterStaffForm';
import { AdvancesList } from './AdvancesList';
import { SalarySection } from './SalarySection';
import { DepartmentSection } from './DepartmentSection';
import { LeaveRequestsSection } from './LeaveRequestsSection';
import { SectionJumpNav } from '@/components/SectionJumpNav';

type EmployeeWithRelations = Employee & { branch: Branch; department?: Department | null; user: { email: string } | null };
type AdvanceWithEmployee = Advance & { employee: Employee & { branch: { name: string } } };
type LeaveWithEmployee = LeaveRequest & { employee: Employee & { branch: { name: string } } };

export function HROwnerView({
  initialEmployees,
  initialAdvances,
  initialLeaveRequests,
  branches,
  departments,
}: {
  initialEmployees: EmployeeWithRelations[];
  initialAdvances: AdvanceWithEmployee[];
  initialLeaveRequests: LeaveWithEmployee[];
  branches: Branch[];
  departments: Department[];
}) {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState(initialEmployees);
  const [advances, setAdvances] = useState(initialAdvances);
  const [departmentsList, setDepartmentsList] = useState<Department[]>(departments);
  const [showRegister, setShowRegister] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch = !searchQuery.trim() || emp.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchesBranch = !branchFilter || emp.branchId === branchFilter;
      return matchesSearch && matchesBranch;
    });
  }, [employees, searchQuery, branchFilter]);

  useEffect(() => {
    setActiveCardIndex(0);
    cardRefs.current = cardRefs.current.slice(0, filteredEmployees.length);
    const root = carouselRef.current;
    if (!root || filteredEmployees.length <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestIdx = -1;
        let bestRatio = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.index ?? -1);
          if (idx >= 0 && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIdx = idx;
          }
        }
        if (bestIdx >= 0) setActiveCardIndex(bestIdx);
      },
      { root, threshold: [0.55, 0.7, 0.85] }
    );

    for (const el of cardRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [filteredEmployees.length]);

  async function onEmployeeCreated(emp: EmployeeWithRelations) {
    setEmployees((prev) => [...prev, emp]);
    setShowRegister(false);
  }

  async function onEmployeeDeleted(id: string) {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  }

  async function onEmployeeUpdated(updated: EmployeeWithRelations) {
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  async function onAdvanceUpdated(updated: AdvanceWithEmployee) {
    setAdvances((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  const sectionClass =
    'rounded-lg border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-6 scroll-mt-28 app-animate-in app-surface';

  const ownerNavItems = [
    { id: 'hr-owner-staff', label: t.hr.staff },
    { id: 'hr-owner-departments', label: t.hr.departments },
    { id: 'hr-owner-leave', label: t.hr.leaveRequests },
    { id: 'hr-owner-advances', label: t.hr.advances },
    { id: 'hr-owner-salary', label: t.hr.salarySection },
  ];

  return (
    <div className="space-y-6 min-w-0 app-stagger">
      <SectionJumpNav items={ownerNavItems} />
      <section id="hr-owner-staff" className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-app-primary">{t.hr.staff}</h2>
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="rounded-ios bg-ios-blue text-white px-4 py-2.5 text-sm font-medium active:opacity-90"
          >
            {t.hr.registerStaff}
          </button>
        </div>
        {showRegister && (
          <RegisterStaffForm branches={branches} departments={departmentsList} onCreated={onEmployeeCreated} onCancel={() => setShowRegister(false)} />
        )}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.hr.searchStaff}
            className="flex-1 min-w-0 rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2 text-sm focus:border-ios-blue focus:ring-2 focus:ring-ios-blue/20"
          />
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2 text-sm min-w-[140px]"
          >
            <option value="">{t.qc.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 relative">
          <div
            ref={carouselRef}
            className="staff-carousel overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth overscroll-x-contain pb-2 [scrollbar-width:none] [-ms-overflow-style:none]"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            <style>{`.staff-carousel::-webkit-scrollbar { display: none }`}</style>
            <div className="flex">
              {filteredEmployees.map((emp, idx) => (
                <div
                  key={emp.id}
                  ref={(el) => {
                    cardRefs.current[idx] = el;
                  }}
                  data-index={idx}
                  className="flex-[0_0_100%] min-w-0 snap-start px-0.5"
                >
                  <EmployeeCard employee={emp} departments={departmentsList} branches={branches} onDeleted={onEmployeeDeleted} onUpdated={onEmployeeUpdated} />
                </div>
              ))}
            </div>
          </div>
          {filteredEmployees.length === 0 && (
            <p className="text-sm text-app-muted py-8 text-center">
              {t.common.noData}
            </p>
          )}
          {filteredEmployees.length > 1 && (
            <div className="mt-2 flex items-center justify-center gap-2" aria-label="Employee cards pagination">
              <button
                type="button"
                onClick={() => {
                  const prevIndex = Math.max(0, activeCardIndex - 1);
                  const target = cardRefs.current[prevIndex];
                  target?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
                }}
                disabled={activeCardIndex <= 0}
                className="h-7 w-7 rounded-full border border-gray-300 dark:border-ios-dark-separator text-app-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-ios-dark-elevated-2 flex items-center justify-center"
                aria-label="Previous employee card"
              >
                <span aria-hidden>‹</span>
              </button>
              {filteredEmployees.map((emp, idx) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => {
                    const target = cardRefs.current[idx];
                    target?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === activeCardIndex
                      ? 'w-5 bg-ios-blue'
                      : 'w-1.5 bg-gray-300 dark:bg-ios-dark-separator'
                  }`}
                  aria-label={`${t.hr.staff} ${idx + 1}`}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  const nextIndex = Math.min(filteredEmployees.length - 1, activeCardIndex + 1);
                  const target = cardRefs.current[nextIndex];
                  target?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
                }}
                disabled={activeCardIndex >= filteredEmployees.length - 1}
                className="h-7 w-7 rounded-full border border-gray-300 dark:border-ios-dark-separator text-app-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-ios-dark-elevated-2 flex items-center justify-center"
                aria-label="Next employee card"
              >
                <span aria-hidden>›</span>
              </button>
            </div>
          )}
        </div>
      </section>

      <section id="hr-owner-departments" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.departments}</h2>
        <DepartmentSection initialDepartments={departments} onDepartmentsChange={setDepartmentsList} />
      </section>

      <section id="hr-owner-leave" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.leaveRequests}</h2>
        <LeaveRequestsSection initialLeaves={initialLeaveRequests} branches={branches} />
      </section>

      <section id="hr-owner-advances" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.advances}</h2>
        <AdvancesList advances={advances} onUpdated={onAdvanceUpdated} ownerView />
      </section>

      <section id="hr-owner-salary" className={sectionClass}>
        <SalarySection employees={employees} />
      </section>
    </div>
  );
}

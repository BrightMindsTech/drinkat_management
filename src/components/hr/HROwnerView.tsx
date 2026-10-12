'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Branch, Department, Employee } from '@prisma/client';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';
import { EmployeeCard } from './EmployeeCard';
import { RegisterStaffForm } from './RegisterStaffForm';
import { DepartmentSection } from './DepartmentSection';
import { ManagerAssignmentsSection } from './ManagerAssignmentsSection';
import { OwnerPushBroadcastSection } from './OwnerPushBroadcastSection';

type EmployeeWithRelations = Employee & { branch: Branch; department?: Department | null; user: { email: string } | null };

function employeeMatchesSearch(emp: EmployeeWithRelations, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    emp.name,
    emp.branch?.name,
    emp.department?.name,
    emp.user?.email,
    emp.contact,
    emp.role,
    emp.residentialArea,
    emp.shiftTime,
  ]
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}
export function HROwnerView({
  initialEmployees,
  branches,
  departments,
  showOwnerTools = true,
}: {
  initialEmployees: EmployeeWithRelations[];
  branches: Branch[];
  departments: Department[];
  showOwnerTools?: boolean;
}) {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState(initialEmployees);
  const [departmentsList, setDepartmentsList] = useState<Department[]>(departments);
  const [showRegister, setShowRegister] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scrollCarouselToIndex = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const root = carouselRef.current;
    if (!root) return;
    const w = root.clientWidth;
    root.scrollTo({ left: Math.max(0, index) * w, behavior });
  };
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch = employeeMatchesSearch(emp, searchQuery);
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

  /** Reset carousel position when filters change — scroll container only (not the page). */
  useEffect(() => {
    setActiveCardIndex(0);
    scrollCarouselToIndex(0, 'auto');
  }, [searchQuery, branchFilter]);

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

  async function downloadHrExport() {
    setExporting(true);
    setExportNotice(null);
    try {
      const res = await fetch('/api/hr/export', { cache: 'no-store' });
      if (!res.ok) {
        setExportNotice(t.hr.historicalExportFailed);
        return;
      }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drinkat-hr-archive-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportNotice(t.hr.historicalExportFailed);
    } finally {
      setExporting(false);
    }
  }

  const sectionClass = 'app-section scroll-mt-28';

  return (
    <div className="app-page">
      {showOwnerTools ? <OwnerPushBroadcastSection /> : null}
      <section id="hr-owner-staff" className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-app-primary">{t.hr.staff}</h2>
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="app-btn-primary"
          >
            {t.hr.registerStaff}
          </button>
        </div>
        {showRegister && (
          <RegisterStaffForm branches={branches} departments={departmentsList} onCreated={onEmployeeCreated} onCancel={() => setShowRegister(false)} />
        )}
        <div className="mt-4 rounded-xl border border-gray-200 dark:border-ios-dark-separator bg-gray-50/60 dark:bg-ios-dark-elevated-2/30 p-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-app-primary">{t.hr.searchStaff}</span>
            <div className="relative mt-1.5">
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-muted"
                aria-hidden
              >
                ⌕
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.hr.searchStaffPlaceholder}
                autoComplete="off"
                enterKeyHint="search"
                className="app-input w-full pl-9 pr-9"
              />
              {searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-0.5 text-xs font-medium text-ios-blue hover:bg-ios-blue/10"
                  aria-label={t.common.cancel}
                >
                  {t.common.cancel}
                </button>
              ) : null}
            </div>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <label className="block sm:min-w-[200px] sm:flex-1">
              <span className="text-xs font-medium text-app-secondary">{t.hr.filterByBranch}</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="app-select w-full mt-1"
              >
                <option value="">{t.qc.allBranches}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm text-app-muted sm:pb-2 tabular-nums">
              {interpolate(t.hr.staffSearchResultCount, { count: String(filteredEmployees.length) })}
              {employees.length !== filteredEmployees.length
                ? ` / ${employees.length} ${t.reports.employees.toLowerCase()}`
                : ''}
            </p>
          </div>
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
                  <EmployeeCard
                    employee={emp}
                    departments={departmentsList}
                    branches={branches}
                    onDeleted={onEmployeeDeleted}
                    onUpdated={onEmployeeUpdated}
                  />
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
                  scrollCarouselToIndex(prevIndex);
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
                  onClick={() => scrollCarouselToIndex(idx)}
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
                  scrollCarouselToIndex(nextIndex);
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

      <section id="hr-owner-manager-assignments" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.hr.assignToManager}</h2>
        <ManagerAssignmentsSection employees={employees} onEmployeeUpdated={onEmployeeUpdated} />
      </section>

      {showOwnerTools ? (
      <section id="hr-owner-export" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-2">{t.hr.historicalExport}</h2>
        <p className="text-sm text-app-secondary mb-3">{t.hr.historicalExportHint}</p>
        <button type="button" className="app-btn-primary" disabled={exporting} onClick={() => void downloadHrExport()}>
          {exporting ? t.common.loading : t.hr.historicalExportButton}
        </button>
        {exportNotice ? <p className="mt-2 text-sm text-app-secondary">{exportNotice}</p> : null}
      </section>
      ) : null}
    </div>
  );
}

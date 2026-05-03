'use client';

import { useMemo, useState } from 'react';
import type { Employee, Branch } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';

type EmployeeWithBranch = Employee & { branch: Branch };

export function ManagerAssignmentsSection({
  employees,
  onEmployeeUpdated,
}: {
  employees: EmployeeWithBranch[];
  onEmployeeUpdated: (emp: EmployeeWithBranch) => void;
}) {
  const { t } = useLanguage();
  const [openManagerId, setOpenManagerId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const managers = useMemo(
    () => employees.filter((e) => e.role === 'manager').sort((a, b) => a.name.localeCompare(b.name)),
    [employees]
  );

  const directReportsByManager = useMemo(() => {
    const map = new Map<string, EmployeeWithBranch[]>();
    for (const m of managers) map.set(m.id, []);
    for (const e of employees) {
      if (!e.reportsToEmployeeId) continue;
      if (!map.has(e.reportsToEmployeeId)) continue;
      map.get(e.reportsToEmployeeId)!.push(e);
    }
    for (const [, list] of map) list.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [employees, managers]);

  function candidateEmployees(manager: EmployeeWithBranch) {
    return employees
      .filter((e) => e.id !== manager.id && e.role !== 'manager')
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async function assignEmployee(manager: EmployeeWithBranch) {
    const employeeId = selectedEmployeeId[manager.id];
    if (!employeeId) return;
    setSavingKey(`${manager.id}:${employeeId}`);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportsToEmployeeId: manager.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? 'Failed to assign employee');
        return;
      }
      onEmployeeUpdated(data as EmployeeWithBranch);
      setSelectedEmployeeId((prev) => ({ ...prev, [manager.id]: '' }));
    } finally {
      setSavingKey(null);
    }
  }

  async function unassignEmployee(employee: EmployeeWithBranch) {
    setSavingKey(`remove:${employee.id}`);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportsToEmployeeId: null }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? 'Failed to unassign employee');
        return;
      }
      onEmployeeUpdated(data as EmployeeWithBranch);
    } finally {
      setSavingKey(null);
    }
  }

  if (managers.length === 0) {
    return <p className="text-sm text-app-muted">{t.hr.noManagersFound}</p>;
  }

  return (
    <div className="space-y-4">
      {managers.map((manager) => {
        const reports = directReportsByManager.get(manager.id) ?? [];
        const candidates = candidateEmployees(manager);
        const selectedId = selectedEmployeeId[manager.id] ?? '';

        return (
          <div
            key={manager.id}
            className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-app-primary">{manager.name}</p>
                <p className="text-sm text-app-secondary">
                  {manager.branch.name} · {t.hr.directReportsLabel}: {reports.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenManagerId((prev) => (prev === manager.id ? null : manager.id))}
                className="rounded-ios border border-gray-300 dark:border-ios-dark-separator px-3 py-1.5 text-sm text-app-primary"
              >
                {t.hr.addEmployees}
              </button>
            </div>

            <div className="mt-3">
              {reports.length === 0 ? (
                <p className="text-sm text-app-muted">{t.hr.noDirectReports}</p>
              ) : (
                <ul className="space-y-2">
                  {reports.map((emp) => (
                    <li key={emp.id} className="flex flex-wrap items-center justify-between gap-2 rounded-ios border border-gray-200 dark:border-ios-dark-separator px-3 py-2">
                      <span className="text-sm text-app-primary">
                        {emp.name}{' '}
                        <span className="text-app-secondary">
                          ({emp.role.toUpperCase()}) · {emp.branch.name}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => unassignEmployee(emp)}
                        disabled={savingKey === `remove:${emp.id}`}
                        className="rounded-ios border border-red-300 dark:border-red-500/50 px-2.5 py-1 text-xs text-red-700 dark:text-red-300 disabled:opacity-50"
                      >
                        {t.hr.unassign}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {openManagerId === manager.id && (
              <div className="mt-4 rounded-ios border border-gray-200 dark:border-ios-dark-separator p-3">
                <label className="block text-sm text-app-label mb-1">{t.hr.selectEmployeeToAssign}</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedEmployeeId((prev) => ({ ...prev, [manager.id]: e.target.value }))}
                    className="flex-1 rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2 text-sm"
                  >
                    <option value="">{t.hr.chooseEmployee}</option>
                    {candidates.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role.toUpperCase()}) — {emp.branch.name}
                        {emp.reportsToEmployeeId ? ` • ${t.hr.reassignLabel}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => assignEmployee(manager)}
                    disabled={!selectedId || savingKey === `${manager.id}:${selectedId}`}
                    className="rounded-ios bg-ios-blue text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {t.hr.addEmployees}
                  </button>
                </div>
                {candidates.length === 0 && (
                  <p className="text-xs text-app-muted mt-2">{t.hr.noEmployeesForBranch}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import type { Employee, Branch } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';

type EmployeeWithBranch = Employee & { branch: Branch };

export function SalarySection({ employees }: { employees: EmployeeWithBranch[] }) {
  const { t } = useLanguage();
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [periodMonth, setPeriodMonth] = useState(defaultMonth);
  const [salaryCopies, setSalaryCopies] = useState<{ employeeId: string; employeeName: string; branchName: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [salaryInputs, setSalaryInputs] = useState<Record<string, string>>({});
  const [staffSearch, setStaffSearch] = useState('');
  const [deductionReport, setDeductionReport] = useState<{
    periodMonth: string;
    rows: {
      employeeName: string;
      branchName: string;
      salary: number;
      deduction: number;
      net: number;
      employmentType?: 'full_time' | 'part_time';
      daysWorked?: number | null;
      dailyRate?: number | null;
    }[];
    totals: { salary: number; deduction: number; net: number };
  } | null>(null);

  useEffect(() => {
    fetch(`/api/salary?periodMonth=${periodMonth}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSalaryCopies(data.map((s: { employee: { id: string; name: string; branch: { name: string } }; amount: number }) => ({
          employeeId: s.employee.id,
          employeeName: s.employee.name,
          branchName: s.employee.branch.name,
          amount: s.amount,
        })));
      })
      .catch(() => setSalaryCopies([]));
  }, [periodMonth]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    const form = new FormData();
    form.set('file', file);
    form.set('periodMonth', periodMonth);
    const res = await fetch('/api/salary/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) {
      setUploadError(data.error || t.salary.uploadFailed);
      return;
    }
    if (data.salaryCopies) setSalaryCopies(data.salaryCopies.map((s: { employee: { id: string; name: string; branch: { name: string } }; amount: number }) => ({
      employeeId: s.employee.id,
      employeeName: s.employee.name,
      branchName: s.employee.branch.name,
      amount: s.amount,
    })));
    e.target.value = '';
  }

  async function saveManual() {
    setLoading(true);
    const entries = employees
      .map((emp) => ({
        employeeId: emp.id,
        amount: Number(salaryInputs[emp.id]) || 0,
      }))
      .filter((e) => e.amount > 0);
    const res = await fetch('/api/salary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodMonth, entries, source: 'manual' }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok && Array.isArray(data)) setSalaryCopies(data.map((s: { employee: { id: string; name: string; branch: { name: string } }; amount: number }) => ({
      employeeId: s.employee.id,
      employeeName: s.employee.name,
      branchName: s.employee.branch.name,
      amount: s.amount,
    })));
  }

  async function loadDeductionReport() {
    const res = await fetch(`/api/salary/deductions?periodMonth=${encodeURIComponent(periodMonth)}`);
    const data = await res.json();
    if (res.ok) setDeductionReport(data);
    else setDeductionReport(null);
  }

  const salaryByEmployee = Object.fromEntries(salaryCopies.map((s) => [s.employeeId, s.amount]));
  const formatMoney = (value: number) => `${value.toFixed(2)} JOD`;
  const filteredEmployees = employees.filter((emp) => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return true;
    return emp.name.toLowerCase().includes(q) || emp.branch.name.toLowerCase().includes(q);
  });
  const enteredRows = employees.filter((emp) => Number(salaryInputs[emp.id]) > 0).length;
  const enteredTotal = employees.reduce((sum, emp) => sum + (Number(salaryInputs[emp.id]) || 0), 0);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const emp of employees) {
      const amount = salaryByEmployee[emp.id];
      next[emp.id] = amount != null ? String(amount) : '';
    }
    setSalaryInputs(next);
  }, [periodMonth, salaryCopies, employees]);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-app-primary">{t.hr.salarySection}</h2>
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm font-medium text-app-primary">
          {t.salary.periodMonth}
          <input
            type="month"
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="ml-2 rounded border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="rounded-ios border border-gray-300 dark:border-ios-dark-separator px-3 py-2 text-sm cursor-pointer bg-white dark:bg-ios-dark-elevated text-ios-blue font-medium">
          {t.salary.uploadCsv}
          <input type="file" accept=".csv,.txt" onChange={handleUpload} className="hidden" />
        </label>
        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
      </div>

      <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated overflow-hidden">
        <div className="p-3 border-b border-gray-200 dark:border-ios-dark-separator bg-gray-50/70 dark:bg-ios-dark-elevated-2/30">
          <p className="text-sm font-medium text-app-primary">{t.salary.manualEntry}</p>
          <p className="text-xs text-app-muted mt-1">{t.salary.manualSalaryFullTimeHint}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
              placeholder={t.hr.searchStaff}
              className="min-w-[220px] flex-1 rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                const next: Record<string, string> = {};
                for (const emp of employees) next[emp.id] = '';
                setSalaryInputs(next);
              }}
              className="rounded-ios border border-gray-300 dark:border-ios-dark-separator px-3 py-2 text-sm text-app-primary hover:bg-gray-100 dark:hover:bg-ios-dark-elevated-2"
            >
              Clear all
            </button>
          </div>
          <p className="mt-2 text-xs text-app-muted">
            {t.common.total}: {enteredRows}/{employees.length} | {formatMoney(enteredTotal)}
          </p>
        </div>
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white dark:bg-ios-dark-elevated z-[1] border-b border-gray-200 dark:border-ios-dark-separator">
              <tr>
                <th className="text-left p-2 font-medium text-app-secondary">{t.common.employee}</th>
                <th className="text-left p-2 font-medium text-app-secondary">{t.common.branch}</th>
                <th className="text-right p-2 font-medium text-app-secondary">{t.salary.salary}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-app-muted">{t.common.noData}</td>
                </tr>
              )}
              {filteredEmployees.map((emp, idx) => (
                <tr
                  key={emp.id}
                  className={`border-t border-gray-100 dark:border-ios-dark-separator ${
                    idx % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/40 dark:bg-ios-dark-elevated-2/20'
                  }`}
                >
                  <td className="p-2 font-medium text-app-primary">{emp.name}</td>
                  <td className="p-2 text-app-secondary">{emp.branch.name}</td>
                  <td className="p-2">
                    <div className="flex items-center justify-end gap-2">
                      <input
                        id={`salary-${emp.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={salaryInputs[emp.id] ?? ''}
                        onChange={(e) =>
                          setSalaryInputs((prev) => ({
                            ...prev,
                            [emp.id]: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                        className="w-28 rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-right tabular-nums"
                      />
                      <span className="text-xs text-app-muted">JOD</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-gray-200 dark:border-ios-dark-separator bg-white/95 dark:bg-ios-dark-elevated/95">
          <button
            type="button"
            onClick={saveManual}
            disabled={loading}
            className="rounded-ios bg-ios-blue text-white px-4 py-2.5 text-sm font-medium active:opacity-90 disabled:opacity-50"
          >
            {loading ? t.salary.saving : t.salary.saveSalaryCopy}
          </button>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={loadDeductionReport}
          className="rounded-ios border border-gray-300 dark:border-ios-dark-separator px-4 py-2.5 text-sm font-medium text-ios-blue bg-white dark:bg-ios-dark-elevated active:bg-gray-100 dark:active:bg-ios-dark-elevated-2"
        >
          {t.salary.viewDeductionReport}
        </button>
        {deductionReport && (
          <div className="mt-4 rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated overflow-x-auto overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-ios-dark-separator bg-gray-50/70 dark:bg-ios-dark-elevated-2/30">
              <p className="text-sm font-medium text-app-primary">
                {t.salary.reportFor}{' '}
                {new Date(deductionReport.periodMonth + '-01').toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-app-muted mt-1">{t.reports.salaryDeductionExplanation}</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
                <div className="rounded-md border border-gray-200 dark:border-ios-dark-separator bg-white/80 dark:bg-ios-dark-elevated px-2.5 py-2">
                  <p className="text-app-muted">{t.salary.salary}</p>
                  <p className="font-semibold text-app-primary">{formatMoney(deductionReport.totals.salary)}</p>
                </div>
                <div className="rounded-md border border-gray-200 dark:border-ios-dark-separator bg-white/80 dark:bg-ios-dark-elevated px-2.5 py-2">
                  <p className="text-app-muted">{t.salary.deduction}</p>
                  <p className="font-semibold text-red-600 dark:text-red-400">{formatMoney(deductionReport.totals.deduction)}</p>
                </div>
                <div className="rounded-md border border-gray-200 dark:border-ios-dark-separator bg-white/80 dark:bg-ios-dark-elevated px-2.5 py-2">
                  <p className="text-app-muted">{t.salary.net}</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">{formatMoney(deductionReport.totals.net)}</p>
                </div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-ios-dark-elevated-2/50">
                  <th className="text-left p-2">{t.common.employee}</th>
                  <th className="text-left p-2">{t.common.branch}</th>
                  <th className="text-right p-2">{t.reports.salaryPaidDaysColumn}</th>
                  <th className="text-right p-2">{t.reports.salaryDailyRateColumn}</th>
                  <th className="text-right p-2">{t.salary.salary}</th>
                  <th className="text-right p-2">{t.salary.deduction}</th>
                  <th className="text-right p-2">{t.salary.net}</th>
                </tr>
              </thead>
              <tbody>
                {deductionReport.rows.length === 0 && (
                  <tr className="border-t">
                    <td className="p-3 text-center text-app-muted" colSpan={7}>
                      {t.common.noData}
                    </td>
                  </tr>
                )}
                {deductionReport.rows.map((r, i) => (
                  <tr
                    key={i}
                    className={`border-t ${i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-ios-dark-elevated-2/20'}`}
                  >
                    <td className="p-2">{r.employeeName}</td>
                    <td className="p-2">{r.branchName}</td>
                    <td className="p-2 text-right tabular-nums text-app-muted">
                      {r.employmentType === 'part_time' && r.daysWorked != null ? r.daysWorked : '—'}
                    </td>
                    <td className="p-2 text-right tabular-nums text-app-muted">
                      {r.employmentType === 'part_time' && r.dailyRate != null ? r.dailyRate.toFixed(2) : '—'}
                    </td>
                    <td className="p-2 text-right tabular-nums">{formatMoney(r.salary)}</td>
                    <td className="p-2 text-right tabular-nums text-red-600 dark:text-red-400">{formatMoney(r.deduction)}</td>
                    <td className="p-2 text-right tabular-nums font-medium text-emerald-700 dark:text-emerald-300">{formatMoney(r.net)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-ios-dark-separator font-semibold bg-gray-100 dark:bg-ios-dark-elevated-2/30">
                  <td className="p-2" colSpan={4}>{t.common.total}</td>
                  <td className="p-2 text-right tabular-nums">{formatMoney(deductionReport.totals.salary)}</td>
                  <td className="p-2 text-right tabular-nums text-red-600 dark:text-red-400">{formatMoney(deductionReport.totals.deduction)}</td>
                  <td className="p-2 text-right tabular-nums text-emerald-700 dark:text-emerald-300">{formatMoney(deductionReport.totals.net)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

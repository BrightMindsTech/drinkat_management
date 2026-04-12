'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Branch } from '@prisma/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

const COLORS = ['#007AFF', '#5856D6', '#34C759', '#FF9500', '#FF3B30'];

const SIDEBAR_SECTIONS = [
  { id: 'branch-overview', labelKey: 'branchOverview' as const },
  { id: 'hr', labelKey: 'hrSection' as const },
  { id: 'leave', labelKey: 'leaveSection' as const },
  { id: 'advances', labelKey: 'advancesSection' as const },
  { id: 'qc', labelKey: 'qcSection' as const },
  { id: 'forms', labelKey: 'formsSection' as const },
  { id: 'manager-reports', labelKey: 'managerReportsSection' as const },
  { id: 'activity', labelKey: 'activitySection' as const },
  { id: 'salary', labelKey: 'salarySection' as const },
  { id: 'export', labelKey: 'exportCsv' as const },
] as const;

function getMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value, label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) });
  }
  return opts;
}

export function ReportsView({ branches }: { branches: Branch[] }) {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [branchId, setBranchId] = useState('');
  const monthOptions = useMemo(getMonthOptions, []);
  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [month, setMonth] = useState(currentMonth);
  const [salaryMonth, setSalaryMonth] = useState(currentMonth);
  const [activeSection, setActiveSection] = useState('branch-overview');
  const [qcLogsMinimized, setQcLogsMinimized] = useState(false);
  const [qcArchiveFrom, setQcArchiveFrom] = useState('');
  const [qcArchiveTo, setQcArchiveTo] = useState('');


  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    hr: {
      headcountByBranch: Record<string, number>;
      totalHeadcount: number;
      newHires: { id: string; name: string; branch: { name: string }; joinDate: string | null }[];
      headcountOverTime: { month: string; count: number }[];
      advances: {
        requested: number;
        approved: number;
        denied: number;
        pending: number;
        requestedAmount: number;
        approvedAmount: number;
        deniedAmount: number;
        pendingAmount: number;
      };
      advancesList: { id: string; amount: number; status: string; requestedAt: string; employee: { name: string; branch: { name: string } } }[];
      leave?: {
        byBranch: Record<string, { pending: number; approved: number; denied: number; daysApproved: number }>;
        totalPending: number;
        totalApproved: number;
        totalDenied: number;
        totalDaysApproved: number;
        logs: {
          id: string;
          type: string;
          status: string;
          startDate: string;
          endDate: string;
          createdAt: string;
          employee: { name: string };
          branch: { name: string };
        }[];
      };
    };
    qc: {
      total: number;
      approved: number;
      denied: number;
      pending: number;
      averageRating: number | null;
      lateCount: number;
      lateSubmissionsList: { id: string; employee: { name: string }; branch: { name: string }; submittedAt: string }[];
      logs: {
        id: string;
        status: string;
        rating: number | null;
        isLate: boolean;
        submittedAt: string;
        checklistName: string;
        employee: { name: string };
        branch: { name: string };
        photos: { id: string; filePath: string }[];
      }[];
      ratingDistribution: Record<number, number>;
      trend: { date: string; total: number; approved: number }[];
      byChecklist: { name: string; total: number; approved: number; rate: number }[];
      byBranch: Record<string, { total: number; approved: number; late?: number }>;
    };
    salary: {
      periodMonth: string;
      rows: { periodMonth?: string; employeeName: string; branchName: string; salary: number; deduction: number; net: number }[];
      totals: { salary: number; deduction: number; net: number };
    };
    forms: {
      total: number;
      filed: number;
      approved: number;
      denied: number;
      averageRating: number | null;
      byTemplate: { templateId: string; title: string; category: string; total: number; filed: number; approved: number; denied: number }[];
      byBranch: Record<string, number>;
      byCategory: Record<string, number>;
      trend: { date: string; total: number; approved: number; filed: number }[];
      recent: { id: string; status: string; submittedAt: string; employee: { name: string }; branch: { name: string }; template: { title: string; category: string } }[];
    };
    managerReports: {
      managerId: string;
      managerName: string;
      branchId: string;
      branchName: string;
      teamSize: number;
      qc: { total: number; approved: number; denied: number; pending: number };
      forms: { total: number; filed: number; approved: number; denied: number; pending: number };
      advances: { total: number; approved: number; denied: number; pending: number };
      leave: { total: number; approved: number; denied: number; pending: number };
      overall: { total: number; approved: number; denied: number; pending: number };
    }[];
    activity: {
      transfers: { total: number; recent: { id: string; transferredAt: string; employee: { name: string }; fromBranch: { name: string }; toBranch: { name: string } }[] };
      reviews: { total: number; averageRating: number | null; recent: { id: string; reviewedAt: string; rating: number; employee: { name: string; branch: { name: string } } }[] };
      documents: { total: number; recent: { id: string; createdAt: string; title: string; employee: { name: string; branch: { name: string } } }[] };
    };
    branchOverview: { id: string; name: string; headcount: number; advancesSum: number; qcTotal: number; qcApproved: number; qcRate: number; totalSalary: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ period });
    if (branchId) params.set('branchId', branchId);
    if (month) params.set('month', month);
    if (salaryMonth) params.set('salaryMonth', salaryMonth);
    fetch(`/api/reports?${params}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load: ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((err) => setError(err.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [period, branchId, month, salaryMonth]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveSection(e.target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );
    SIDEBAR_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [data]);

  useEffect(() => {
    if (!month && monthOptions.length) setMonth(monthOptions[0].value);
  }, [monthOptions]);
  useEffect(() => {
    if (!salaryMonth && monthOptions.length) setSalaryMonth(monthOptions[0].value);
  }, [monthOptions]);

  // Must run every render (before any early return) — hooks cannot follow conditional returns.
  const qcArchiveRows = useMemo(() => {
    const logs = data?.qc?.logs ?? [];
    const from = qcArchiveFrom ? new Date(`${qcArchiveFrom}T00:00:00`) : null;
    const to = qcArchiveTo ? new Date(`${qcArchiveTo}T23:59:59.999`) : null;
    return logs
      .filter((row) => {
        const d = new Date(row.submittedAt);
        if (Number.isNaN(d.getTime())) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [data, qcArchiveFrom, qcArchiveTo]);

  const qcArchiveByMonth = useMemo(
    () =>
      qcArchiveRows.reduce(
        (acc, row) => {
          const d = new Date(row.submittedAt);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(row);
          return acc;
        },
        {} as Record<string, typeof qcArchiveRows>
      ),
    [qcArchiveRows]
  );

  if (loading && !data && !error) return <p className="text-app-muted py-8">{t.common.loading}</p>;
  if (error) return <p className="text-red-600 dark:text-red-400 py-8">{error}</p>;
  if (!data) return <p className="text-app-muted py-8">{t.common.noData}</p>;

  const branchNames = branches.reduce((acc, b) => ({ ...acc, [b.id]: b.name }), {} as Record<string, string>);
  const headcountChartData = Object.entries(data.hr.headcountByBranch).map(([id, count]) => ({
    name: branchNames[id] ?? id,
    count,
  }));
  const advancesChartData = [
    { name: t.status.approved, value: data.hr.advances.approved, color: '#007AFF' },
    { name: t.status.denied, value: data.hr.advances.denied, color: '#ef4444' },
    { name: t.status.pending, value: data.hr.advances.pending, color: '#eab308' },
  ].filter((d) => d.value > 0);
  const qcByBranchData = Object.entries(data.qc.byBranch).map(([id, v]) => ({
    name: branchNames[id] ?? id,
    total: v.total,
    approved: v.approved,
    rate: v.total ? Math.round((v.approved / v.total) * 100) : 0,
  }));
  const ratingDistData = [1, 2, 3, 4, 5].map((r) => ({
    rating: String(r),
    count: data.qc.ratingDistribution?.[r] ?? 0,
  }));
  const qcByChecklistData = data.qc.byChecklist ?? [];
  const formsByBranchData = Object.entries(data.forms.byBranch).map(([id, count]) => ({
    name: branchNames[id] ?? id,
    count,
  }));
  const formsByCategoryData = Object.entries(data.forms.byCategory ?? {}).map(([category, count]) => ({
    category,
    count,
  }));
  const advancesByBranchData = Object.entries(
    data.hr.advancesList.reduce(
      (acc, row) => {
        const bid = row.employee.branch?.name ?? '—';
        acc[bid] = (acc[bid] ?? 0) + row.amount;
        return acc;
      },
      {} as Record<string, number>
    )
  ).map(([name, amount]) => ({ name, amount: Number(amount.toFixed(2)) }));
  const averageAdvanceAmount = data.hr.advances.requested
    ? data.hr.advances.requestedAmount / data.hr.advances.requested
    : 0;
  const leaveStatusData = data.hr.leave
    ? [
        { name: t.status.pending, count: data.hr.leave.totalPending, color: '#eab308' },
        { name: t.status.approved, count: data.hr.leave.totalApproved, color: '#34C759' },
        { name: t.status.denied, count: data.hr.leave.totalDenied, color: '#ef4444' },
      ]
    : [];
  const leaveTypeData = data.hr.leave
    ? Object.entries(
        (data.hr.leave.logs ?? []).reduce(
          (acc, row) => {
            acc[row.type] = (acc[row.type] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        )
      ).map(([type, count]) => ({ type, count }))
    : [];
  const chartTick = { fill: '#6b7280', fontSize: 12 };
  const chartAxisLine = { stroke: '#d1d5db' };
  const chartTooltipStyle = {
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
    color: '#111827',
  };
  const chartTooltipLabelStyle = { color: '#374151', fontWeight: 600 };

  function truncateLabel(value: string, max = 12) {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
  }

  function formatDateTick(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function toCsvCell(value: string | number) {
    const raw = String(value ?? '');
    if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  }

  function monthLabelFromKey(key: string) {
    const date = new Date(`${key}-01`);
    if (Number.isNaN(date.getTime())) return key;
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  function downloadCsvFile(filename: string, csv: string) {
    // UTF-8 BOM improves Excel/Numbers Arabic+English CSV rendering.
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Safari/WKWebView can fail if revoked synchronously.
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportSalaryCsv() {
    const rows = data!.salary.rows;
    if (!rows.length) return;
    const header = [t.reports.month, t.common.employee, t.common.branch, t.salary.salary, t.salary.deduction, t.salary.net]
      .map(toCsvCell)
      .join(',');
    const grouped = rows.reduce(
      (acc, row) => {
        const key = row.periodMonth || data!.salary.periodMonth;
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      },
      {} as Record<string, typeof rows>
    );
    const orderedMonths = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
    const bodyLines = orderedMonths.flatMap((monthKey) =>
      grouped[monthKey].map((r) =>
        [monthLabelFromKey(monthKey), r.employeeName, r.branchName, r.salary.toFixed(2), r.deduction.toFixed(2), r.net.toFixed(2)]
          .map(toCsvCell)
          .join(',')
      )
    );
    const csv = [header, ...bodyLines].join('\n');
    downloadCsvFile(`salary-${data!.salary.periodMonth}.csv`, csv);
  }

  function exportAdvancesCsv() {
    const list = data!.hr.advancesList ?? [];
    if (!list.length) return;
    const header = [t.reports.month, t.common.employee, t.common.branch, t.advances.amountJod, t.common.status, t.common.date]
      .map(toCsvCell)
      .join(',');
    const grouped = list.reduce(
      (acc, row) => {
        const d = new Date(row.requestedAt);
        const key = Number.isNaN(d.getTime())
          ? 'unknown'
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      },
      {} as Record<string, typeof list>
    );
    const orderedMonths = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
    const bodyLines = orderedMonths.flatMap((monthKey) =>
      grouped[monthKey].map((a) =>
        [
          monthKey === 'unknown' ? 'Unknown' : monthLabelFromKey(monthKey),
          a.employee.name,
          a.employee.branch?.name ?? '—',
          a.amount.toFixed(2),
          a.status,
          new Date(a.requestedAt).toLocaleDateString(),
        ]
          .map(toCsvCell)
          .join(',')
      )
    );
    const csv = [header, ...bodyLines].join('\n');
    downloadCsvFile(`advances-${data!.salary.periodMonth}.csv`, csv);
  }

  function exportFormsCsv() {
    const list = data!.forms.recent ?? [];
    if (!list.length) return;
    const header = [t.common.employee, t.common.branch, t.forms.createFormName, t.common.status, t.common.date]
      .map(toCsvCell)
      .join(',');
    const body = list
      .map((s) =>
        [s.employee.name, s.branch?.name ?? '—', s.template.title, s.status, new Date(s.submittedAt).toLocaleDateString()]
          .map(toCsvCell)
          .join(',')
      )
      .join('\n');
    const csv = header + '\n' + body;
    downloadCsvFile(`forms-${data!.salary.periodMonth}.csv`, csv);
  }

  const reportCardClass = 'app-section';
  const sectionTitleClass = 'text-xl font-semibold text-app-primary mb-2';
  const labelClass = 'text-sm font-medium text-app-secondary';

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-w-0">
      {/* Sidebar */}
      <aside className="lg:w-52 flex-shrink-0">
        <nav className="sticky top-24 flex flex-wrap lg:flex-col gap-1 p-2 rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-white/50 dark:bg-ios-dark-elevated/50">
          {SIDEBAR_SECTIONS.map(({ id, labelKey }) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                setActiveSection(id);
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3 py-2 rounded-ios text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === id
                  ? 'bg-ios-blue text-white'
                  : 'text-app-secondary hover:bg-gray-200 dark:hover:bg-ios-dark-elevated-2'
              }`}
            >
              {t.reports[labelKey]}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-8">
        {/* Filters */}
        <div className={`flex flex-wrap gap-4 p-6 ${reportCardClass}`}>
          <h3 className="w-full text-base font-semibold text-app-primary mb-1">{t.reports.period} & filters</h3>
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-app-primary">{t.reports.period}</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
              className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-1.5 text-sm"
            >
              <option value="day">{t.reports.daily}</option>
              <option value="week">{t.reports.weekly}</option>
              <option value="month">{t.reports.monthly}</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-app-primary">{t.reports.month}</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-1.5 text-sm min-w-[140px]"
            >
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-app-primary">{t.common.branch}</span>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-1.5 text-sm"
            >
              <option value="">{t.qc.allBranches}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-app-primary">{t.reports.salaryMonth}</span>
            <select
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
              className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-1.5 text-sm min-w-[140px]"
            >
              {monthOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Branch Overview */}
        <section id="branch-overview" className={`scroll-mt-6 ${reportCardClass}`}>
          <h2 className={sectionTitleClass}>{t.reports.branchOverview}</h2>
          <p className="text-sm text-app-muted mb-6">Summary of each branch</p>
          <div className="grid gap-6 sm:grid-cols-2">
            {(data.branchOverview ?? []).map((b) => (
              <div key={b.id} className="rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/50 dark:bg-ios-dark-elevated-2/30 p-5">
                <h3 className="font-semibold text-lg text-app-primary mb-4 pb-2 border-b border-gray-200 dark:border-ios-dark-separator">{b.name}</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <dt className="text-app-muted">{t.reports.headcountByBranch}</dt>
                  <dd className="font-semibold text-app-primary">{b.headcount}</dd>
                  <dt className="text-app-muted">{t.reports.advancesThisPeriod}</dt>
                  <dd className="font-semibold text-app-primary">{b.advancesSum.toFixed(2)} JOD</dd>
                  <dt className="text-app-muted">{t.reports.qcSubmissionsByBranch}</dt>
                  <dd className="font-semibold text-app-primary">{b.qcApproved}/{b.qcTotal} ({b.qcRate}%)</dd>
                  <dt className="text-app-muted">{t.salary.salary}</dt>
                  <dd className="font-semibold text-app-primary">{b.totalSalary.toFixed(2)} JOD</dd>
                </dl>
              </div>
            ))}
          </div>
        </section>

        {/* HR Section */}
        <section id="hr" className={`scroll-mt-6 ${reportCardClass}`}>
          <h2 className={sectionTitleClass}>{t.reports.hrSection}</h2>
          <p className="text-sm text-app-muted mb-6">Headcount and new hires</p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/30 dark:bg-ios-dark-elevated-2/20 p-5">
              <p className={`${labelClass} mb-3`}>{t.reports.headcountByBranch}</p>
              {headcountChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={headcountChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={chartTick} axisLine={chartAxisLine} tickLine={false} tickFormatter={(value) => truncateLabel(String(value), 10)} />
                    <YAxis allowDecimals={false} tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                    <Bar dataKey="count" fill="#007AFF" name={t.reports.employees} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-app-muted text-sm">{t.common.noData}</p>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/30 dark:bg-ios-dark-elevated-2/20 p-5">
              <p className={`${labelClass} mb-3`}>{t.reports.headcountOverTime}</p>
              {data.hr.headcountOverTime?.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.hr.headcountOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                    <YAxis allowDecimals={false} tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                    <Line type="monotone" dataKey="count" stroke="#007AFF" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name={t.reports.employees} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-app-muted text-sm">{t.common.noData}</p>
              )}
            </div>
          </div>
          {data.hr.newHires?.length ? (
            <div className="mt-6 rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/30 dark:bg-ios-dark-elevated-2/20 p-5">
              <p className={`${labelClass} mb-3`}>{t.reports.newHires}</p>
              <ul className="space-y-1 text-sm">
                {data.hr.newHires.map((e) => (
                  <li key={e.id} className="flex justify-between">
                    <span className="font-semibold text-app-primary">{e.name}</span>
                    <span className="text-app-muted">{e.branch.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Leave Section */}
        {data.hr.leave && (
          <section id="leave" className={`scroll-mt-6 ${reportCardClass}`}>
            <h2 className={sectionTitleClass}>{t.reports.leaveSection}</h2>
            <p className="text-sm text-app-muted mb-6">Leave requests overview</p>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-amber-300/60 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-900/20 p-4">
                <p className="text-xs text-amber-700 dark:text-amber-300">{t.status.pending}</p>
                <p className="text-2xl font-semibold text-app-primary">{data.hr.leave.totalPending}</p>
              </div>
              <div className="rounded-lg border border-emerald-300/60 dark:border-emerald-700/40 bg-emerald-50/60 dark:bg-emerald-900/20 p-4">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">{t.status.approved}</p>
                <p className="text-2xl font-semibold text-app-primary">{data.hr.leave.totalApproved}</p>
              </div>
              <div className="rounded-lg border border-red-300/60 dark:border-red-700/40 bg-red-50/60 dark:bg-red-900/20 p-4">
                <p className="text-xs text-red-700 dark:text-red-300">{t.status.denied}</p>
                <p className="text-2xl font-semibold text-app-primary">{data.hr.leave.totalDenied}</p>
              </div>
              <div className="rounded-lg border border-ios-blue/30 bg-ios-blue/5 p-4">
                <p className="text-xs text-ios-blue">{t.reports.leaveDaysApproved}</p>
                <p className="text-2xl font-semibold text-app-primary">{data.hr.leave.totalDaysApproved}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/30 dark:bg-ios-dark-elevated-2/20 p-5">
                <p className={`${labelClass} mb-3`}>{t.reports.leaveByStatus}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={leaveStatusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                    <YAxis allowDecimals={false} tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {leaveStatusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/30 dark:bg-ios-dark-elevated-2/20 p-5">
                <p className={`${labelClass} mb-3`}>{t.reports.leaveByType}</p>
                {leaveTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={leaveTypeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="type" tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                      <YAxis allowDecimals={false} tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                      <Bar dataKey="count" fill="#007AFF" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-app-muted text-sm">{t.common.noData}</p>
                )}
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/30 dark:bg-ios-dark-elevated-2/20 p-5">
              <p className={`${labelClass} mb-3`}>{t.reports.leaveByBranch}</p>
              {Object.keys(data.hr.leave.byBranch).length > 0 ? (
                <ul className="space-y-1.5 text-sm">
                  {Object.entries(data.hr.leave.byBranch).map(([branchId, v]) => (
                    <li key={branchId} className="flex justify-between rounded-md bg-white/70 dark:bg-ios-dark-elevated-2/40 px-3 py-2">
                      <span className="font-semibold text-app-primary">{branchNames[branchId] ?? branchId}</span>
                      <span className="text-app-muted">{t.status.pending}: {v.pending} | {t.status.approved}: {v.approved} | {t.status.denied}: {v.denied} | {t.reports.leaveDaysApproved}: {v.daysApproved}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-app-muted text-sm">{t.common.noData}</p>
              )}
            </div>
            {data.hr.leave.logs?.length > 0 && (
              <div className="mt-4 rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated overflow-x-auto">
                <p className={`${labelClass} p-4 border-b border-gray-200 dark:border-ios-dark-separator`}>{t.reports.leaveLogs}</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-ios-dark-elevated-2/50">
                      <th className="text-left p-2">{t.common.employee}</th>
                      <th className="text-left p-2">{t.common.branch}</th>
                      <th className="text-left p-2">{t.leave.type}</th>
                      <th className="text-left p-2">{t.common.status}</th>
                      <th className="text-left p-2">{t.leave.startDate}</th>
                      <th className="text-left p-2">{t.leave.endDate}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.hr.leave.logs.map((row, i) => (
                      <tr key={row.id} className={`border-t border-gray-200 dark:border-ios-dark-separator ${i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-ios-dark-elevated-2/20'}`}>
                        <td className="p-2 font-semibold text-app-primary">{row.employee.name}</td>
                        <td className="p-2">{row.branch.name}</td>
                        <td className="p-2 capitalize">{row.type}</td>
                        <td className="p-2 capitalize">{row.status}</td>
                        <td className="p-2">{new Date(row.startDate).toLocaleDateString()}</td>
                        <td className="p-2">{new Date(row.endDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Advances Section */}
        <section id="advances" className={`scroll-mt-6 ${reportCardClass}`}>
          <h2 className={sectionTitleClass}>{t.reports.advancesSection}</h2>
          <p className="text-sm text-app-muted mb-6">Advance requests this period</p>
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <div className="rounded-lg border border-ios-blue/30 bg-ios-blue/5 p-4">
              <p className="text-xs text-ios-blue">{t.reports.totalRequested}</p>
              <p className="text-2xl font-semibold text-app-primary">{data.hr.advances.requested}</p>
            </div>
            <div className="rounded-lg border border-emerald-300/60 dark:border-emerald-700/40 bg-emerald-50/60 dark:bg-emerald-900/20 p-4">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">{t.status.approved}</p>
              <p className="text-2xl font-semibold text-app-primary">{data.hr.advances.approved}</p>
            </div>
            <div className="rounded-lg border border-amber-300/60 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-900/20 p-4">
              <p className="text-xs text-amber-700 dark:text-amber-300">{t.status.pending}</p>
              <p className="text-2xl font-semibold text-app-primary">{data.hr.advances.pending}</p>
            </div>
            <div className="rounded-lg border border-gray-300 dark:border-ios-dark-separator bg-gray-50/60 dark:bg-ios-dark-elevated-2/30 p-4">
              <p className="text-xs text-app-muted">{t.reports.avgAdvanceAmount}</p>
              <p className="text-2xl font-semibold text-app-primary">{averageAdvanceAmount.toFixed(2)}</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/30 dark:bg-ios-dark-elevated-2/20 p-5">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.advancesThisPeriod}</p>
              {advancesChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={advancesChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={80}
                      label={false}
                      labelLine={false}
                    >
                      {advancesChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} formatter={(value: number) => [value, t.common.total]} />
                    <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, color: '#4b5563', paddingTop: 16 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-app-muted text-sm">{t.reports.noAdvancesInPeriod}</p>
              )}
              {advancesChartData.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {advancesChartData.map((entry) => {
                    const total = data.hr.advances.requested || 1;
                    const pct = Math.round((entry.value / total) * 100);
                    return (
                      <div key={entry.name} className="flex items-center justify-between gap-2 text-sm">
                        <span className="inline-flex items-center gap-2 text-app-primary font-semibold">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          {entry.name}
                        </span>
                        <span className="text-app-secondary tabular-nums">
                          {entry.value} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-sm text-app-primary font-semibold mt-2">
                {t.reports.totalRequested}: {data.hr.advances.requested} | {t.status.approved}: {data.hr.advances.approved} | {t.status.denied}: {data.hr.advances.denied} | {t.status.pending}: {data.hr.advances.pending}
              </p>
              {(data.hr.advances as { approvedAmount?: number }).approvedAmount != null && (
                <p className="text-sm text-app-primary font-semibold mt-1">
                  {t.reports.amountInJod}: {t.status.approved} {(data.hr.advances as { approvedAmount?: number }).approvedAmount?.toFixed(2)} | {t.status.pending} {(data.hr.advances as { pendingAmount?: number }).pendingAmount?.toFixed(2)} | {t.status.denied} {(data.hr.advances as { deniedAmount?: number }).deniedAmount?.toFixed(2)} JOD
                </p>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/30 dark:bg-ios-dark-elevated-2/20 p-5">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.advancesByBranchAmount}</p>
              {advancesByBranchData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={advancesByBranchData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={chartTick} axisLine={chartAxisLine} tickLine={false} tickFormatter={(value) => truncateLabel(String(value), 10)} />
                    <YAxis tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} formatter={(value: number) => [`${value.toFixed(2)} JOD`, t.reports.amountInJod]} />
                    <Bar dataKey="amount" fill="#5856D6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-app-muted text-sm">{t.reports.noAdvancesInPeriod}</p>
              )}
            </div>
          </div>
          {data.hr.advancesList?.length ? (
            <div className="mt-6 rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/30 dark:bg-ios-dark-elevated-2/20 overflow-x-auto">
              <p className={`${labelClass} p-4 border-b border-gray-200 dark:border-ios-dark-separator`}>{t.reports.advancesLogs}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-ios-dark-elevated-2/50">
                    <th className="text-left p-2">{t.common.employee}</th>
                    <th className="text-left p-2">{t.common.branch}</th>
                    <th className="text-right p-2">{t.advances.amountJod}</th>
                    <th className="text-left p-2">{t.common.status}</th>
                    <th className="text-left p-2">{t.common.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.hr.advancesList.map((a, i) => (
                    <tr key={a.id} className={`border-t border-gray-200 dark:border-ios-dark-separator ${i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-ios-dark-elevated-2/20'}`}>
                      <td className="p-2">{a.employee.name}</td>
                      <td className="p-2">{a.employee.branch?.name ?? '—'}</td>
                      <td className="p-2 text-right">{a.amount.toFixed(2)}</td>
                      <td className="p-2">{a.status}</td>
                      <td className="p-2">{new Date(a.requestedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {/* QC Section */}
        <section id="qc" className={`scroll-mt-6 ${reportCardClass}`}>
          <h2 className={sectionTitleClass}>{t.reports.qcSection}</h2>
          <p className="text-sm text-app-muted mb-6">QC submissions and ratings</p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.qcSubmissionsByBranch}</p>
              {qcByBranchData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={qcByBranchData} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={90} tick={chartTick} axisLine={chartAxisLine} tickLine={false} tickFormatter={(value) => truncateLabel(String(value), 12)} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                    <Bar dataKey="total" fill="#007AFF" name={t.common.total} radius={[0, 6, 6, 0]} />
                    <Bar dataKey="approved" fill="#34C759" name={t.status.approved} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-app-muted text-sm">{t.reports.noSubmissionsInPeriod}</p>
              )}
              <p className="text-sm text-app-secondary mt-2">
                <span className="font-semibold text-app-primary">
                  {t.common.total}: {data.qc.total} | {t.status.approved}: {data.qc.approved} | {t.status.denied}: {data.qc.denied} | {t.status.pending}: {data.qc.pending}
                </span>
                {data.qc.averageRating != null && ` | ${t.reports.avgRating} ${data.qc.averageRating.toFixed(1)}`}
              </p>
            </div>
            <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.ratingDistribution}</p>
              {ratingDistData.some((d) => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ratingDistData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="rating" tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                    <YAxis allowDecimals={false} tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                    <Bar dataKey="count" fill="#5856D6" name={t.common.total} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-app-muted text-sm">{t.common.noData}</p>
              )}
            </div>
          </div>
          {data.qc.trend?.length ? (
            <div className="mt-4 rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.qcTrend}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.qc.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={chartTick} axisLine={chartAxisLine} tickLine={false} tickFormatter={formatDateTick} minTickGap={20} />
                  <YAxis allowDecimals={false} tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} labelFormatter={formatDateTick} />
                  <Line type="monotone" dataKey="total" stroke="#007AFF" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} name={t.common.total} />
                  <Line type="monotone" dataKey="approved" stroke="#34C759" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} name={t.status.approved} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {qcByChecklistData.length ? (
            <div className="mt-4 rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.qcByChecklist}</p>
              <ResponsiveContainer width="100%" height={Math.max(120, qcByChecklistData.length * 40)}>
                <BarChart data={qcByChecklistData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={90} tick={chartTick} axisLine={chartAxisLine} tickLine={false} tickFormatter={(value) => truncateLabel(String(value), 14)} />
                  <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                  <Bar dataKey="total" fill="#007AFF" name={t.common.total} radius={[0, 6, 6, 0]} />
                  <Bar dataKey="approved" fill="#34C759" name={t.status.approved} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {data.qc.lateSubmissionsList?.length ? (
            <div className="mt-4 rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.lateSubmissions}</p>
              <ul className="space-y-2 text-sm">
                {data.qc.lateSubmissionsList.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-lg border border-amber-200/70 dark:border-amber-700/40 bg-amber-50/50 dark:bg-amber-900/15 px-3 py-2">
                    <span className="font-semibold text-app-primary">{s.employee.name}</span>
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      {s.branch?.name ?? '—'} · {new Date(s.submittedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            data.qc.lateCount === 0 && (
              <p className="mt-4 text-sm text-app-muted">{t.reports.noLateSubmissions}</p>
            )
          )}
          {data.qc.logs?.length ? (
            <div className="mt-4 rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated overflow-x-auto">
              <div className="p-4 border-b border-gray-200 dark:border-ios-dark-separator flex items-center justify-between gap-3">
                <p className={labelClass}>{t.reports.qcLogs}</p>
                <button
                  type="button"
                  onClick={() => setQcLogsMinimized((v) => !v)}
                  className="rounded-md border border-gray-300 dark:border-ios-dark-separator px-2.5 py-1 text-xs font-medium text-app-secondary hover:bg-gray-100 dark:hover:bg-ios-dark-elevated-2"
                >
                  {qcLogsMinimized ? t.common.show : t.common.hide}
                </button>
              </div>
              {!qcLogsMinimized && (
                <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-ios-dark-elevated-2/50">
                    <th className="text-left p-2">{t.common.employee}</th>
                    <th className="text-left p-2">{t.common.branch}</th>
                    <th className="text-left p-2">{t.common.checklist}</th>
                    <th className="text-left p-2">{t.common.status}</th>
                    <th className="text-right p-2">{t.reviews.rating}</th>
                    <th className="text-left p-2">{t.common.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.qc.logs.map((row, i) => (
                    <tr key={row.id} className={`border-t border-gray-200 dark:border-ios-dark-separator ${i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-ios-dark-elevated-2/20'}`}>
                      <td className="p-2 font-semibold text-app-primary">{row.employee.name}</td>
                      <td className="p-2">{row.branch.name}</td>
                      <td className="p-2">{row.checklistName}</td>
                      <td className="p-2 capitalize">{row.status}{row.isLate ? ` (${t.qc.lateNote})` : ''}</td>
                      <td className="p-2 text-right">{row.rating ?? '—'}</td>
                      <td className="p-2">{new Date(row.submittedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              )}
            </div>
          ) : null}

          <div className="mt-4 rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <p className="text-sm font-medium text-app-secondary">{t.reports.qcArchiveTitle}</p>
              <span className="text-xs rounded-full px-2 py-0.5 bg-ios-blue/10 text-ios-blue font-semibold">
                {qcArchiveRows.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <label className="text-sm text-app-label">
                {t.reports.fromDate}
                <input
                  type="date"
                  value={qcArchiveFrom}
                  onChange={(e) => setQcArchiveFrom(e.target.value)}
                  className="app-input mt-1.5"
                />
              </label>
              <label className="text-sm text-app-label">
                {t.reports.toDate}
                <input
                  type="date"
                  value={qcArchiveTo}
                  onChange={(e) => setQcArchiveTo(e.target.value)}
                  className="app-input mt-1.5"
                />
              </label>
            </div>

            {qcArchiveRows.length === 0 ? (
              <p className="text-sm text-app-muted">{t.common.noData}</p>
            ) : (
              <div className="space-y-5">
                {Object.entries(qcArchiveByMonth)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([monthKey, rows]) => (
                    <div key={monthKey}>
                      <h4 className="text-sm font-semibold text-app-primary mb-2">
                        {new Date(`${monthKey}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                      </h4>
                      <ul className="space-y-2">
                        {rows.map((row) => (
                          <li key={row.id} className="rounded-ios border border-gray-200 dark:border-ios-dark-separator p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-app-primary">
                                {row.employee.name} - {row.checklistName}
                              </p>
                              <span className="text-xs text-app-muted">{new Date(row.submittedAt).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-app-secondary mt-1">
                              {row.branch.name} - {row.status}
                              {row.rating != null ? ` - ${t.qc.rating}: ${row.rating}/5` : ''}
                            </p>
                            {row.photos?.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {row.photos.map((photo) => (
                                  <a key={photo.id} href={photo.filePath} target="_blank" rel="noopener noreferrer">
                                    <img src={photo.filePath} alt="QC archive" className="h-16 w-16 rounded border border-gray-200 dark:border-ios-dark-separator object-cover" />
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>

        {/* Forms Section */}
        <section id="forms" className={`scroll-mt-6 ${reportCardClass}`}>
          <h2 className={sectionTitleClass}>{t.reports.formsSection}</h2>
          <p className="text-sm text-app-muted mb-6">{t.reports.formsOverview}</p>
          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <div className="rounded-lg border border-ios-blue/30 bg-ios-blue/5 p-4">
              <p className="text-xs text-ios-blue">{t.common.total}</p>
              <p className="text-2xl font-semibold text-app-primary">{data.forms.total}</p>
            </div>
            <div className="rounded-lg border border-amber-300/60 dark:border-amber-700/40 bg-amber-50/60 dark:bg-amber-900/20 p-4">
              <p className="text-xs text-amber-700 dark:text-amber-300">{t.reports.formsFiled}</p>
              <p className="text-2xl font-semibold text-app-primary">{data.forms.filed}</p>
            </div>
            <div className="rounded-lg border border-emerald-300/60 dark:border-emerald-700/40 bg-emerald-50/60 dark:bg-emerald-900/20 p-4">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">{t.status.approved}</p>
              <p className="text-2xl font-semibold text-app-primary">{data.forms.approved}</p>
            </div>
            <div className="rounded-lg border border-red-300/60 dark:border-red-700/40 bg-red-50/60 dark:bg-red-900/20 p-4">
              <p className="text-xs text-red-700 dark:text-red-300">{t.status.denied}</p>
              <p className="text-2xl font-semibold text-app-primary">{data.forms.denied}</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.formsStatus}</p>
              <p className="text-sm text-app-primary font-semibold">
                {t.common.total}: {data.forms.total} | {t.reports.formsFiled}: {data.forms.filed} | {t.status.approved}: {data.forms.approved} | {t.status.denied}: {data.forms.denied}
              </p>
              {data.forms.averageRating != null && (
                <p className="text-sm text-app-secondary mt-1">{t.reports.avgRating} {data.forms.averageRating.toFixed(1)}</p>
              )}
            </div>
            <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.formsByBranch}</p>
              {formsByBranchData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={formsByBranchData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={chartTick} axisLine={chartAxisLine} tickLine={false} tickFormatter={(value) => truncateLabel(String(value), 10)} />
                    <YAxis allowDecimals={false} tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                    <Bar dataKey="count" fill="#5856D6" name={t.forms.mySubmissions} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-app-muted text-sm">{t.common.noData}</p>
              )}
            </div>
            <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.formsByCategory}</p>
              {formsByCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={formsByCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="category" tick={chartTick} axisLine={chartAxisLine} tickLine={false} tickFormatter={(value) => truncateLabel(String(value), 10)} />
                    <YAxis allowDecimals={false} tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                    <Bar dataKey="count" fill="#FF9500" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-app-muted text-sm">{t.common.noData}</p>
              )}
            </div>
          </div>
          {data.forms.trend?.length ? (
            <div className="mt-4 rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.formsTrend}</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.forms.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={chartTick} axisLine={chartAxisLine} tickLine={false} tickFormatter={formatDateTick} minTickGap={20} />
                  <YAxis allowDecimals={false} tick={chartTick} axisLine={chartAxisLine} tickLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} labelFormatter={formatDateTick} />
                  <Line type="monotone" dataKey="total" stroke="#5856D6" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} name={t.common.total} />
                  <Line type="monotone" dataKey="filed" stroke="#FF9500" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} name={t.reports.formsFiled} />
                  <Line type="monotone" dataKey="approved" stroke="#34C759" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} name={t.status.approved} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}
          {data.forms.byTemplate?.length ? (
            <div className="mt-4 rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4 overflow-x-auto">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.formsByTemplate}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-ios-dark-elevated-2/50">
                    <th className="text-left p-2">{t.forms.createFormName}</th>
                    <th className="text-left p-2">{t.forms.createFormCategory}</th>
                    <th className="text-right p-2">{t.common.total}</th>
                    <th className="text-right p-2">{t.reports.formsFiled}</th>
                    <th className="text-right p-2">{t.status.approved}</th>
                    <th className="text-right p-2">{t.status.denied}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.forms.byTemplate.map((row, i) => (
                    <tr key={row.templateId} className={`border-t border-gray-200 dark:border-ios-dark-separator ${i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-ios-dark-elevated-2/20'}`}>
                      <td className="p-2">{row.title}</td>
                      <td className="p-2">{row.category}</td>
                      <td className="p-2 text-right">{row.total}</td>
                      <td className="p-2 text-right">{row.filed}</td>
                      <td className="p-2 text-right">{row.approved}</td>
                      <td className="p-2 text-right">{row.denied}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {data.forms.recent?.length ? (
            <div className="mt-4 rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4 overflow-x-auto">
              <p className="text-sm font-medium text-app-secondary mb-2">{t.reports.formsLogs}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 dark:bg-ios-dark-elevated-2/50">
                    <th className="text-left p-2">{t.common.employee}</th>
                    <th className="text-left p-2">{t.common.branch}</th>
                    <th className="text-left p-2">{t.forms.createFormName}</th>
                    <th className="text-left p-2">{t.forms.createFormCategory}</th>
                    <th className="text-left p-2">{t.common.status}</th>
                    <th className="text-left p-2">{t.common.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.forms.recent.map((row, i) => (
                    <tr key={row.id} className={`border-t border-gray-200 dark:border-ios-dark-separator ${i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-ios-dark-elevated-2/20'}`}>
                      <td className="p-2 font-semibold text-app-primary">{row.employee.name}</td>
                      <td className="p-2">{row.branch?.name ?? '—'}</td>
                      <td className="p-2">{row.template.title}</td>
                      <td className="p-2">{row.template.category}</td>
                      <td className="p-2 capitalize">{row.status}</td>
                      <td className="p-2">{new Date(row.submittedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {/* Manager Reports Section */}
        <section id="manager-reports" className={`scroll-mt-6 ${reportCardClass}`}>
          <h2 className={sectionTitleClass}>{t.reports.managerReportsSection}</h2>
          <p className="text-sm text-app-muted mb-6">{t.reports.managerReportsOverview}</p>
          {!data.managerReports?.length ? (
            <p className="text-app-muted text-sm">{t.common.noData}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.managerReports.map((m) => {
                const approvalRate = m.overall.total > 0 ? Math.round((m.overall.approved / m.overall.total) * 100) : 0;
                return (
                  <article
                    key={m.managerId}
                    className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4 sm:p-5 shadow-sm dark:shadow-none"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-app-primary">{m.managerName}</h3>
                        <p className="text-sm text-app-secondary">{m.branchName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-app-muted">{t.reports.teamSize}</p>
                        <p className="text-xl font-semibold text-app-primary">{m.teamSize}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-ios border border-gray-200 dark:border-ios-dark-separator px-3 py-2">
                        <p className="text-xs text-app-muted">{t.reports.qcSection}</p>
                        <p className="text-sm font-semibold text-app-primary">{m.qc.approved}/{m.qc.total}</p>
                      </div>
                      <div className="rounded-ios border border-gray-200 dark:border-ios-dark-separator px-3 py-2">
                        <p className="text-xs text-app-muted">{t.reports.formsSection}</p>
                        <p className="text-sm font-semibold text-app-primary">{m.forms.total}</p>
                        <p className="text-xs text-app-muted">
                          {t.reports.formsFiled}: {m.forms.filed}
                        </p>
                      </div>
                      <div className="rounded-ios border border-gray-200 dark:border-ios-dark-separator px-3 py-2">
                        <p className="text-xs text-app-muted">{t.reports.advancesSection}</p>
                        <p className="text-sm font-semibold text-app-primary">{m.advances.approved}/{m.advances.total}</p>
                      </div>
                      <div className="rounded-ios border border-gray-200 dark:border-ios-dark-separator px-3 py-2">
                        <p className="text-xs text-app-muted">{t.reports.leaveSection}</p>
                        <p className="text-sm font-semibold text-app-primary">{m.leave.approved}/{m.leave.total}</p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-ios border border-gray-200 dark:border-ios-dark-separator p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-app-secondary">{t.common.total}</p>
                        <p className="text-sm font-semibold text-app-primary">{m.overall.approved}/{m.overall.total}</p>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-ios-dark-elevated-2 overflow-hidden">
                        <div className="h-full bg-ios-blue" style={{ width: `${approvalRate}%` }} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-100 px-2 py-0.5">
                          {t.status.approved}: {m.overall.approved}
                        </span>
                        <span className="rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100 px-2 py-0.5">
                          {t.status.denied}: {m.overall.denied}
                        </span>
                        <span className="rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100 px-2 py-0.5">
                          {t.status.pending}: {m.overall.pending}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Activity Section */}
        <section id="activity" className={`scroll-mt-6 ${reportCardClass}`}>
          <h2 className={sectionTitleClass}>{t.reports.activitySection}</h2>
          <p className="text-sm text-app-muted mb-6">{t.reports.activityOverview}</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/30 dark:bg-ios-dark-elevated-2/20 p-4">
              <p className="text-sm text-app-muted">{t.reports.transferCount}</p>
              <p className="text-2xl font-semibold text-app-primary">{data.activity.transfers.total}</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/30 dark:bg-ios-dark-elevated-2/20 p-4">
              <p className="text-sm text-app-muted">{t.reports.reviewCount}</p>
              <p className="text-2xl font-semibold text-app-primary">{data.activity.reviews.total}</p>
              {data.activity.reviews.averageRating != null && (
                <p className="text-xs text-app-secondary mt-1">{t.reports.avgRating} {data.activity.reviews.averageRating.toFixed(1)}</p>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-50/30 dark:bg-ios-dark-elevated-2/20 p-4">
              <p className="text-sm text-app-muted">{t.reports.documentCount}</p>
              <p className="text-2xl font-semibold text-app-primary">{data.activity.documents.total}</p>
            </div>
          </div>
        </section>

        {/* Salary Section */}
        <section id="salary" className={`scroll-mt-6 ${reportCardClass}`}>
          <h2 className={sectionTitleClass}>
            {t.reports.salaryDeductions} ({new Date(data.salary.periodMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })})
          </h2>
          <p className="text-sm text-app-muted mb-6">Salary and deductions by employee</p>
          <div className="rounded-lg border border-gray-200 dark:border-ios-dark-separator overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-ios-dark-elevated-2/50">
                  <th className="text-left p-2">{t.common.employee}</th>
                  <th className="text-left p-2">{t.common.branch}</th>
                  <th className="text-right p-2">{t.salary.salary}</th>
                  <th className="text-right p-2">{t.salary.deduction}</th>
                  <th className="text-right p-2">{t.salary.net}</th>
                </tr>
              </thead>
              <tbody>
                {data.salary.rows.map((r, i) => (
                  <tr key={i} className={`border-t border-gray-200 dark:border-ios-dark-separator ${i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-ios-dark-elevated-2/20'}`}>
                    <td className="p-2">{r.employeeName}</td>
                    <td className="p-2">{r.branchName}</td>
                    <td className="p-2 text-right">{r.salary.toFixed(2)}</td>
                    <td className="p-2 text-right">{r.deduction.toFixed(2)}</td>
                    <td className="p-2 text-right">{r.net.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-ios-dark-separator font-medium bg-gray-100 dark:bg-ios-dark-elevated-2/30">
                  <td className="p-2" colSpan={2}>{t.common.total}</td>
                  <td className="p-2 text-right">{data.salary.totals.salary.toFixed(2)}</td>
                  <td className="p-2 text-right">{data.salary.totals.deduction.toFixed(2)}</td>
                  <td className="p-2 text-right">{data.salary.totals.net.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Export Section */}
        <section id="export" className={`scroll-mt-6 ${reportCardClass}`}>
          <h2 className={sectionTitleClass}>{t.reports.exportCsv}</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportSalaryCsv}
              className="rounded-ios bg-ios-blue text-white px-4 py-2.5 text-sm font-medium active:opacity-90"
            >
              {t.reports.exportSalary}
            </button>
            <button
              type="button"
              onClick={exportAdvancesCsv}
              className="rounded-ios border border-gray-300 dark:border-ios-dark-separator px-4 py-2.5 text-sm font-medium text-app-primary hover:bg-gray-100 dark:hover:bg-ios-dark-elevated-2"
            >
              {t.reports.exportAdvances}
            </button>
            <button
              type="button"
              onClick={exportFormsCsv}
              className="rounded-ios border border-gray-300 dark:border-ios-dark-separator px-4 py-2.5 text-sm font-medium text-app-primary hover:bg-gray-100 dark:hover:bg-ios-dark-elevated-2"
            >
              {t.reports.exportForms}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

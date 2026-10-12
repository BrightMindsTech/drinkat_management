'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Emp = {
  id: string;
  name: string;
  role: string;
  branchId: string;
  branch: { name: string };
  photoCheckSetting: { required: boolean; updatedAt: string } | null;
};
type Branch = { id: string; name: string };

export function PhotoOpsPanel() {
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [q, setQ] = useState('');
  const [branchId, setBranchId] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/photo-ops/employees', { credentials: 'include', cache: 'no-store' });
    const json = (await res.json()) as { employees?: Emp[]; branches?: Branch[]; error?: string };
    if (!res.ok) {
      setMsg(json.error || 'Could not load employees');
      setLoading(false);
      return;
    }
    setEmployees(json.employees ?? []);
    setBranches(json.branches ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return employees.filter((e) => {
      if (branchId && e.branchId !== branchId) return false;
      if (!needle) return true;
      return e.name.toLowerCase().includes(needle) || e.branch.name.toLowerCase().includes(needle);
    });
  }, [employees, q, branchId]);

  const onCount = useMemo(() => employees.filter((e) => e.photoCheckSetting?.required).length, [employees]);

  async function toggle(emp: Emp, required: boolean) {
    if (busyId) return;
    setBusyId(emp.id);
    setMsg(null);
    const previous = employees;
    setEmployees((rows) =>
      rows.map((row) =>
        row.id === emp.id
          ? { ...row, photoCheckSetting: { required, updatedAt: new Date().toISOString() } }
          : row
      )
    );
    try {
      const res = await fetch('/api/photo-ops/employees', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: emp.id, required }),
      });
      const json = (await res.json()) as { error?: string; results?: { tasksCreated?: number }[] };
      if (!res.ok) {
        setEmployees(previous);
        setMsg(json.error || 'Could not save. Try again.');
        return;
      }
      const created = json.results?.[0]?.tasksCreated ?? 0;
      setMsg(
        required
          ? created
            ? `ON · ${emp.name} · ${created} task${created === 1 ? '' : 's'} for remaining windows today`
            : `ON · ${emp.name} · tasks will appear at the next window (Asia/Amman)`
          : `OFF · ${emp.name} · open photo tasks cancelled`
      );
    } catch {
      setEmployees(previous);
      setMsg('Network error. Try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-app-primary">Photo checks</h1>
        <p className="mt-1 text-sm leading-relaxed text-app-muted">
          Flip someone on and they receive the live photo tasks for the remaining official windows today, then every
          morning / midday / night (Asia/Amman). Flip off to cancel open tasks.
        </p>
        <p className="mt-1 text-sm leading-relaxed text-app-muted">
          شغّل الموظف فيستلم مهام الصور في أوقاتها. الإيقاف يلغي المهام المفتوحة.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          className="min-h-12 flex-1 rounded-2xl border border-gray-200 bg-white px-4 text-base dark:border-ios-dark-separator dark:bg-ios-dark-elevated"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name"
        />
        <select
          className="min-h-12 max-w-[42%] rounded-2xl border border-gray-200 bg-white px-3 text-sm dark:border-ios-dark-separator dark:bg-ios-dark-elevated"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs font-medium text-app-muted">
        {loading ? 'Loading…' : `${onCount} on · ${employees.length} people`}
      </p>
      {msg ? (
        <p className="rounded-2xl bg-ios-blue/10 px-4 py-3 text-sm font-medium text-ios-blue">{msg}</p>
      ) : null}

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-3xl border border-gray-200 bg-white dark:divide-ios-dark-separator dark:border-ios-dark-separator dark:bg-ios-dark-elevated">
        {visible.map((emp) => {
          const on = emp.photoCheckSetting?.required === true;
          const busy = busyId === emp.id;
          return (
            <li key={emp.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-semibold text-app-primary">{emp.name}</p>
                <p className="truncate text-xs text-app-muted">
                  {emp.branch.name} · {emp.role.replaceAll('_', ' ')}
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(busyId)}
                aria-pressed={on}
                onClick={() => void toggle(emp, !on)}
                className={`relative h-8 w-14 shrink-0 touch-manipulation rounded-full transition-colors duration-200 disabled:opacity-60 ${
                  on ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-ios-dark-fill'
                }`}
              >
                <span
                  className="absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-[inset-inline-start] duration-200"
                  style={{ insetInlineStart: on ? '1.75rem' : '0.25rem', opacity: busy ? 0.7 : 1 }}
                />
                <span className="sr-only">{on ? 'On' : 'Off'}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {!loading && visible.length === 0 ? (
        <p className="text-center text-sm text-app-muted">No matching employees.</p>
      ) : null}
    </div>
  );
}

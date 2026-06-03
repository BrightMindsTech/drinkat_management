'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Checklist, ChecklistItem, ChecklistAssignment, Employee, Branch, Department, QcSubmission, SubmissionPhoto } from '@prisma/client';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';
import { formatAppClockTimeLabel, formatAppDateTime } from '@/lib/format-datetime';
import { useGuardedAction } from '@/contexts/AsyncActionContext';

type ChecklistWithItems = Checklist & { branch: Branch | null; items: ChecklistItem[] };
type AssignmentWithRelations = ChecklistAssignment & {
  checklist: Checklist;
  employee: Employee & { branch: Branch };
  branch: Branch;
};
type SubmissionWithRelations = QcSubmission & {
  assignment: ChecklistAssignment & { checklist: Checklist; employee: Employee & { branch: Branch }; branch: Branch };
  employee: Employee & { branch: Branch };
  photos: SubmissionPhoto[];
};

export function QCReviewView({
  checklists: initialChecklists,
  assignments: initialAssignments,
  submissions: initialSubmissions,
  branches,
  employees,
}: {
  checklists: ChecklistWithItems[];
  assignments: AssignmentWithRelations[];
  submissions: SubmissionWithRelations[];
  branches: Branch[];
  employees: (Employee & { branch: Branch; department?: Department | null })[];
}) {
  const { t, locale } = useLanguage();
  const { run, isBusy } = useGuardedAction();
  const [checklists, setChecklists] = useState(initialChecklists);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [showNewChecklist, setShowNewChecklist] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');
  const [expandedSubmissionDetails, setExpandedSubmissionDetails] = useState<Record<string, boolean>>({});
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  const ASSIGNMENT_GROUP_ACCENTS = [
    {
      header: 'bg-ios-blue/10 border-ios-blue/25 text-ios-blue',
      row: 'bg-ios-blue/[0.03] dark:bg-ios-blue/10',
    },
    {
      header: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-300',
      row: 'bg-emerald-500/[0.04] dark:bg-emerald-500/10',
    },
    {
      header: 'bg-violet-500/10 border-violet-500/25 text-violet-800 dark:text-violet-300',
      row: 'bg-violet-500/[0.04] dark:bg-violet-500/10',
    },
    {
      header: 'bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-200',
      row: 'bg-amber-500/[0.04] dark:bg-amber-500/10',
    },
    {
      header: 'bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-300',
      row: 'bg-rose-500/[0.04] dark:bg-rose-500/10',
    },
  ] as const;

  async function createChecklist(name: string, branchId: string | null, repeatsDaily: boolean, deadlineTime: string, items: { title: string }[]) {
    await run('qc', async () => {
    const res = await fetch('/api/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        branchId: branchId || undefined,
        repeatsDaily,
        deadlineTime,
        items: items.map((it, i) => ({ title: it.title, sortOrder: i })),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setChecklists((prev) => [...prev, data]);
      setShowNewChecklist(false);
    }
    });
  }

  async function updateChecklist(id: string, data: { name: string; branchId: string | null; repeatsDaily: boolean; deadlineTime: string }) {
    await run('qc', async () => {
    const res = await fetch(`/api/checklists/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    if (res.ok) {
      setChecklists((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      setAssignments((prev) =>
        prev.map((a) => (a.checklistId === id ? { ...a, checklist: { ...a.checklist, ...updated } } : a))
      );
    }
    });
  }

  async function deleteChecklist(id: string) {
    await run('qc', async () => {
    const res = await fetch(`/api/checklists/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setChecklists((prev) => prev.filter((c) => c.id !== id));
      setAssignments((prev) => prev.filter((a) => a.checklistId !== id));
      setEditingChecklistId(null);
    }
    });
  }

  async function addChecklistItem(checklistId: string, title: string) {
    await run('qc', async () => {
    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return;
    const res = await fetch(`/api/checklists/${checklistId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, sortOrder: checklist.items.length }),
    });
    const item = await res.json();
    if (res.ok) {
      setChecklists((prev) =>
        prev.map((c) => (c.id === checklistId ? { ...c, items: [...c.items, item] } : c))
      );
    }
    });
  }

  async function removeChecklistItem(checklistId: string, itemId: string) {
    await run('qc', async () => {
    const res = await fetch(`/api/checklists/${checklistId}/items/${itemId}`, { method: 'DELETE' });
    if (res.ok) {
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === checklistId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
        )
      );
    }
    });
  }

  async function assignChecklistToPeople(
    checklistId: string,
    employeeIds: string[],
    dueDate?: string
  ): Promise<{ created: AssignmentWithRelations[]; skipped: { employeeId: string; reason: string }[] }> {
    let result = { created: [] as AssignmentWithRelations[], skipped: [] as { employeeId: string; reason: string }[] };
    await run('qc', async () => {
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklistId, employeeIds, dueDate }),
    });
    const data = (await res.json()) as {
      created?: AssignmentWithRelations[];
      skipped?: { employeeId: string; reason: string }[];
      error?: string;
    };
    if (!res.ok || !data.created) {
      throw new Error(typeof data.error === 'string' ? data.error : 'Assignment failed');
    }
    setAssignments((prev) => [...prev, ...data.created!]);
    result = { created: data.created, skipped: data.skipped ?? [] };
    });
    return result;
  }

  async function unassignAssignment(assignment: AssignmentWithRelations) {
    const msg = interpolate(t.qc.unassignConfirm, { name: assignment.employee.name });
    if (!window.confirm(msg)) return;
    setUnassigningId(assignment.id);
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, { method: 'DELETE' });
      if (res.status === 204 || res.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
        return;
      }
      const raw = await res.text();
      let message = t.qc.unassignFailed;
      try {
        const d = JSON.parse(raw) as { error?: unknown; detail?: unknown };
        if (typeof d.error === 'string') message = d.error;
        else if (res.status === 403) message = 'Forbidden';
        else if (res.status === 404) message = t.qc.unassignNotFound;
      } catch {
        if (res.status === 404) message = t.qc.unassignNotFound;
      }
      alert(message);
    } finally {
      setUnassigningId(null);
    }
  }

  async function reviewSubmission(id: string, status: 'approved' | 'denied', rating?: number, comments?: string) {
    await run('qc', async () => {
    const res = await fetch(`/api/qc/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rating, comments }),
    });
    const data = await res.json();
    if (res.ok) setSubmissions((prev) => prev.map((s) => (s.id === id ? data : s)));
    });
  }

  const pending = submissions.filter((s) => s.status === 'pending');
  const historyRows = useMemo(() => {
    const from = historyFrom ? new Date(`${historyFrom}T00:00:00`) : null;
    const to = historyTo ? new Date(`${historyTo}T23:59:59.999`) : null;
    return submissions
      .filter((s) => s.status !== 'pending')
      .filter((s) => {
        const d = new Date(s.submittedAt);
        if (Number.isNaN(d.getTime())) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [submissions, historyFrom, historyTo]);

  const assignmentsByChecklist = useMemo(() => {
    const map = new Map<
      string,
      { checklist: Checklist; rows: AssignmentWithRelations[] }
    >();
    for (const a of assignments) {
      const existing = map.get(a.checklistId);
      if (existing) existing.rows.push(a);
      else map.set(a.checklistId, { checklist: a.checklist, rows: [a] });
    }
    return [...map.values()]
      .map((g) => ({
        ...g,
        rows: [...g.rows].sort((a, b) => {
          const branchCmp = a.branch.name.localeCompare(b.branch.name);
          if (branchCmp !== 0) return branchCmp;
          return a.employee.name.localeCompare(b.employee.name);
        }),
      }))
      .sort((a, b) => a.checklist.name.localeCompare(b.checklist.name));
  }, [assignments]);

  const historyByMonth = useMemo(() => {
    return historyRows.reduce(
      (acc, row) => {
        const d = new Date(row.submittedAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      },
      {} as Record<string, SubmissionWithRelations[]>
    );
  }, [historyRows]);

  const sectionClass = 'app-section scroll-mt-28';

  return (
    <div className="app-page">
      <section id="qc-review-checklists" className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-app-primary">{t.qc.checklists}</h2>
          <button
            type="button"
            onClick={() => setShowNewChecklist(true)}
            className="app-btn-primary"
          >
            {t.qc.newChecklist}
          </button>
        </div>
        {showNewChecklist && (
          <NewChecklistForm
            branches={branches}
            onSave={(name, branchId, repeatsDaily, deadlineTime, items) =>
              createChecklist(name, branchId, repeatsDaily, deadlineTime, items)
            }
            onCancel={() => setShowNewChecklist(false)}
          />
        )}
        <ul className="grid gap-2 sm:grid-cols-2">
          {checklists.map((c) => (
            <li key={c.id} className="rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated overflow-hidden">
              <div className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-medium text-app-primary">{c.name}</span>
                  {c.branch && <span className="text-sm text-app-muted ml-2">({c.branch.name})</span>}
                  <p className="text-sm text-app-muted mt-1">
                    {interpolate(t.qc.itemsCount, { count: String(c.items.length) })}
                    {c.repeatsDaily && ` • ${t.qc.repeatsDaily}`}
                    {' • '}{t.qc.deadlineTime}: {formatAppClockTimeLabel(c.deadlineTime, locale)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingChecklistId(editingChecklistId === c.id ? null : c.id)}
                    className="p-1.5 text-ios-blue hover:bg-ios-blue/10 rounded-ios text-sm font-medium"
                  >
                    {t.common.edit}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t.qc.deleteChecklistConfirm)) deleteChecklist(c.id);
                    }}
                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-ios text-sm font-medium"
                  >
                    {t.common.delete}
                  </button>
                </div>
              </div>
              {editingChecklistId === c.id && (
                <EditChecklistForm
                  checklist={c}
                  branches={branches}
                  onSave={(data) => {
                    updateChecklist(c.id, data);
                    setEditingChecklistId(null);
                  }}
                  onCancel={() => setEditingChecklistId(null)}
                  onAddItem={(title) => addChecklistItem(c.id, title)}
                  onRemoveItem={(itemId) => removeChecklistItem(c.id, itemId)}
                />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section id="qc-review-submissions" className={sectionClass}>
        <h2 className="text-lg font-semibold text-app-primary mb-4">{t.qc.submissionsToReview} ({pending.length})</h2>
        <ul className="space-y-4">
          {pending.length === 0 && <p className="text-app-muted">{t.qc.noPendingSubmissions}</p>}
          {pending.map((s) => (
            <li id={`qc-review-submission-${s.id}`} key={s.id} className="rounded-xl border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4">
              <p className="font-semibold text-app-primary">
                {s.employee.name} — {s.assignment.checklist.name} ({s.assignment.branch.name}){' '}
                {s.isLate && <span className="text-amber-600 dark:text-amber-400 text-sm font-normal">({t.qc.lateNote})</span>}
              </p>
              <p className="text-sm text-app-muted">{formatAppDateTime(s.submittedAt, locale)}</p>
              {s.lateNote && <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">{s.lateNote}</p>}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs rounded-full px-2 py-0.5 bg-ios-blue/10 text-ios-blue font-semibold">
                  {s.photos.length} photo(s)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSubmissionDetails((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                  }
                  className="rounded-md border border-gray-300 dark:border-ios-dark-separator px-2 py-1 text-xs font-medium text-app-primary"
                >
                  {expandedSubmissionDetails[s.id] ? 'Hide photos' : 'Show photos'}
                </button>
              </div>
              {expandedSubmissionDetails[s.id] && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.photos.map((p) => (
                    <a
                      key={p.id}
                      href={p.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <img src={p.filePath} alt="QC" className="h-24 w-24 object-cover rounded border" />
                    </a>
                  ))}
                </div>
              )}
              <ReviewForm
                submissionId={s.id}
                onReview={reviewSubmission}
              />
            </li>
          ))}
        </ul>
      </section>

      <section id="qc-review-assignments" className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-app-primary">{t.qc.assignments}</h2>
          <button
            type="button"
            onClick={() => setShowAssign(true)}
            className="app-btn-secondary"
          >
            {t.qc.assignChecklist}
          </button>
        </div>
        {showAssign && (
          <AssignForm
            checklists={checklists}
            employees={employees}
            branches={branches}
            onAssign={assignChecklistToPeople}
            onCancel={() => setShowAssign(false)}
          />
        )}
        {assignments.length === 0 ? (
          <p className="text-sm text-app-muted">{t.common.noData}</p>
        ) : (
          <div className="space-y-4">
            {assignmentsByChecklist.map((group, groupIndex) => {
              const accent = ASSIGNMENT_GROUP_ACCENTS[groupIndex % ASSIGNMENT_GROUP_ACCENTS.length];
              const isDaily = group.checklist.repeatsDaily;
              return (
                <div
                  key={group.checklist.id}
                  className="rounded-xl border border-gray-200 dark:border-ios-dark-separator overflow-hidden shadow-sm"
                >
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b ${accent.header}`}
                  >
                    <div>
                      <h3 className="font-semibold text-app-primary">{group.checklist.name}</h3>
                      <p className="text-xs text-app-secondary mt-0.5">
                        {interpolate(t.qc.assignmentCount, { count: String(group.rows.length) })}
                        {group.checklist.branchId
                          ? ` · ${branches.find((b) => b.id === group.checklist.branchId)?.name ?? ''}`
                          : ` · ${t.qc.allBranches}`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                        isDaily
                          ? 'bg-white/80 text-ios-blue dark:bg-ios-dark-elevated'
                          : 'bg-white/80 text-amber-800 dark:bg-ios-dark-elevated dark:text-amber-200'
                      }`}
                    >
                      {isDaily ? t.qc.repeatsDaily : t.qc.dueDate}
                    </span>
                  </div>
                  <ul className="divide-y divide-gray-200/80 dark:divide-ios-dark-separator">
                    {group.rows.map((a, rowIndex) => {
                      const dueDate = a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—';
                      return (
                        <li
                          key={a.id}
                          className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                            rowIndex % 2 === 0 ? accent.row : 'bg-white dark:bg-ios-dark-elevated'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-app-primary">{a.employee.name}</p>
                            <p className="text-sm text-app-secondary">{a.branch.name}</p>
                          </div>
                          <div className="text-sm tabular-nums text-app-secondary shrink-0">
                            {isDaily ? '—' : dueDate}
                          </div>
                          <button
                            type="button"
                            onClick={() => unassignAssignment(a)}
                            disabled={unassigningId === a.id || isBusy('qc')}
                            className="shrink-0 rounded-lg border border-red-200 dark:border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-white/90 dark:bg-ios-dark-elevated disabled:opacity-50"
                          >
                            {unassigningId === a.id ? t.common.loading : t.qc.unassign}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section id="qc-review-archive" className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-app-primary">{t.qc.archiveTitle}</h2>
          <span className="text-xs rounded-full px-2.5 py-1 bg-ios-blue/10 text-ios-blue font-semibold">
            {interpolate(t.qc.archiveSubmissionsCount, { count: String(historyRows.length) })}
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <label className="text-sm text-app-label">
            {t.qc.fromDate}
            <input
              type="date"
              value={historyFrom}
              onChange={(e) => setHistoryFrom(e.target.value)}
              className="app-input mt-1.5"
            />
          </label>
          <label className="text-sm text-app-label">
            {t.qc.toDate}
            <input
              type="date"
              value={historyTo}
              onChange={(e) => setHistoryTo(e.target.value)}
              className="app-input mt-1.5"
            />
          </label>
        </div>

        {historyRows.length === 0 ? (
          <p className="text-sm text-app-muted">{t.common.noData}</p>
        ) : (
          <div className="space-y-5">
            {Object.entries(historyByMonth)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([monthKey, rows]) => (
                <div key={monthKey}>
                  <h3 className="text-sm font-semibold text-app-secondary mb-2">
                    {new Date(`${monthKey}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </h3>
                  <ul className="space-y-3">
                    {rows.map((s) => (
                      <li key={s.id} className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-app-primary">
                            {s.employee.name} - {s.assignment.checklist.name}
                          </p>
                          <span className="text-xs text-app-muted">{formatAppDateTime(s.submittedAt, locale)}</span>
                        </div>
                        <p className="text-xs text-app-secondary mt-1">
                          {s.assignment.branch.name} - {s.status}
                          {s.rating != null ? ` - ${t.qc.rating}: ${s.rating}/5` : ''}
                        </p>
                        {s.photos.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {s.photos.map((p) => (
                              <a key={p.id} href={p.filePath} target="_blank" rel="noopener noreferrer">
                                <img src={p.filePath} alt="QC archive" className="h-20 w-20 object-cover rounded border border-gray-200 dark:border-ios-dark-separator" />
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
      </section>
    </div>
  );
}

function EditChecklistForm({
  checklist,
  branches,
  onSave,
  onCancel,
  onAddItem,
  onRemoveItem,
}: {
  checklist: ChecklistWithItems;
  branches: Branch[];
  onSave: (data: { name: string; branchId: string | null; repeatsDaily: boolean; deadlineTime: string }) => void;
  onCancel: () => void;
  onAddItem: (title: string) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState(checklist.name);
  const [branchId, setBranchId] = useState(checklist.branchId ?? '');
  const [repeatsDaily, setRepeatsDaily] = useState(checklist.repeatsDaily);
  const [deadlineTime, setDeadlineTime] = useState(checklist.deadlineTime);
  const [newItemTitle, setNewItemTitle] = useState('');

  return (
    <div className="border-t border-gray-200 dark:border-ios-dark-separator bg-gray-50 dark:bg-ios-gray-dark/50 p-4 space-y-4">
      <h4 className="text-sm font-semibold text-app-primary">{t.qc.editChecklist}</h4>
      <div className="flex flex-wrap gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.qc.checklistName}
          className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
        />
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2">
          <option value="">{t.qc.allBranches}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={repeatsDaily} onChange={(e) => setRepeatsDaily(e.target.checked)} className="rounded" />
          <span className="text-sm text-app-label">{t.qc.repeatsDaily}</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm text-app-label">{t.qc.deadlineTime}</span>
          <input
            type="time"
            value={deadlineTime}
            onChange={(e) => setDeadlineTime(e.target.value)}
            className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
          />
        </label>
      </div>
      <div>
        <p className="text-sm font-medium text-app-primary mb-2">{t.qc.manageItems}</p>
        <ul className="space-y-1 mb-2">
          {checklist.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-1">
              <span className="text-sm text-app-primary">{item.title}</span>
              <button
                type="button"
                onClick={() => onRemoveItem(item.id)}
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                {t.qc.removeItem}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            type="text"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder={t.qc.itemPlaceholder}
            className="flex-1 rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              const title = newItemTitle.trim();
              if (title) {
                onAddItem(title);
                setNewItemTitle('');
              }
            }}
            className="text-sm text-ios-blue font-medium px-2"
          >
            {t.qc.addItem}
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave({ name, branchId: branchId || null, repeatsDaily, deadlineTime })}
          className="rounded-ios bg-ios-blue text-white px-4 py-2 text-sm font-medium"
        >
          {t.common.save}
        </button>
        <button type="button" onClick={onCancel} className="rounded border px-4 py-2 text-sm">
          {t.common.cancel}
        </button>
      </div>
    </div>
  );
}

function NewChecklistForm({
  branches,
  onSave,
  onCancel,
}: {
  branches: Branch[];
  onSave: (name: string, branchId: string | null, repeatsDaily: boolean, deadlineTime: string, items: { title: string }[]) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [repeatsDaily, setRepeatsDaily] = useState(false);
  const [deadlineTime, setDeadlineTime] = useState('18:00');
  const [items, setItems] = useState<string[]>(['']);

  return (
    <form
      className="mb-4 rounded-xl border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(
          name,
          branchId || null,
          repeatsDaily,
          deadlineTime,
          items.filter((item) => item.trim()).map((title) => ({ title }))
        );
      }}
    >
      <div className="rounded-lg bg-ios-blue/5 dark:bg-ios-blue/10 border border-ios-blue/20 dark:border-ios-blue/30 p-3">
        <p className="text-sm font-semibold text-app-primary mb-2">{t.qc.newChecklistGuideTitle}</p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-app-secondary">
          <li>{t.qc.newChecklistGuide1}</li>
          <li>{t.qc.newChecklistGuide2}</li>
          <li>{t.qc.newChecklistGuide3}</li>
        </ol>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-app-primary mb-2">{t.qc.newChecklistSectionBasics}</h3>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.qc.checklistName}
            required
            className="flex-1 min-w-[12rem] rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
          />
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2 min-w-[10rem]"
            aria-label={t.qc.allBranches}
          >
            <option value="">{t.qc.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-app-primary mb-2">{t.qc.newChecklistSectionSchedule}</h3>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={repeatsDaily} onChange={(e) => setRepeatsDaily(e.target.checked)} className="rounded" />
            <span className="text-sm text-app-label">{t.qc.repeatsDaily}</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-sm text-app-label">{t.qc.deadlineTime}</span>
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
            />
          </label>
        </div>
        {!repeatsDaily && (
          <p className="mt-2 text-xs text-app-muted">{t.qc.newChecklistOneTimeReminder}</p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-app-primary mb-2">{t.qc.newChecklistSectionItems}</h3>
        <p className="text-sm text-app-muted mb-2">{t.qc.itemsOptional}</p>
        {items.map((item, i) => (
          <input
            key={i}
            type="text"
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              setItems(next);
            }}
            placeholder={t.qc.itemPlaceholder}
            className="block w-full max-w-md rounded border border-gray-200 dark:border-ios-dark-separator px-3 py-1.5 text-sm mb-1.5 bg-white dark:bg-ios-dark-elevated"
          />
        ))}
        <button type="button" onClick={() => setItems((prev) => [...prev, ''])} className="text-sm text-ios-blue font-medium">
          {t.qc.addItem}
        </button>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="rounded-ios bg-ios-blue text-white px-4 py-2 text-sm font-medium">
          {t.common.create}
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-gray-300 dark:border-ios-dark-separator px-4 py-2 text-sm">
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}

function AssignForm({
  checklists,
  employees,
  branches,
  onAssign,
  onCancel,
}: {
  checklists: ChecklistWithItems[];
  employees: (Employee & { branch: Branch; department?: Department | null })[];
  branches: Branch[];
  onAssign: (
    checklistId: string,
    employeeIds: string[],
    dueDate?: string
  ) => Promise<{ created: AssignmentWithRelations[]; skipped: { employeeId: string; reason: string }[] }>;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [checklistId, setChecklistId] = useState(checklists[0]?.id ?? '');
  const [filterBranchId, setFilterBranchId] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedChecklist = checklists.find((c) => c.id === checklistId);
  const needsDueDate = Boolean(selectedChecklist && !selectedChecklist.repeatsDaily);

  const filteredEmployees = useMemo(() => {
    if (!filterBranchId) return employees;
    return employees.filter((e) => e.branchId === filterBranchId);
  }, [employees, filterBranchId]);

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, on]) => on).map(([id]) => id),
    [selected]
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectAllShown = useCallback(() => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const e of filteredEmployees) next[e.id] = true;
      return next;
    });
  }, [filteredEmployees]);

  const clearSelection = useCallback(() => {
    setSelected({});
  }, []);

  return (
    <form
      className="mb-4 rounded-xl border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setFormError(null);
        setFeedback(null);
        if (selectedIds.length === 0) {
          setFormError(t.qc.assignNeedOnePerson);
          return;
        }
        if (needsDueDate && !dueDate) {
          setFormError(t.qc.assignDueDateRequired);
          return;
        }
        setBusy(true);
        try {
          const { skipped } = await onAssign(checklistId, selectedIds, needsDueDate ? dueDate : undefined);
          if (skipped.length > 0) {
            setFeedback(interpolate(t.qc.assignSkippedSummary, { count: String(skipped.length) }));
          } else {
            onCancel();
          }
        } catch (err) {
          setFormError(err instanceof Error ? err.message : 'Error');
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-app-secondary">{t.qc.assignBulkIntro}</p>

      <div className="flex flex-col lg:flex-row lg:items-end gap-3 flex-wrap">
        <label className="flex flex-col gap-1.5 text-sm text-app-label min-w-[12rem] flex-1">
          {t.common.checklist}
          <select
            value={checklistId}
            onChange={(e) => {
              setChecklistId(e.target.value);
              setSelected({});
              setFeedback(null);
            }}
            className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
            required
          >
            {checklists.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.repeatsDaily ? ` (${t.qc.repeatsDaily})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-app-label min-w-[12rem] flex-1">
          {t.qc.assignFilterBranch}
          <select
            value={filterBranchId}
            onChange={(e) => {
              setFilterBranchId(e.target.value);
              setSelected({});
            }}
            className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
          >
            <option value="">{t.qc.allBranches}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        {needsDueDate ? (
          <label className="flex flex-col gap-1.5 text-sm text-app-label">
            {t.qc.dueDate}
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
            />
          </label>
        ) : null}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-sm font-medium text-app-primary">
            {interpolate(t.qc.assignSelectedCount, { count: String(selectedIds.length) })}
          </span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={selectAllShown} className="text-sm text-ios-blue font-medium">
              {t.qc.assignSelectAllShown}
            </button>
            <button type="button" onClick={clearSelection} className="text-sm text-app-secondary underline-offset-2 hover:underline">
              {t.qc.assignClearSelection}
            </button>
          </div>
        </div>
        <ul className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-ios-dark-separator divide-y divide-gray-100 dark:divide-ios-dark-separator">
          {filteredEmployees.length === 0 ? (
            <li className="p-3 text-sm text-app-muted">{t.common.noData}</li>
          ) : (
            filteredEmployees.map((emp) => (
              <li key={emp.id}>
                <label className="flex items-center gap-3 cursor-pointer px-3 py-2 hover:bg-gray-50 dark:hover:bg-ios-dark-elevated-2/40">
                  <input
                    type="checkbox"
                    checked={!!selected[emp.id]}
                    onChange={() => toggle(emp.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-app-primary flex-1 min-w-0">
                    {emp.name}{' '}
                    <span className="text-app-muted">
                      ({emp.branch.name}
                      {emp.department ? ` — ${emp.department.name}` : ''})
                    </span>
                  </span>
                </label>
              </li>
            ))
          )}
        </ul>
      </div>

      {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
      {feedback && <p className="text-sm text-amber-700 dark:text-amber-300">{feedback}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy || selectedIds.length === 0}
          className="rounded-ios bg-ios-blue text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? t.qc.assignCreating : interpolate(t.qc.assignToN, { count: String(selectedIds.length) })}
        </button>
        <button type="button" onClick={onCancel} className="rounded border border-gray-300 dark:border-ios-dark-separator px-4 py-2 text-sm">
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}

function ReviewForm({
  submissionId,
  onReview,
}: {
  submissionId: string;
  onReview: (id: string, status: 'approved' | 'denied', rating?: number, comments?: string) => void;
}) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(3);
  const [comments, setComments] = useState('');
  const [quickDecision, setQuickDecision] = useState<'approved' | 'denied' | null>(null);

  return (
    <div className="mt-4 rounded-xl border-2 border-ios-blue/25 bg-ios-blue/5 dark:bg-ios-blue/10 dark:border-ios-blue/40 p-4 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ios-blue mb-2">{t.qc.rating}</p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`min-w-[2.75rem] rounded-lg px-3 py-2 text-base font-bold tabular-nums transition-colors ${
                rating === n
                  ? 'bg-ios-blue text-white shadow-md ring-2 ring-ios-blue/40 ring-offset-2 ring-offset-white dark:ring-offset-ios-dark-elevated'
                  : 'bg-white dark:bg-ios-dark-elevated border border-gray-200 dark:border-ios-dark-separator text-app-primary hover:border-ios-blue/50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm font-semibold text-app-primary">
          {rating}/5
        </p>
      </div>
      <label className="block text-sm text-app-label">
        <span className="font-medium text-app-primary">{t.qc.commentsOptional}</span>
        <input
          type="text"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Optional note for reviewer context"
          className="mt-1.5 w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-3 py-2.5 text-sm text-app-primary"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setQuickDecision('approved');
            setRating(5);
            if (!comments) setComments('Looks good and meets checklist standards.');
          }}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold border ${
            quickDecision === 'approved'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-green-50 text-green-800 border-green-300'
          }`}
        >
          Quick approve
        </button>
        <button
          type="button"
          onClick={() => {
            setQuickDecision('denied');
            setRating(2);
            if (!comments) setComments('Needs fixes before approval.');
          }}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold border ${
            quickDecision === 'denied'
              ? 'bg-red-600 text-white border-red-600'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          Quick deny
        </button>
      </div>
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          onClick={() => onReview(submissionId, 'approved', rating, comments)}
          className="flex-1 min-w-[140px] rounded-ios bg-green-600 text-white px-4 py-3 text-sm font-semibold shadow-sm hover:bg-green-700 sm:flex-none"
        >
          {t.common.approve}
        </button>
        <button
          type="button"
          onClick={() => onReview(submissionId, 'denied', rating, comments)}
          className="flex-1 min-w-[140px] rounded-ios bg-red-600 text-white px-4 py-3 text-sm font-semibold shadow-sm hover:bg-red-700 sm:flex-none"
        >
          {t.common.deny}
        </button>
      </div>
    </div>
  );
}

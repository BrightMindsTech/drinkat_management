'use client';

import { useMemo, useState } from 'react';
import type { Checklist, ChecklistItem, ChecklistAssignment, Employee, Branch, Department, QcSubmission, SubmissionPhoto } from '@prisma/client';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
  const [checklists, setChecklists] = useState(initialChecklists);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [showNewChecklist, setShowNewChecklist] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [historyFrom, setHistoryFrom] = useState('');
  const [historyTo, setHistoryTo] = useState('');

  async function createChecklist(name: string, branchId: string | null, repeatsDaily: boolean, deadlineTime: string, items: { title: string }[]) {
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
  }

  async function updateChecklist(id: string, data: { name: string; branchId: string | null; repeatsDaily: boolean; deadlineTime: string }) {
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
  }

  async function deleteChecklist(id: string) {
    const res = await fetch(`/api/checklists/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setChecklists((prev) => prev.filter((c) => c.id !== id));
      setAssignments((prev) => prev.filter((a) => a.checklistId !== id));
      setEditingChecklistId(null);
    }
  }

  async function addChecklistItem(checklistId: string, title: string) {
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
  }

  async function removeChecklistItem(checklistId: string, itemId: string) {
    const res = await fetch(`/api/checklists/${checklistId}/items/${itemId}`, { method: 'DELETE' });
    if (res.ok) {
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === checklistId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
        )
      );
    }
  }

  async function createAssignment(checklistId: string, employeeId: string, branchId: string, dueDate?: string) {
    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklistId, employeeId, branchId, dueDate }),
    });
    const data = await res.json();
    if (res.ok) {
      setAssignments((prev) => [...prev, data]);
      setShowAssign(false);
    }
  }

  async function reviewSubmission(id: string, status: 'approved' | 'denied', rating?: number, comments?: string) {
    const res = await fetch(`/api/qc/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rating, comments }),
    });
    const data = await res.json();
    if (res.ok) setSubmissions((prev) => prev.map((s) => (s.id === id ? data : s)));
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
                    {' • '}{t.qc.deadlineTime}: {c.deadlineTime}
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
            onSave={(cid, eid, bid, dueDate) => createAssignment(cid, eid, bid, dueDate)}
            onCancel={() => setShowAssign(false)}
          />
        )}
        {assignments.length === 0 ? (
          <p className="text-sm text-app-muted">{t.common.noData}</p>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr className="app-table-head">
                  <th className="text-left p-2">{t.common.checklist}</th>
                  <th className="text-left p-2">{t.common.employee}</th>
                  <th className="text-left p-2">{t.common.branch}</th>
                  <th className="text-left p-2">{t.qc.dueDate}</th>
                  <th className="text-left p-2">{t.common.status}</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => {
                  const dueDate = a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—';
                  const isDaily = a.checklist.repeatsDaily;
                  return (
                    <tr
                      key={a.id}
                      className={`border-t border-gray-200 dark:border-ios-dark-separator ${
                        i % 2 === 0 ? 'bg-white dark:bg-transparent' : 'bg-gray-50/50 dark:bg-ios-dark-elevated-2/20'
                      }`}
                    >
                      <td className="p-2 font-medium text-app-primary">{a.checklist.name}</td>
                      <td className="p-2">{a.employee.name}</td>
                      <td className="p-2 text-app-secondary">{a.branch.name}</td>
                      <td className="p-2 tabular-nums">{dueDate}</td>
                      <td className="p-2">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                            isDaily
                              ? 'bg-ios-blue/10 text-ios-blue'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-600/80 dark:text-white'
                          }`}
                        >
                          {isDaily ? t.qc.repeatsDaily : t.qc.dueDate}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
              <p className="text-sm text-app-muted">{new Date(s.submittedAt).toLocaleString()}</p>
              {s.lateNote && <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">{s.lateNote}</p>}
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
              <ReviewForm
                submissionId={s.id}
                onReview={reviewSubmission}
              />
            </li>
          ))}
        </ul>
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
                          <span className="text-xs text-app-muted">{new Date(s.submittedAt).toLocaleString()}</span>
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
      className="mb-4 rounded-xl border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4 space-y-3"
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
      <div className="flex flex-wrap gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.qc.checklistName}
          required
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
        <p className="text-sm font-medium text-app-primary mb-1">{t.qc.itemsOptional}</p>
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
            className="block w-full max-w-md rounded border px-3 py-1.5 text-sm mb-1"
          />
        ))}
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, ''])}
          className="text-sm text-ios-blue font-medium"
        >
          {t.qc.addItem}
        </button>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-ios bg-ios-blue text-white px-4 py-2 text-sm font-medium">{t.common.create}</button>
        <button type="button" onClick={onCancel} className="rounded border px-4 py-2 text-sm">{t.common.cancel}</button>
      </div>
    </form>
  );
}

function AssignForm({
  checklists,
  employees,
  onSave,
  onCancel,
}: {
  checklists: ChecklistWithItems[];
  employees: (Employee & { branch: Branch; department?: Department | null })[];
  onSave: (checklistId: string, employeeId: string, branchId: string, dueDate?: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [checklistId, setChecklistId] = useState(checklists[0]?.id ?? '');
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '');
  const [dueDate, setDueDate] = useState('');
  const employee = employees.find((e) => e.id === employeeId);
  const selectedChecklist = checklists.find((c) => c.id === checklistId);
  const needsDueDate = selectedChecklist && !selectedChecklist.repeatsDaily;

  return (
    <form
      className="mb-4 rounded-xl border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4 flex flex-wrap gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (employee) onSave(checklistId, employeeId, employee.branchId, needsDueDate ? dueDate : undefined);
      }}
    >
      <select value={checklistId} onChange={(e) => setChecklistId(e.target.value)} className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2" required>
        {checklists.map((c) => (
          <option key={c.id} value={c.id}>{c.name}{c.repeatsDaily ? ' (daily)' : ''}</option>
        ))}
      </select>
      <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2" required>
        {employees.map((e) => (
          <option key={e.id} value={e.id}>{e.name} ({e.branch.name}){e.department ? ` — ${e.department.name}` : ''}</option>
        ))}
      </select>
      {needsDueDate && (
        <label className="flex items-center gap-2">
          <span className="text-sm text-app-label">{t.qc.dueDate}</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required={needsDueDate}
            className="rounded-ios border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
          />
        </label>
      )}
      <button type="submit" className="rounded-ios bg-ios-blue text-white px-4 py-2 text-sm font-medium">{t.qc.assign}</button>
      <button type="button" onClick={onCancel} className="rounded border px-4 py-2 text-sm">{t.common.cancel}</button>
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
          className="mt-1.5 w-full rounded-ios border border-gray-300 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated px-3 py-2.5 text-sm text-app-primary"
        />
      </label>
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

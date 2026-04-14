'use client';

import { useMemo, useState } from 'react';
import type { Employee, Branch, Department, EmployeeTransfer, EmployeeDocument } from '@prisma/client';
import { useLanguage, interpolate } from '@/contexts/LanguageContext';
import { EmployeeDocumentsSection } from './EmployeeDocumentsSection';
import { SalaryHistorySection } from './SalaryHistorySection';
import { PerformanceReviewsSection } from './PerformanceReviewsSection';

type TransferWithBranches = EmployeeTransfer & { fromBranch: Branch; toBranch: Branch };
type EmployeeWithRelations = Employee & {
  branch: Branch;
  department?: Department | null;
  user: { email: string } | null;
  transfers?: TransferWithBranches[];
  documents?: EmployeeDocument[];
};

export function EmployeeCard({
  employee,
  departments = [],
  branches = [],
  onDeleted,
  onUpdated,
  hrForceClockRole,
}: {
  employee: EmployeeWithRelations;
  departments?: { id: string; name: string }[];
  branches?: { id: string; name: string }[];
  onDeleted: (id: string) => void;
  onUpdated: (emp: EmployeeWithRelations) => void;
  /** Owner/manager HR: show force clock-out for clocked-in staff (server enforces rules). */
  hrForceClockRole?: 'owner' | 'manager';
}) {
  const { t } = useLanguage();
  const [deleting, setDeleting] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingIdCard, setUploadingIdCard] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferBranchId, setTransferBranchId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [showTransferHistory, setShowTransferHistory] = useState(false);
  const [showSalaryHistory, setShowSalaryHistory] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [forceClockBusy, setForceClockBusy] = useState(false);
  const [forceClockNotice, setForceClockNotice] = useState('');
  const [employmentSaving, setEmploymentSaving] = useState(false);

  const [draftName, setDraftName] = useState(employee.name);
  const [draftPhone, setDraftPhone] = useState(employee.contact ?? '');
  const [draftSalaryAmount, setDraftSalaryAmount] = useState(employee.salaryAmount != null ? String(employee.salaryAmount) : '');
  const [draftResidentialArea, setDraftResidentialArea] = useState(employee.residentialArea ?? '');
  const parseShiftTime = (s: string | null) => {
    if (!s) return { from: '09:00', until: '17:00' };
    const parts = s.split(' - ');
    return { from: parts[0]?.trim() || '09:00', until: parts[1]?.trim() || '17:00' };
  };
  const [draftShiftTimeFrom, setDraftShiftTimeFrom] = useState(parseShiftTime(employee.shiftTime).from);
  const [draftShiftTimeUntil, setDraftShiftTimeUntil] = useState(parseShiftTime(employee.shiftTime).until);
  const [draftDepartmentId, setDraftDepartmentId] = useState(employee.departmentId ?? '');
  const [draftAdvanceLimit, setDraftAdvanceLimit] = useState(employee.advanceLimit != null ? String(employee.advanceLimit) : '');

  const [idCardFrontFile, setIdCardFrontFile] = useState<File | null>(null);
  const [idCardFrontPreviewUrl, setIdCardFrontPreviewUrl] = useState<string | null>(null);
  const [idCardBackFile, setIdCardBackFile] = useState<File | null>(null);
  const [idCardBackPreviewUrl, setIdCardBackPreviewUrl] = useState<string | null>(null);

  const hasExistingIdCardFront = !!employee.idCardFrontPhotoPath;
  const hasExistingIdCardBack = !!employee.idCardBackPhotoPath;

  const resolvedIdCardFrontPhotoUrl = idCardFrontPreviewUrl ?? employee.idCardFrontPhotoPath ?? null;
  const resolvedIdCardBackPhotoUrl = idCardBackPreviewUrl ?? employee.idCardBackPhotoPath ?? null;

  const idCardFrontInputKey = useMemo(
    () => `${employee.id}-${employee.idCardFrontPhotoPath ?? 'none'}-${idCardFrontPreviewUrl ?? 'no-preview'}`,
    [employee.id, employee.idCardFrontPhotoPath, idCardFrontPreviewUrl]
  );
  const idCardBackInputKey = useMemo(
    () => `${employee.id}-${employee.idCardBackPhotoPath ?? 'none'}-${idCardBackPreviewUrl ?? 'no-preview'}`,
    [employee.id, employee.idCardBackPhotoPath, idCardBackPreviewUrl]
  );

  async function parseErrorMessage(res: Response, fallback: string) {
    try {
      const data = await res.json();
      if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    } catch {
      // ignore parse errors
    }
    return fallback;
  }

  async function handleDelete() {
    if (!confirm(interpolate(t.employeeCard.deleteConfirm, { name: employee.name }))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, { method: 'DELETE' });
      if (res.ok) onDeleted(employee.id);
      else alert(await parseErrorMessage(res, t.employeeCard.failedDelete));
    } finally {
      setDeleting(false);
    }
  }

  async function handleTransfer() {
    if (!transferBranchId) return;
    const targetBranch = branches.find((b) => b.id === transferBranchId);
    if (!targetBranch || !confirm(interpolate(t.employeeCard.transferConfirm, { name: employee.name, branch: targetBranch.name }))) return;
    setTransferring(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toBranchId: transferBranchId }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data);
        setTransferOpen(false);
        setTransferBranchId('');
      } else {
        alert(await parseErrorMessage(res, t.employeeCard.failedUpdate));
      }
    } finally {
      setTransferring(false);
    }
  }

  function openTransfer() {
    setTransferBranchId('');
    setTransferOpen(true);
    setIsExpanded(true);
  }

  async function handleForceClockOut() {
    if (!hrForceClockRole) return;
    if (!confirm(interpolate(t.hr.forceClockOutConfirm, { name: employee.name }))) return;
    setForceClockBusy(true);
    setForceClockNotice('');
    try {
      const res = await fetch('/api/time-clock/force-clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employee.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        alreadyClockedOut?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setForceClockNotice(data.error ?? t.hr.forceClockOutFailed);
        return;
      }
      if (data.alreadyClockedOut) {
        setForceClockNotice(interpolate(t.hr.alreadyClockedOutNotice, { name: employee.name }));
        return;
      }
      if (data.ok) setForceClockNotice(t.hr.forceClockOutSuccess);
    } finally {
      setForceClockBusy(false);
    }
  }

  async function handleEmploymentTypeChange(next: 'full_time' | 'part_time') {
    const cur = employee.employmentType === 'part_time' ? 'part_time' : 'full_time';
    if (next === cur) return;
    setEmploymentSaving(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employmentType: next }),
      });
      if (!res.ok) {
        alert(await parseErrorMessage(res, t.employeeCard.failedUpdate));
        return;
      }
      const updated = (await res.json()) as EmployeeWithRelations;
      onUpdated(updated);
    } finally {
      setEmploymentSaving(false);
    }
  }

  async function handleTerminate() {
    if (!confirm(interpolate(t.employeeCard.terminateConfirm, { name: employee.name }))) return;
    setTerminating(true);
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'terminated' }),
      });
      if (res.ok) onDeleted(employee.id);
      else alert(await parseErrorMessage(res, t.employeeCard.failedUpdate));
    } finally {
      setTerminating(false);
    }
  }

  function openEdit() {
    setDraftName(employee.name);
    setDraftPhone(employee.contact ?? '');
    setDraftSalaryAmount(employee.salaryAmount != null ? String(employee.salaryAmount) : '');
    setDraftResidentialArea(employee.residentialArea ?? '');
    const st = parseShiftTime(employee.shiftTime);
    setDraftShiftTimeFrom(st.from);
    setDraftShiftTimeUntil(st.until);
    setDraftDepartmentId(employee.departmentId ?? '');
    setDraftAdvanceLimit(employee.advanceLimit != null ? String(employee.advanceLimit) : '');
    setIdCardFrontFile(null);
    setIdCardFrontPreviewUrl(null);
    setIdCardBackFile(null);
    setIdCardBackPreviewUrl(null);
    setEditing(true);
    setIsExpanded(true);
  }

  function openReset() {
    setResetOpen(true);
    setResetPassword('');
    setResetError('');
    setResetSaving(false);
    setIsExpanded(true);
  }

  function closeReset() {
    setResetOpen(false);
    setResetSaving(false);
    setResetPassword('');
    setResetError('');
  }

  function closeEdit() {
    setEditing(false);
    setSaving(false);
    setUploadingIdCard(false);
    setIdCardFrontFile(null);
    setIdCardFrontPreviewUrl(null);
    setIdCardBackFile(null);
    setIdCardBackPreviewUrl(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const salaryNum = draftSalaryAmount.trim() ? Number(draftSalaryAmount) : NaN;
      const salaryValue = Number.isNaN(salaryNum) ? null : salaryNum;

      // Validate required front/back photos (either existing or newly uploaded)
      const willHaveFront = hasExistingIdCardFront || !!idCardFrontFile;
      const willHaveBack = hasExistingIdCardBack || !!idCardBackFile;
      if (!willHaveFront) {
        alert(t.common.idCardFrontRequired);
        return;
      }
      if (!willHaveBack) {
        alert(t.common.idCardBackRequired);
        return;
      }

      let newIdCardFrontPhotoPath: string | undefined = undefined;
      let newIdCardBackPhotoPath: string | undefined = undefined;

      if (idCardFrontFile) {
        setUploadingIdCard(true);
        const formData = new FormData();
        formData.set('file', idCardFrontFile);
        const r = await fetch('/api/upload', { method: 'POST', body: formData });
        const d = await r.json();
        if (!r.ok || !d?.filePath) {
          alert(t.common.uploadFailed);
          return;
        }
        newIdCardFrontPhotoPath = d.filePath;
      }

      if (idCardBackFile) {
        setUploadingIdCard(true);
        const formData = new FormData();
        formData.set('file', idCardBackFile);
        const r = await fetch('/api/upload', { method: 'POST', body: formData });
        const d = await r.json();
        if (!r.ok || !d?.filePath) {
          alert(t.common.uploadFailed);
          return;
        }
        newIdCardBackPhotoPath = d.filePath;
      }

      const advanceLimitNum = draftAdvanceLimit.trim() ? Number(draftAdvanceLimit) : NaN;
      const advanceLimitValue = Number.isNaN(advanceLimitNum) ? null : advanceLimitNum;

      const res = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draftName.trim(),
          contact: draftPhone.trim() ? draftPhone.trim() : null,
          salaryAmount: salaryValue,
          residentialArea: draftResidentialArea.trim() ? draftResidentialArea.trim() : null,
          shiftTime: draftShiftTimeFrom && draftShiftTimeUntil ? `${draftShiftTimeFrom} - ${draftShiftTimeUntil}` : null,
          departmentId: draftDepartmentId || null,
          advanceLimit: advanceLimitValue,
          ...(newIdCardFrontPhotoPath ? { idCardFrontPhotoPath: newIdCardFrontPhotoPath } : {}),
          ...(newIdCardBackPhotoPath ? { idCardBackPhotoPath: newIdCardBackPhotoPath } : {}),
        }),
      });

      if (!res.ok) {
        alert(await parseErrorMessage(res, t.employeeCard.failedUpdate));
        return;
      }

      const updated = (await res.json()) as EmployeeWithRelations;
      onUpdated(updated);
      setEditing(false);
    } finally {
      setUploadingIdCard(false);
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    setResetSaving(true);
    setResetError('');
    try {
      if (!resetPassword.trim()) {
        setResetError(t.common.resetPasswordRequired);
        return;
      }
      const res = await fetch(`/api/employees/${employee.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword.trim() }),
      });
      if (!res.ok) {
        setResetError(await parseErrorMessage(res, t.common.passwordUpdateFailed));
        return;
      }
      alert(t.common.passwordUpdated);
      closeReset();
    } finally {
      setResetSaving(false);
    }
  }

  const email = employee.user?.email ?? '—';
  const joinDate = employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : '—';
  const detailsVisible = isExpanded || editing || transferOpen || resetOpen;

  const actionButtons = (
    <fieldset className="mt-3 rounded-lg border border-gray-200 dark:border-ios-dark-separator px-3 pb-3 pt-2">
      <legend className="px-1 text-xs font-semibold text-app-primary">{t.employeeCard.actions}</legend>
      <div className="flex flex-wrap gap-2 mb-3">
        <button type="button" onClick={openEdit} className="rounded-md border border-ios-blue bg-ios-blue/5 text-ios-blue px-3 py-2 text-sm font-medium hover:bg-ios-blue/10 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed" disabled={deleting || terminating}>{t.common.edit}</button>
        <button
          type="button"
          onClick={openReset}
          className="rounded-md border border-ios-blue bg-ios-blue/5 text-ios-blue px-3 py-2 text-sm font-medium hover:bg-ios-blue/10 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={deleting || editing || terminating || !employee.user}
          title={!employee.user ? t.hr.noEmployeeRecordShort : undefined}
        >
          {t.common.resetPassword}
        </button>
        {branches.length > 0 && branches.some((b) => b.id !== employee.branchId) && (
          <button type="button" onClick={openTransfer} className="rounded-md border border-ios-blue bg-ios-blue/5 text-ios-blue px-3 py-2 text-sm font-medium hover:bg-ios-blue/10 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed" disabled={deleting || terminating}>{t.employeeCard.transfer}</button>
        )}
      </div>
      <p className="text-xs font-medium text-app-muted mb-2">{t.employeeCard.dangerZone}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleTerminate} disabled={deleting || terminating} className="rounded-md border border-amber-500 bg-amber-500/5 text-amber-600 dark:text-amber-400 px-3 py-2 text-sm font-medium hover:bg-amber-500/10 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed">{terminating ? t.employeeCard.terminating : t.employeeCard.terminate}</button>
        <button type="button" onClick={handleDelete} disabled={deleting} className="rounded-md border border-red-500 bg-red-500/5 text-red-600 dark:text-red-400 px-3 py-2 text-sm font-medium hover:bg-red-500/10 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed">{deleting ? t.common.deleting : t.common.delete}</button>
      </div>
    </fieldset>
  );

  return (
    <div className="rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-4 shadow-sm dark:shadow-none app-animate-in app-surface">
      <div className="rounded-lg border border-gray-200 dark:border-ios-dark-separator px-3 py-3 bg-gray-50/50 dark:bg-ios-dark-elevated-2/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-app-primary truncate">{employee.name}</h3>
            <p className="text-sm text-app-secondary mt-1">
              {employee.branch.name} - {t.employeeCard.roleLabel}: {employee.role}
            </p>
            {employee.department && (
              <p className="text-xs text-app-muted mt-1">
                {t.registerStaff.department}: {employee.department.name}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {hrForceClockRole && (
              <button
                type="button"
                onClick={() => void handleForceClockOut()}
                disabled={forceClockBusy}
                className="rounded-ios border border-amber-600/70 bg-amber-500/10 text-amber-800 dark:text-amber-200 px-3 py-2 text-xs font-semibold hover:bg-amber-500/15 disabled:opacity-50"
              >
                {forceClockBusy ? t.common.loading : t.hr.forceClockOut}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="rounded-ios border border-ios-blue/60 bg-ios-blue/5 text-ios-blue px-3 py-2 text-sm font-medium hover:bg-ios-blue/10"
            >
              {detailsVisible ? t.employeeCard.hideInformation : t.employeeCard.viewInformation}
            </button>
          </div>
        </div>
        {forceClockNotice ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300/90">{forceClockNotice}</p>
        ) : null}
      </div>
      {detailsVisible && (
        <fieldset className="mt-3 rounded-lg border border-gray-200 dark:border-ios-dark-separator px-3 pb-3 pt-2">
          <legend className="px-1 text-xs font-semibold text-app-primary">{t.employeeCard.jumpDetails}</legend>
          <dl className="grid gap-x-3 gap-y-1.5 sm:grid-cols-[auto_1fr] text-sm">
            <dt className="text-app-muted">{t.employeeCard.emailLabel}</dt>
            <dd className="text-app-primary break-all">{email}</dd>
            {employee.contact && (
              <>
                <dt className="text-app-muted">{t.employeeCard.contactLabel}</dt>
                <dd className="text-app-primary">{employee.contact}</dd>
              </>
            )}
            {employee.salaryAmount != null && (
              <>
                <dt className="text-app-muted">{t.common.salaryAmount}</dt>
                <dd className="text-app-primary tabular-nums">{employee.salaryAmount.toFixed(2)}</dd>
              </>
            )}
            {employee.advanceLimit != null && (
              <>
                <dt className="text-app-muted">{t.registerStaff.advanceLimit}</dt>
                <dd className="text-app-primary tabular-nums">{employee.advanceLimit.toFixed(2)}</dd>
              </>
            )}
            {employee.residentialArea && (
              <>
                <dt className="text-app-muted">{t.common.residentialArea}</dt>
                <dd className="text-app-primary">{employee.residentialArea}</dd>
              </>
            )}
            {employee.shiftTime && (
              <>
                <dt className="text-app-muted">{t.common.shiftTime}</dt>
                <dd className="text-app-primary">{employee.shiftTime}</dd>
              </>
            )}
            <dt className="text-app-muted">{t.employeeCard.joined}</dt>
            <dd className="text-app-primary">{joinDate}</dd>
            {hrForceClockRole === 'owner' && (
              <>
                <dt className="text-app-muted">{t.employeeCard.employmentTypeLabel}</dt>
                <dd className="text-app-primary min-w-0">
                  <select
                    value={employee.employmentType === 'part_time' ? 'part_time' : 'full_time'}
                    disabled={employmentSaving || editing}
                    onChange={(e) => void handleEmploymentTypeChange(e.target.value as 'full_time' | 'part_time')}
                    className="app-select mt-0.5 max-w-[220px] text-sm"
                  >
                    <option value="full_time">{t.employeeCard.employmentFullTime}</option>
                    <option value="part_time">{t.employeeCard.employmentPartTime}</option>
                  </select>
                  {employmentSaving ? (
                    <p className="text-xs text-app-muted mt-1">{t.common.loading}</p>
                  ) : employee.employmentType === 'part_time' ? (
                    <p className="text-xs text-app-muted mt-1">{t.employeeCard.partTimeMinDaysHint}</p>
                  ) : null}
                </dd>
              </>
            )}
          </dl>
          {(resolvedIdCardFrontPhotoUrl || resolvedIdCardBackPhotoUrl) && (
            <div className="mt-3">
              <div className="flex items-center gap-3 flex-wrap">
                {resolvedIdCardFrontPhotoUrl && (
                  <a href={resolvedIdCardFrontPhotoUrl} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedIdCardFrontPhotoUrl}
                      alt={t.common.idCardFrontPhoto}
                      className="h-14 w-14 rounded border border-gray-200 dark:border-ios-dark-separator object-cover"
                    />
                  </a>
                )}
                {resolvedIdCardBackPhotoUrl && (
                  <a href={resolvedIdCardBackPhotoUrl} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedIdCardBackPhotoUrl}
                      alt={t.common.idCardBackPhoto}
                      className="h-14 w-14 rounded border border-gray-200 dark:border-ios-dark-separator object-cover"
                    />
                  </a>
                )}
              </div>
              <div className="mt-1 flex gap-3 text-xs text-app-muted flex-wrap">
                {resolvedIdCardFrontPhotoUrl && <span>{t.common.idCardFrontPhoto}</span>}
                {resolvedIdCardBackPhotoUrl && <span>{t.common.idCardBackPhoto}</span>}
              </div>
            </div>
          )}
        </fieldset>
      )}
      {detailsVisible && (
      <>
      <fieldset className="mt-3 rounded-lg border border-gray-200 dark:border-ios-dark-separator px-3 pb-3 pt-2">
        <legend className="px-1 text-xs font-semibold text-app-primary">{t.employeeCard.salaryHistory}</legend>
        <button type="button" onClick={() => setShowSalaryHistory(!showSalaryHistory)} className="text-sm text-ios-blue font-medium">
          {t.employeeCard.salaryHistory}
        </button>
        {showSalaryHistory && (
          <div className="mt-2">
            <SalaryHistorySection employeeId={employee.id} />
          </div>
        )}
      </fieldset>
      <fieldset className="mt-3 rounded-lg border border-gray-200 dark:border-ios-dark-separator px-3 pb-3 pt-2">
        <legend className="px-1 text-xs font-semibold text-app-primary">{t.employeeCard.performanceReviews}</legend>
        <p className="text-sm font-medium text-app-primary mb-1">{t.employeeCard.performanceReviews}</p>
        <PerformanceReviewsSection employeeId={employee.id} canAddReviews />
      </fieldset>
      <fieldset className="mt-3 rounded-lg border border-gray-200 dark:border-ios-dark-separator px-3 pb-3 pt-2">
        <legend className="px-1 text-xs font-semibold text-app-primary">{t.employeeCard.documents}</legend>
        <p className="text-sm font-medium text-app-primary mb-1">{t.employeeCard.documents}</p>
        <EmployeeDocumentsSection
        employeeId={employee.id}
        documents={employee.documents ?? []}
        ownerView
        onDocumentsChange={(docs) => onUpdated({ ...employee, documents: docs } as EmployeeWithRelations)}
      />
      </fieldset>
      {employee.transfers && employee.transfers.length > 0 && (
        <fieldset className="mt-3 rounded-lg border border-gray-200 dark:border-ios-dark-separator px-3 pb-3 pt-2">
          <legend className="px-1 text-xs font-semibold text-app-primary">{t.employeeCard.transferHistory}</legend>
          <button type="button" onClick={() => setShowTransferHistory(!showTransferHistory)} className="text-sm text-ios-blue font-medium">
            {t.employeeCard.transferHistory} ({employee.transfers.length})
          </button>
          {showTransferHistory && (
            <ul className="mt-1 text-xs text-app-secondary space-y-0.5">
              {employee.transfers.map((tr) => (
                <li key={tr.id}>{tr.fromBranch.name} → {tr.toBranch.name} ({new Date(tr.transferredAt).toLocaleDateString()})</li>
              ))}
            </ul>
          )}
        </fieldset>
      )}
      {actionButtons}
      {editing && (
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-gray-100 dark:bg-ios-dark-elevated-2 p-4">
          <div className="flex items-start justify-between gap-4">
            <h4 className="font-semibold text-app-primary text-sm">{t.common.edit}</h4>
            <button type="button" onClick={closeEdit} className="text-sm text-app-secondary hover:underline">
              {t.common.cancel}
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-app-label">
              {t.common.name}
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-sm text-app-label">
              {t.common.contact}
              <input
                type="text"
                value={draftPhone}
                onChange={(e) => setDraftPhone(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-sm text-app-label">
              {t.common.salaryAmount}
              <input
                type="number"
                step="0.01"
                min="0"
                value={draftSalaryAmount}
                onChange={(e) => setDraftSalaryAmount(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-sm text-app-label">
              {t.common.residentialArea}
              <input
                type="text"
                value={draftResidentialArea}
                onChange={(e) => setDraftResidentialArea(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-sm text-app-label">
              {t.common.shiftFrom}
              <input
                type="time"
                value={draftShiftTimeFrom}
                onChange={(e) => setDraftShiftTimeFrom(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm"
              />
            </label>
            <label className="block text-sm text-app-label">
              {t.common.shiftUntil}
              <input
                type="time"
                value={draftShiftTimeUntil}
                onChange={(e) => setDraftShiftTimeUntil(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm"
              />
            </label>
            {departments.length > 0 && (
              <label className="block text-sm text-app-label">
                {t.registerStaff.department}
                <select
                  value={draftDepartmentId}
                  onChange={(e) => setDraftDepartmentId(e.target.value)}
                  className="mt-1 w-full rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm"
                >
                  <option value="">—</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="block text-sm text-app-label">
              {t.registerStaff.advanceLimit}
              <input
                type="number"
                step="0.01"
                min="0"
                value={draftAdvanceLimit}
                onChange={(e) => setDraftAdvanceLimit(e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm"
              />
            </label>
          </div>

          <div className="mt-3">
            <div className="mb-3">
              <label className="block text-sm text-app-label mb-1">{t.common.idCardFrontPhoto}</label>
              <input
                key={idCardFrontInputKey}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setIdCardFrontFile(f);
                  setIdCardFrontPreviewUrl(f ? URL.createObjectURL(f) : null);
                }}
                className="block w-full text-sm text-app-muted file:mr-2 file:rounded file:border-0 file:bg-ios-blue/10 file:px-3 file:py-1 file:text-ios-blue"
                disabled={saving || uploadingIdCard}
              />
              {resolvedIdCardFrontPhotoUrl && (
                <div className="mt-2">
                  <img
                    src={resolvedIdCardFrontPhotoUrl}
                    alt={t.common.idCardFrontPhoto}
                    className="h-24 w-24 rounded border border-gray-200 dark:border-ios-dark-separator object-cover"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-app-label mb-1">{t.common.idCardBackPhoto}</label>
              <input
                key={idCardBackInputKey}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setIdCardBackFile(f);
                  setIdCardBackPreviewUrl(f ? URL.createObjectURL(f) : null);
                }}
                className="block w-full text-sm text-app-muted file:mr-2 file:rounded file:border-0 file:bg-ios-blue/10 file:px-3 file:py-1 file:text-ios-blue"
                disabled={saving || uploadingIdCard}
              />
              {resolvedIdCardBackPhotoUrl && (
                <div className="mt-2">
                  <img
                    src={resolvedIdCardBackPhotoUrl}
                    alt={t.common.idCardBackPhoto}
                    className="h-24 w-24 rounded border border-gray-200 dark:border-ios-dark-separator object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-ios bg-ios-blue text-white px-4 py-2 text-sm font-medium active:opacity-90 disabled:opacity-50"
            >
              {saving ? (uploadingIdCard ? t.common.uploading : t.common.loading) : t.common.save}
            </button>
            <button type="button" onClick={closeEdit} disabled={saving} className="rounded-lg border border-gray-300 dark:border-ios-dark-separator px-4 py-2 text-sm">
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}

      {transferOpen && !editing && branches.length > 0 && (
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-white/80 dark:bg-ios-dark-elevated p-4">
          <div className="flex items-start justify-between gap-4">
            <h4 className="font-semibold text-app-primary text-sm">{t.employeeCard.transfer}</h4>
            <button type="button" onClick={() => { setTransferOpen(false); setTransferBranchId(''); }} className="text-sm text-app-secondary hover:underline">{t.common.cancel}</button>
          </div>
          <div className="mt-3">
            <label className="block text-sm text-app-label mb-1">{t.employeeCard.transferTo}</label>
            <select
              value={transferBranchId}
              onChange={(e) => setTransferBranchId(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm"
            >
              <option value="">—</option>
              {branches.filter((b) => b.id !== employee.branchId).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={handleTransfer} disabled={transferring || !transferBranchId} className="rounded-ios bg-ios-blue text-white px-4 py-2 text-sm font-medium active:opacity-90 disabled:opacity-50">
              {transferring ? t.employeeCard.transferring : t.common.save}
            </button>
            <button type="button" onClick={() => { setTransferOpen(false); setTransferBranchId(''); }} disabled={transferring} className="rounded-lg border border-gray-300 dark:border-ios-dark-separator px-4 py-2 text-sm">{t.common.cancel}</button>
          </div>
        </div>
      )}

      {resetOpen && !editing && (
        <div className="mt-4 rounded-lg border border-gray-200 dark:border-ios-dark-separator bg-white/80 dark:bg-ios-dark-elevated p-4">
          <div className="flex items-start justify-between gap-4">
            <h4 className="font-semibold text-app-primary text-sm">{t.common.resetPassword}</h4>
            <button type="button" onClick={closeReset} className="text-sm text-app-secondary hover:underline">
              {t.common.cancel}
            </button>
          </div>
          <div className="mt-3">
            <label className="block text-sm text-app-label mb-1">{t.common.newPassword}</label>
            <input
              type="password"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              minLength={6}
              className="mt-1 w-full rounded border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-2 py-1 text-sm"
              disabled={resetSaving}
            />
            {resetError && <p className="mt-2 text-sm text-red-600">{resetError}</p>}
          </div>
          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetSaving}
              className="rounded-ios bg-ios-blue text-white px-4 py-2 text-sm font-medium active:opacity-90 disabled:opacity-50"
            >
              {resetSaving ? t.common.loading : t.common.save}
            </button>
            <button type="button" onClick={closeReset} disabled={resetSaving} className="rounded-lg border border-gray-300 dark:border-ios-dark-separator px-4 py-2 text-sm">
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

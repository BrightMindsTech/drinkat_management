'use client';

import { useState } from 'react';
import type { Branch, Department } from '@prisma/client';
import type { Employee } from '@prisma/client';
import { useLanguage } from '@/contexts/LanguageContext';

type EmployeeWithRelations = Employee & { branch: Branch; department?: Department | null; user: { email: string } | null };

export function RegisterStaffForm({
  branches,
  departments,
  onCreated,
  onCancel,
}: {
  branches: Branch[];
  departments: Department[];
  onCreated: (emp: EmployeeWithRelations) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [residentialArea, setResidentialArea] = useState('');
  const [shiftTimeFrom, setShiftTimeFrom] = useState('09:00');
  const [shiftTimeUntil, setShiftTimeUntil] = useState('17:00');
  const [role, setRole] = useState<'staff' | 'qc'>('staff');
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [departmentId, setDepartmentId] = useState('');
  const [advanceLimit, setAdvanceLimit] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingIdCard, setUploadingIdCard] = useState(false);
  const [error, setError] = useState('');
  const [idCardFrontFile, setIdCardFrontFile] = useState<File | null>(null);
  const [idCardFrontPreviewUrl, setIdCardFrontPreviewUrl] = useState<string | null>(null);
  const [idCardBackFile, setIdCardBackFile] = useState<File | null>(null);
  const [idCardBackPreviewUrl, setIdCardBackPreviewUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const salaryNum = salaryAmount.trim() ? Number(salaryAmount) : NaN;
      const salaryValue = Number.isNaN(salaryNum) ? undefined : salaryNum;

      let idCardFrontPhotoPath: string | undefined = undefined;
      let idCardBackPhotoPath: string | undefined = undefined;

      if (!idCardFrontFile) {
        setError(t.common.idCardFrontRequired);
        return;
      }
      if (!idCardBackFile) {
        setError(t.common.idCardBackRequired);
        return;
      }

      setUploadingIdCard(true);
      // Upload front
      {
        const formData = new FormData();
        formData.set('file', idCardFrontFile);
        const r = await fetch('/api/upload', { method: 'POST', body: formData });
        const d = await r.json();
        if (!r.ok || !d?.filePath) {
          setError(t.common.uploadFailed);
          return;
        }
        idCardFrontPhotoPath = d.filePath;
      }
      // Upload back
      {
        const formData = new FormData();
        formData.set('file', idCardBackFile);
        const r = await fetch('/api/upload', { method: 'POST', body: formData });
        const d = await r.json();
        if (!r.ok || !d?.filePath) {
          setError(t.common.uploadFailed);
          return;
        }
        idCardBackPhotoPath = d.filePath;
      }

      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          contact: contact || undefined,
          salaryAmount: salaryValue,
          role,
          branchId,
          departmentId: departmentId || null,
          advanceLimit: advanceLimit.trim() ? parseFloat(advanceLimit) : null,
          email,
          password,
          residentialArea: residentialArea || undefined,
          shiftTime:
            shiftTimeFrom && shiftTimeUntil ? `${shiftTimeFrom}–${shiftTimeUntil}` : undefined,
          idCardFrontPhotoPath,
          idCardBackPhotoPath,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error === 'Email already registered' ? t.registerStaff.emailExists : (data.error || t.registerStaff.failedRegister);
        setError(msg);
        return;
      }
      onCreated(data);
      setName('');
      setContact('');
      setSalaryAmount('');
      setResidentialArea('');
      setShiftTimeFrom('09:00');
      setShiftTimeUntil('17:00');
      setEmail('');
      setPassword('');
      setIdCardFrontFile(null);
      setIdCardFrontPreviewUrl(null);
      setIdCardBackFile(null);
      setIdCardBackPreviewUrl(null);
    } finally {
      setUploadingIdCard(false);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-ios-lg border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated p-6 space-y-4">
      <h3 className="font-semibold text-app-primary">{t.registerStaff.title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm text-app-label mb-1">{t.registerStaff.name}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-app-label mb-1">{t.registerStaff.contact}</label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-app-label mb-1">{t.registerStaff.salaryAmount}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={salaryAmount}
            onChange={(e) => setSalaryAmount(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-app-label mb-1">{t.common.residentialArea}</label>
          <input
            type="text"
            value={residentialArea}
            onChange={(e) => setResidentialArea(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="sm:col-span-2 flex gap-3">
          <div className="flex-1">
            <label className="block text-sm text-app-label mb-1">{t.common.shiftFrom}</label>
            <input
              type="time"
              value={shiftTimeFrom}
              onChange={(e) => setShiftTimeFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-app-label mb-1">{t.common.shiftUntil}</label>
            <input
              type="time"
              value={shiftTimeUntil}
              onChange={(e) => setShiftTimeUntil(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-app-label mb-1">{t.registerStaff.role}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'staff' | 'qc')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="staff">{t.registerStaff.staff}</option>
            <option value="qc">{t.registerStaff.qc}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-app-label mb-1">{t.registerStaff.branch}</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-app-label mb-1">{t.registerStaff.department}</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
          >
            <option value="">—</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-app-label mb-1">{t.registerStaff.advanceLimit}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={advanceLimit}
            onChange={(e) => setAdvanceLimit(e.target.value)}
            placeholder="—"
            className="w-full rounded-lg border border-gray-300 dark:border-ios-dark-separator dark:bg-ios-dark-fill dark:text-ios-dark-label px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-app-label mb-1">{t.registerStaff.emailLogin}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-app-label mb-1">{t.registerStaff.password}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <div className="mb-3">
          <label className="block text-sm text-app-label mb-1">{t.common.idCardFrontPhoto}</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setIdCardFrontFile(f);
              setIdCardFrontPreviewUrl(f ? URL.createObjectURL(f) : null);
            }}
            className="block w-full text-sm text-app-muted file:mr-2 file:rounded file:border-0 file:bg-gray-200 dark:border-ios-dark-separator/20 file:px-3 file:py-1 file:text-app-primary"
            disabled={loading || uploadingIdCard}
          />
          {idCardFrontPreviewUrl && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={idCardFrontPreviewUrl} alt={t.common.idCardFrontPhoto} className="h-24 w-24 rounded border border-gray-200 dark:border-ios-dark-separator/30 object-cover" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm text-app-label mb-1">{t.common.idCardBackPhoto}</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setIdCardBackFile(f);
              setIdCardBackPreviewUrl(f ? URL.createObjectURL(f) : null);
            }}
            className="block w-full text-sm text-app-muted file:mr-2 file:rounded file:border-0 file:bg-gray-200 dark:border-ios-dark-separator/20 file:px-3 file:py-1 file:text-app-primary"
            disabled={loading || uploadingIdCard}
          />
          {idCardBackPreviewUrl && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={idCardBackPreviewUrl} alt={t.common.idCardBackPhoto} className="h-24 w-24 rounded border border-gray-200 dark:border-ios-dark-separator/30 object-cover" />
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-ios bg-ios-blue text-white px-4 py-2.5 text-sm font-medium active:opacity-90 disabled:opacity-50"
        >
          {loading ? (uploadingIdCard ? t.common.uploading : t.registerStaff.creating) : t.common.create}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
          {t.common.cancel}
        </button>
      </div>
    </form>
  );
}

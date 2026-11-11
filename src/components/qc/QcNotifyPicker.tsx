'use client';

import { interpolate, useLanguage } from '@/contexts/LanguageContext';
import { peopleNotifyOptions } from '@/lib/qc-field-reports';

export type QcNotifyOption = { value: string; label: string };

export function defaultNotifyTargets(options: QcNotifyOption[]): string[] {
  const people = peopleNotifyOptions(options);
  return people.length ? people.map((o) => o.value) : ['all'];
}

export function notifyOptionLabel(
  opt: QcNotifyOption,
  t: {
    qcOps: {
      qcReportsNotifySara: string;
      qcReportsNotifyOwner: string;
      qcReportsNotifyManagers: string;
      qcReportsNotifyManager: string;
    };
  }
): string {
  if (opt.value === 'sara') return t.qcOps.qcReportsNotifySara;
  if (opt.value === 'owner') return t.qcOps.qcReportsNotifyOwner;
  if (opt.value === 'managers') return t.qcOps.qcReportsNotifyManagers;
  if (opt.value.startsWith('manager:')) {
    return interpolate(t.qcOps.qcReportsNotifyManager, { name: opt.label });
  }
  return opt.label;
}

export function QcNotifyPicker({
  options,
  selected,
  onChange,
  disabled,
}: {
  options: QcNotifyOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const people = peopleNotifyOptions(options);
  const selectedSet = new Set(selected);
  const allOn = people.length > 0 && people.every((o) => selectedSet.has(o.value));

  function toggle(value: string) {
    if (disabled) return;
    if (selectedSet.has(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  }

  return (
    <fieldset className="block space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-app-muted">{t.qcOps.qcReportsNotify}</legend>
      <p className="text-xs leading-relaxed text-app-muted">{t.qcOps.qcInspectNotifyHint}</p>
      {people.length ? (
        <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 dark:border-ios-dark-separator dark:bg-ios-dark-fill">
          <input
            type="checkbox"
            className="h-5 w-5 shrink-0 accent-ios-blue"
            checked={allOn}
            onChange={() => onChange(allOn ? [] : people.map((o) => o.value))}
            aria-label={t.qcOps.qcReportsNotifyAll}
          />
          <span className="text-base font-semibold text-app-primary">{t.qcOps.qcReportsNotifyAll}</span>
        </label>
      ) : null}
      <ul className="overflow-hidden rounded-2xl border border-gray-200 dark:border-ios-dark-separator">
        {people.map((opt) => (
          <li key={opt.value} className="border-b border-gray-100 last:border-b-0 dark:border-ios-dark-separator">
            <label className="flex min-h-12 items-center gap-3 bg-white px-4 dark:bg-ios-dark-fill">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-ios-blue"
                checked={selectedSet.has(opt.value)}
                onChange={() => toggle(opt.value)}
                aria-label={notifyOptionLabel(opt, t)}
              />
              <span className="text-base text-app-primary">{notifyOptionLabel(opt, t)}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

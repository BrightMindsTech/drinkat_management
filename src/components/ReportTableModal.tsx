'use client';

import { useEffect, useRef } from 'react';
import type { ReportTableData } from '@/lib/report-table';

export type { ReportTableData } from '@/lib/report-table';

export function ReportTableModal({
  open,
  report,
  onClose,
  closeLabel,
  screenshotHint,
}: {
  open: boolean;
  report: ReportTableData | null;
  onClose: () => void;
  closeLabel: string;
  screenshotHint?: string;
}) {
  const modalCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      modalCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [open, report]);

  if (!open || !report) return null;

  const colCount = report.headers.length;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div
        ref={modalCardRef}
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-gray-200 dark:border-ios-dark-separator bg-white dark:bg-ios-dark-elevated shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-ios-dark-separator px-5 py-4 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-app-label">{report.title}</h3>
            {report.subtitle ? <p className="text-sm text-app-secondary mt-0.5">{report.subtitle}</p> : null}
            {screenshotHint ? <p className="text-xs text-app-muted mt-2">{screenshotHint}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-ios border border-gray-300 dark:border-ios-dark-separator px-3 py-1.5 text-sm font-medium text-app-primary hover:bg-gray-100 dark:hover:bg-ios-dark-fill"
          >
            {closeLabel}
          </button>
        </div>

        <div className="overflow-auto p-4 min-h-0">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-ios-dark-fill">
                {report.headers.map((h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className="border border-gray-200 dark:border-ios-dark-separator px-3 py-2 text-left font-semibold text-app-label whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, ri) => (
                <tr key={ri} className="odd:bg-white even:bg-gray-50/80 dark:odd:bg-ios-dark-elevated dark:even:bg-ios-dark-fill/40">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border border-gray-200 dark:border-ios-dark-separator px-3 py-2 text-app-primary align-top"
                    >
                      {cell || '—'}
                    </td>
                  ))}
                  {row.length < colCount
                    ? Array.from({ length: colCount - row.length }, (_, i) => (
                        <td key={`pad-${i}`} className="border border-gray-200 dark:border-ios-dark-separator px-3 py-2">
                          —
                        </td>
                      ))
                    : null}
                </tr>
              ))}
            </tbody>
            {report.footerRow && report.footerRow.length > 0 ? (
              <tfoot>
                <tr className="bg-gray-100 dark:bg-ios-dark-fill font-semibold">
                  {report.footerRow.map((cell, i) => (
                    <td
                      key={i}
                      className="border border-gray-200 dark:border-ios-dark-separator px-3 py-2 text-app-label"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </div>
  );
}

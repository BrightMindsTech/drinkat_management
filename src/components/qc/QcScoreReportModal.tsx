'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { QcScoreReport } from '@/lib/qc-form-score-report';
import { useLanguage } from '@/contexts/LanguageContext';
import { prepareModalViewport } from '@/lib/modal-present';

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function QcScoreReportModal({
  open,
  report,
  onClose,
  managerCanAcknowledge,
  reviewed,
  onMarkReviewed,
}: {
  open: boolean;
  report: QcScoreReport | null;
  onClose: () => void;
  /** Branch manager: show big checkmark to acknowledge review. */
  managerCanAcknowledge?: boolean;
  reviewed?: boolean;
  onMarkReviewed?: () => void | Promise<void>;
}) {
  const { t } = useLanguage();
  const [marking, setMarking] = useState(false);
  const [localReviewed, setLocalReviewed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const stackRef = useRef<HTMLDivElement>(null);
  const showReviewed = reviewed || localReviewed;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalReviewed(false);
    setMarking(false);
  }, [open, report, reviewed]);

  useEffect(() => {
    if (!open) return;
    const restore = prepareModalViewport('smooth');
    const id = window.requestAnimationFrame(() => {
      stackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
    return () => {
      window.cancelAnimationFrame(id);
      restore();
    };
  }, [open]);

  if (!mounted || !open || !report) return null;

  async function handleMarkReviewed() {
    if (!onMarkReviewed || marking || showReviewed) return;
    setMarking(true);
    try {
      await onMarkReviewed();
      setLocalReviewed(true);
    } finally {
      setMarking(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] overscroll-none sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quality Control Visit Report"
      data-app-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        ref={stackRef}
        className="flex w-full max-w-2xl max-h-[min(96dvh,920px)] flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Report — scrolls independently; action dock stays visible below */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-gray-300 bg-[#20c8d8] p-5 text-black shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold">Quality Control Visit Report</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-ios border border-gray-400 bg-white px-3 py-1.5 text-sm font-semibold"
            >
              Close
            </button>
          </div>

          <div className="mt-4 space-y-1 text-base">
            <p><span className="font-semibold">Branch Name:</span> {report.branchName}</p>
            <p><span className="font-semibold">Visit Date:</span> {report.visitDate}</p>
            <p><span className="font-semibold">Visit Time:</span> {report.visitTime}</p>
            <p><span className="font-semibold">QC Officer:</span> {report.qcOfficer}</p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border border-black/40 bg-transparent">
              <thead>
                <tr>
                  <th className="border border-black/40 px-2 py-1 text-left">Category</th>
                  <th className="border border-black/40 px-2 py-1 text-left">Score</th>
                </tr>
              </thead>
              <tbody>
                {report.categories.map((row) => (
                  <tr key={row.label}>
                    <td className="border border-black/40 px-2 py-1">{row.label}</td>
                    <td className="border border-black/40 px-2 py-1">{row.score}/{row.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-2xl font-bold">Final Score: {report.finalScore}%</p>
          <p className="mt-3"><span className="font-semibold">Key Weaknesses:</span> {report.keyWeaknesses}</p>
          <p className="mt-2"><span className="font-semibold">Recommended Actions:</span> {report.recommendedActions}</p>
          <p className="mt-2"><span className="font-semibold">Branch Manager:</span> {report.branchManager}</p>
        </div>

        {managerCanAcknowledge ? (
          <div className="shrink-0 rounded-xl border border-gray-200 bg-white/95 px-4 py-4 text-center shadow-2xl backdrop-blur-sm dark:border-ios-dark-separator dark:bg-ios-dark-elevated/95">
            {showReviewed ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-green-800 bg-green-600 text-white shadow-lg">
                  <CheckIcon className="h-12 w-12" />
                </div>
                <p className="text-base font-bold text-green-800 dark:text-green-300">{t.forms.qcReviewedDone}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleMarkReviewed()}
                  disabled={marking}
                  aria-label={t.forms.markQcReviewed}
                  className="flex h-24 w-24 items-center justify-center rounded-full border-[5px] border-green-800 bg-green-500 text-white shadow-xl transition hover:bg-green-600 hover:scale-[1.02] active:scale-95 disabled:cursor-wait disabled:opacity-70"
                >
                  <CheckIcon className="h-14 w-14" />
                </button>
                <p className="text-sm font-semibold text-app-primary">{t.forms.markQcReviewed}</p>
                <p className="max-w-sm text-xs text-app-secondary">{t.forms.markQcReviewedHint}</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}

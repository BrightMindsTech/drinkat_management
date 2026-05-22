'use client';

import type { QcScoreReport } from '@/lib/qc-form-score-report';
import { AppModal } from '@/components/AppModal';

export function QcScoreReportModal({
  open,
  report,
  onClose,
}: {
  open: boolean;
  report: QcScoreReport | null;
  onClose: () => void;
}) {
  if (!report) return null;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      panelClassName="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-xl border border-gray-300 bg-[#20c8d8] p-5 text-black shadow-2xl"
    >
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
    </AppModal>
  );
}

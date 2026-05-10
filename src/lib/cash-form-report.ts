/**
 * Aggregates management cash form submissions (category `cash`) for owner reports.
 * Field keys match drinkatFormDefinitions Cash Form seed.
 */

export type CashFormBranchRow = {
  branchId: string;
  branchName: string;
  submissionCount: number;
  grossCashSalesJod: number;
  netCashJod: number;
};

export type CashFormReportTotals = {
  submissionCount: number;
  grossCashSalesJod: number;
  netCashJod: number;
};

function parseMoney(raw: string | undefined): number {
  if (raw == null || raw === '') return 0;
  const n = parseFloat(String(raw).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Gross: sum of `cash_sales` (reported cash takings per shift).
 * Net: sum of `counted_cash − opening_float` per form (physical net cash movement for the shift).
 */
export function buildCashFormReport(
  submissions: { branchId: string; answersJson: string; status: string }[],
  branches: { id: string; name: string }[]
): { byBranch: CashFormBranchRow[]; totals: CashFormReportTotals } {
  const agg = new Map<string, { gross: number; net: number; count: number }>();
  let totalGross = 0;
  let totalNet = 0;
  let totalCount = 0;

  for (const s of submissions) {
    if (s.status === 'denied') continue;
    let answers: Record<string, string> = {};
    try {
      answers = JSON.parse(s.answersJson) as Record<string, string>;
    } catch {
      continue;
    }

    const cashSales = parseMoney(answers.cash_sales);
    const opening = parseMoney(answers.opening_float);
    const counted = parseMoney(answers.counted_cash);
    const netRow = counted - opening;

    const cur = agg.get(s.branchId) ?? { gross: 0, net: 0, count: 0 };
    cur.gross += cashSales;
    cur.net += netRow;
    cur.count += 1;
    agg.set(s.branchId, cur);

    totalGross += cashSales;
    totalNet += netRow;
    totalCount += 1;
  }

  const byBranch: CashFormBranchRow[] = branches.map((b) => {
    const a = agg.get(b.id) ?? { gross: 0, net: 0, count: 0 };
    return {
      branchId: b.id,
      branchName: b.name,
      submissionCount: a.count,
      grossCashSalesJod: round2(a.gross),
      netCashJod: round2(a.net),
    };
  });

  return {
    byBranch,
    totals: {
      submissionCount: totalCount,
      grossCashSalesJod: round2(totalGross),
      netCashJod: round2(totalNet),
    },
  };
}

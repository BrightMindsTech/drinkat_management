export type KpiRankMedal = 'gold' | 'silver' | 'bronze';

export function kpiDisplayedTotal(row: {
  total: number | null;
  displayTotal?: number | null;
  individualScorePublished?: boolean;
}): number | null {
  const shown = row.individualScorePublished === false ? row.displayTotal ?? null : row.total;
  if (shown == null || Number.isNaN(Number(shown))) return null;
  return Number(shown);
}

export function sortKpiRowsDesc<T>(
  rows: T[],
  scoreOf: (row: T) => number | null,
  nameOf: (row: T) => string = () => ''
): T[] {
  return [...rows].sort((a, b) => {
    const va = scoreOf(a);
    const vb = scoreOf(b);
    if (va == null && vb == null) return nameOf(a).localeCompare(nameOf(b));
    if (va == null) return 1;
    if (vb == null) return -1;
    if (vb !== va) return vb - va;
    return nameOf(a).localeCompare(nameOf(b));
  });
}

export function kpiMedalForIndex(index: number, score: number | null): KpiRankMedal | null {
  if (score == null) return null;
  if (index === 0) return 'gold';
  if (index === 1) return 'silver';
  if (index === 2) return 'bronze';
  return null;
}

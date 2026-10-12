/** Pure KPI evidence helpers. AI must never call these to write scores. */

export type IssueForKpi = {
  id: string;
  createdAt: Date;
  closedAt: Date | null;
  verifiedAt: Date | null;
  status: string;
  severity: string;
  questionKey: string;
  assigneeEmployeeId: string | null;
  inspectionAssigneeEmployeeId?: string | null;
  responsibilityClassification?: string | null;
  responsibilityApprovedAt?: Date | null;
};

export function isApprovedEmployeeError(issue: IssueForKpi): boolean {
  return issue.responsibilityClassification === 'employee_error' && !!issue.responsibilityApprovedAt;
}

export function attributedToEmployee(issue: IssueForKpi, employeeId: string): boolean {
  return issue.inspectionAssigneeEmployeeId === employeeId;
}

/** Same template-question key failed again inside the configured window. */
export function countQuestionKeyRepeats(issues: IssueForKpi[], windowMs: number): number {
  const sorted = [...issues].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  let n = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    const cur = sorted[i];
    if (!cur.questionKey) continue;
    const prior = sorted.find(
      (p, idx) =>
        idx < i &&
        p.questionKey === cur.questionKey &&
        cur.createdAt.getTime() - p.createdAt.getTime() > 0 &&
        cur.createdAt.getTime() - p.createdAt.getTime() <= windowMs
    );
    if (prior) n += 1;
  }
  return n;
}

export function closedWithinSla(issue: IssueForKpi, slaMs: number): boolean {
  if (issue.status !== 'closed' || !issue.closedAt) return false;
  return issue.closedAt.getTime() - issue.createdAt.getTime() <= slaMs;
}

export function criticalSlaParts(
  issues: IssueForKpi[],
  slaMs: number,
  nowMs: number,
  resolvedInPeriod: (closedOrVerifiedAt: Date) => boolean
): { resolvedWithin: number; resolvedInPeriod: number; overdueUnresolved: number } {
  const criticals = issues.filter((i) => i.severity === 'critical');
  const resolved = criticals.filter((i) => {
    if (i.status !== 'closed' && i.status !== 'verified') return false;
    const end = i.closedAt ?? i.verifiedAt;
    return !!(end && resolvedInPeriod(end));
  });
  const overdueUnresolved = criticals.filter((i) => {
    if (i.status === 'closed' || i.status === 'verified') return false;
    return nowMs - i.createdAt.getTime() > slaMs;
  });
  const resolvedWithin = resolved.filter((i) => {
    const end = i.closedAt ?? i.verifiedAt;
    return !!(end && end.getTime() - i.createdAt.getTime() <= slaMs);
  });
  return {
    resolvedWithin: resolvedWithin.length,
    resolvedInPeriod: resolved.length,
    overdueUnresolved: overdueUnresolved.length,
  };
}

export function slaMsForSeverity(
  severity: string,
  rules: { severity: string; slaHours: number; active: boolean }[],
  fallbackHours = 24
): number {
  const rule = rules.find((r) => r.active && r.severity === severity);
  return (rule?.slaHours ?? fallbackHours) * 3600_000;
}

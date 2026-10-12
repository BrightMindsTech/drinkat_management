/**
 * Idempotent inspection task generation (Phase 1: designed, NOT activated).
 *
 * Cron may generate tasks only when INSPECTION_SCHEDULER_ENABLED=1 (staging).
 * Duplicate protection is the unique key (scheduleId, assigneeEmployeeId, periodKey).
 */

export type InspectionTaskInsert = {
  scheduleId: string;
  templateVersionId: string;
  assigneeEmployeeId: string;
  branchId: string;
  periodKey: string;
  dueAt: Date;
};

export function inspectionTaskUniqueKey(scheduleId: string, assigneeEmployeeId: string, periodKey: string): string {
  return `${scheduleId}:${assigneeEmployeeId}:${periodKey}`;
}

export function plannedTasksAreUnique(rows: InspectionTaskInsert[]): boolean {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = inspectionTaskUniqueKey(row.scheduleId, row.assigneeEmployeeId, row.periodKey);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

/**
 * Safe retry: callers should use create-with-skip-duplicates (or equivalent)
 * so a retried cron tick cannot insert a second task for the same unique key.
 *
 * This helper is the only supported insert shape.
 */
export function toInspectionTaskCreateMany(rows: InspectionTaskInsert[]): InspectionTaskInsert[] {
  const byKey = new Map<string, InspectionTaskInsert>();
  for (const row of rows) {
    byKey.set(inspectionTaskUniqueKey(row.scheduleId, row.assigneeEmployeeId, row.periodKey), row);
  }
  return [...byKey.values()];
}

/** Issue uniqueness: one issue per source inspection answer. */
export function issueSourceUniqueKey(sourceAnswerId: string): string {
  return sourceAnswerId;
}

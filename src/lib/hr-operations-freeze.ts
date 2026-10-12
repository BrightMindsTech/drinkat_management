/**
 * HR operations (payroll, advances, leave) are frozen in DRINKAT QC.
 * Historical rows stay in D1. Owner may export via GET /api/hr/export.
 */
export const HR_OPERATIONS_FROZEN_MESSAGE =
  'HR operations are frozen. Historical records are available via owner export.';

export function hrOperationsFrozenResponse(): Response {
  return Response.json({ error: HR_OPERATIONS_FROZEN_MESSAGE }, { status: 403 });
}

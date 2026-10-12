/** Prisma and D1 unique-constraint failures (D1 often omits Prisma P2002). */
export function isUniqueConflictError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; message?: unknown };
  if (e.code === 'P2002') return true;
  const msg = String(e.message ?? '');
  return /UNIQUE constraint failed/i.test(msg) || /unique constraint/i.test(msg);
}

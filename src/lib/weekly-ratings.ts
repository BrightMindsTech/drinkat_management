import type { PrismaClient } from '@prisma/client';
import { addDays, endOfMonth, parse, startOfMonth } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { AppUserRole } from '@/lib/formVisibility';
import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';

const TZ = DEFAULT_APP_TIMEZONE;

function addDaysYmd(ymd: string, deltaDays: number, tz: string): string {
  const inst = fromZonedTime(parse(`${ymd} 12:00:00`, 'yyyy-MM-dd HH:mm:ss', new Date(0)), tz);
  const moved = addDays(inst, deltaDays);
  return formatInTimeZone(moved, tz, 'yyyy-MM-dd');
}

/** Monday YYYY-MM-DD (in TZ) for the ISO calendar week containing `instant`. */
export function mondayWeekStartKeyForInstant(instant: Date, tz: string = TZ): string {
  const ymd = formatInTimeZone(instant, tz, 'yyyy-MM-dd');
  const isoD = parseInt(formatInTimeZone(instant, tz, 'i'), 10); // 1=Mon … 7=Sun
  const mondayOffset = isoD - 1;
  return addDaysYmd(ymd, -mondayOffset, tz);
}

/**
 * Which week's ratings are currently due for clock / compliance.
 * Sat–Sun: current ISO week (Mon–Sun). Mon–Fri: previous ISO week (must have completed last weekend).
 */
export function getObligationWeekStartKey(now: Date = new Date(), tz: string = TZ): string {
  const isoD = parseInt(formatInTimeZone(now, tz, 'i'), 10);
  const thisMonday = mondayWeekStartKeyForInstant(now, tz);
  if (isoD === 6 || isoD === 7) return thisMonday;
  return addDaysYmd(thisMonday, -7, tz);
}

/** True Sat/Sun in app TZ (submission emphasis / UI copy). Ratings can still be submitted Mon–Fri as catch-up for the due week. */
export function isWeekendSubmissionEmphasis(now: Date = new Date(), tz: string = TZ): boolean {
  const isoD = parseInt(formatInTimeZone(now, tz, 'i'), 10);
  return isoD === 6 || isoD === 7;
}

export function rolesSubjectToWeeklyRating(role: AppUserRole): boolean {
  return role === 'manager' || role === 'staff' || role === 'qc' || role === 'marketing';
}

/** All Monday keys (YYYY-MM-DD) whose Mon–Sun range intersects the calendar month of `ref` in TZ. */
export function weekStartKeysOverlappingMonth(ref: Date, tz: string = TZ): string[] {
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);
  const keys = new Set<string>();
  let d = start;
  while (d <= end) {
    keys.add(mondayWeekStartKeyForInstant(d, tz));
    d = addDays(d, 1);
  }
  return [...keys].sort();
}

/** Every ISO Monday key (YYYY-MM-DD) for weeks intersecting [start, end] inclusive (by calendar day in TZ). */
export function weekStartKeysBetweenRange(start: Date, end: Date, tz: string = TZ): string[] {
  const keys = new Set<string>();
  let d = new Date(start);
  const last = new Date(end);
  while (d <= last) {
    keys.add(mondayWeekStartKeyForInstant(d, tz));
    d = addDays(d, 1);
  }
  return [...keys].sort();
}

export async function getExpectedRatingTargetIds(
  prisma: PrismaClient,
  raterEmployeeId: string,
  role: AppUserRole
): Promise<string[]> {
  const emp = await prisma.employee.findUnique({
    where: { id: raterEmployeeId },
    select: {
      directReports: { where: { status: { in: ['active', 'on_leave'] } }, select: { id: true } },
    },
  });
  if (!emp) return [];

  if (role === 'manager') {
    return emp.directReports.map((d) => d.id);
  }

  return [];
}

/** Managers an employee may rate voluntarily (no obligation to rate all). Excludes self. */
export async function getEligibleWeeklyRatingManagerTargets(
  prisma: PrismaClient,
  excludeEmployeeId: string
): Promise<{ id: string; name: string }[]> {
  return prisma.employee.findMany({
    where: {
      role: 'manager',
      status: { in: ['active', 'on_leave'] },
      NOT: { id: excludeEmployeeId },
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

export async function isWeeklyRatingGateBlocking(
  prisma: PrismaClient,
  raterEmployeeId: string,
  role: AppUserRole
): Promise<boolean> {
  if (!rolesSubjectToWeeklyRating(role)) return false;
  // Only managers are required to submit for every direct report. Staff/QC/marketing ratings are voluntary.
  if (role !== 'manager') return false;

  const weekKey = getObligationWeekStartKey();
  const expected = await getExpectedRatingTargetIds(prisma, raterEmployeeId, role);
  if (expected.length === 0) return false;

  const rows = await prisma.weeklyRating.findMany({
    where: { raterEmployeeId, weekStartKey: weekKey, targetEmployeeId: { in: expected } },
    select: { targetEmployeeId: true },
  });
  const done = new Set(rows.map((r) => r.targetEmployeeId));
  return expected.some((id) => !done.has(id));
}

export async function assertTargetAllowedForRater(
  prisma: PrismaClient,
  raterEmployeeId: string,
  targetEmployeeId: string,
  role: AppUserRole
): Promise<boolean> {
  const weekStartKey = getObligationWeekStartKey();

  if (role === 'manager') {
    const expected = await getExpectedRatingTargetIds(prisma, raterEmployeeId, role);
    return expected.includes(targetEmployeeId);
  }
  if (role !== 'staff' && role !== 'qc' && role !== 'marketing') return false;

  const existingThisWeek = await prisma.weeklyRating.findUnique({
    where: {
      raterEmployeeId_targetEmployeeId_weekStartKey: {
        raterEmployeeId,
        targetEmployeeId,
        weekStartKey,
      },
    },
    select: { id: true },
  });
  if (existingThisWeek) return true;

  const target = await prisma.employee.findUnique({
    where: { id: targetEmployeeId },
    select: { id: true, role: true, status: true },
  });
  if (!target || target.id === raterEmployeeId) return false;
  if (target.role !== 'manager') return false;
  return target.status === 'active' || target.status === 'on_leave';
}

import type { PrismaClient } from '@prisma/client';
import { notifyOwnersAndManager } from '@/lib/user-notify';

export function formatAwayKindLabel(kind: string): string {
  if (kind === 'break') return 'Break';
  if (kind === 'bathroom') return 'Bathroom';
  if (kind === 'other') return 'Other';
  return kind;
}

export async function notifyAwayStarted(
  prisma: PrismaClient,
  args: {
    managerUserId: string | null;
    employeeId: string;
    employeeName: string;
    branchId: string;
    branchName: string;
    awaySessionId: string;
    kind: string;
    minutes: number;
    otherNote?: string | null;
  }
): Promise<void> {
  const kindLabel = formatAwayKindLabel(args.kind);
  const noteSuffix =
    args.kind === 'other' && args.otherNote?.trim() ? ` (${args.otherNote.trim()})` : '';
  const title = 'Employee left branch';
  const body = `${args.employeeName} left ${args.branchName} — ${kindLabel}${noteSuffix}. ${args.minutes}-minute away timer started.`;

  try {
    await notifyOwnersAndManager(prisma, args.managerUserId, {
      category: 'time_clock',
      title,
      body,
      dataJson: JSON.stringify({
        type: 'time_clock_away_started',
        employeeId: args.employeeId,
        employeeName: args.employeeName,
        branchId: args.branchId,
        branchName: args.branchName,
        awaySessionId: args.awaySessionId,
        kind: args.kind,
        href: '/dashboard/reports',
      }),
      push: {
        title,
        body: `${args.employeeName}: ${kindLabel} (${args.minutes} min)`,
        data: {
          type: 'time_clock_away_started',
          url: '/dashboard/reports',
          employeeId: args.employeeId,
        },
      },
    });
  } catch (e) {
    console.error('[time-clock] notifyAwayStarted failed', e);
  }
}

export async function notifyGeofenceExitWhileClockedIn(
  prisma: PrismaClient,
  args: {
    managerUserId: string | null;
    employeeId: string;
    employeeName: string;
    branchId: string;
    branchName: string;
  }
): Promise<void> {
  const title = 'Time clock alert: employee left branch';
  const body = `${args.employeeName} exited ${args.branchName} while still clocked in. Waiting for away reason.`;

  try {
    await notifyOwnersAndManager(prisma, args.managerUserId, {
      category: 'time_clock',
      title,
      body,
      dataJson: JSON.stringify({
        type: 'time_clock_destination_required',
        employeeId: args.employeeId,
        employeeName: args.employeeName,
        branchId: args.branchId,
        branchName: args.branchName,
        href: '/dashboard/reports',
      }),
      push: {
        title,
        body,
        data: {
          type: 'time_clock_destination_required',
          url: '/dashboard/reports',
          employeeId: args.employeeId,
        },
      },
    });
  } catch (e) {
    console.error('[time-clock] notifyGeofenceExitWhileClockedIn failed', e);
  }
}

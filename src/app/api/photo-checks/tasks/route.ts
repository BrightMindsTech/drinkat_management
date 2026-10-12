import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { employeePhotoRequired } from '@/lib/photo-eligibility';
import { generatePhotoTasksForEmployee } from '@/lib/photo-generate';
import { assignApprovedPhotoTypes, ensureOfficialPhotoProgram } from '@/lib/photo-ops-program';
import { photoPeriodKey, shiftPhotoPeriodKey } from '@/lib/photo-time';
import { listUpcomingPhotoWindows, nextPhotoWave } from '@/lib/photo-upcoming';
import { hideClaimedPhotoTasksForEmployee } from '@/lib/photo-branch-claim';

const typeSelect = {
  code: true,
  titleEn: true,
  titleAr: true,
  requiresMeasurement: true,
  measurementUnit: true,
  handwrittenNote: true,
  criteriaJson: true,
  minPhotos: true,
  maxPhotos: true,
} as const;

export const GET = withApiErrors(async function GET() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: true },
  });
  if (!user?.employee) return Response.json({ required: false, items: [], upcoming: [] });
  const required = await employeePhotoRequired(prisma, user.employee.id);
  if (!required) return Response.json({ required: false, items: [], upcoming: [] });

  const now = new Date();
  const emp = user.employee;
  await ensureOfficialPhotoProgram(prisma);
  const assignedCount = await prisma.photoCheckEmployeeType.count({
    where: { employeeId: emp.id, assigned: true },
  });
  if (assignedCount === 0) {
    await assignApprovedPhotoTypes(prisma, emp.id);
  }
  await generatePhotoTasksForEmployee(prisma, emp.id, now);

  const periodKey = photoPeriodKey(now);
  const yesterdayKey = shiftPhotoPeriodKey(periodKey, -1);
  const claimedToday = await hideClaimedPhotoTasksForEmployee(prisma, {
    employeeId: emp.id,
    branchId: emp.branchId,
    periodKey,
  });
  const claimedYesterday = await hideClaimedPhotoTasksForEmployee(prisma, {
    employeeId: emp.id,
    branchId: emp.branchId,
    periodKey: yesterdayKey,
  });
  const [items, assignments, schedules] = await Promise.all([
    prisma.photoCheckTask.findMany({
      where: {
        assigneeEmployeeId: emp.id,
        status: { notIn: ['cancelled'] },
        OR: [{ periodKey }, { periodKey: yesterdayKey, dueAt: { gte: now } }],
      },
      include: {
        type: { select: typeSelect },
        schedule: { select: { slotKey: true, slotLabelEn: true, slotLabelAr: true, dueTime: true, startTime: true } },
        submission: { select: { id: true, status: true, aiVerdict: true, aiScore: true } },
      },
      orderBy: [{ dueAt: 'asc' }],
    }),
    prisma.photoCheckEmployeeType.findMany({
      where: { employeeId: emp.id, assigned: true },
      select: { typeId: true },
    }),
    prisma.photoCheckSchedule.findMany({
      where: { active: true, type: { active: true, provisional: false } },
      select: {
        id: true,
        typeId: true,
        employeeId: true,
        branchId: true,
        role: true,
        daysOfWeekJson: true,
        slotKey: true,
        slotLabelEn: true,
        slotLabelAr: true,
        startTime: true,
        dueTime: true,
        type: { select: { id: true, ...typeSelect } },
      },
    }),
  ]);

  const assigned = new Set(assignments.map((a) => a.typeId));
  const relevant = schedules.filter((s) => {
    if (s.employeeId && s.employeeId !== emp.id) return false;
    if (s.branchId && s.branchId !== emp.branchId) return false;
    if (s.role && s.role !== emp.role) return false;
    return assigned.has(s.typeId);
  });

  const have = new Set([
    ...items.map((t) => `${t.scheduleId}:${t.periodKey}`),
    ...claimedToday.claimedScheduleIds.map((id) => `${id}:${periodKey}`),
    ...claimedYesterday.claimedScheduleIds.map((id) => `${id}:${yesterdayKey}`),
  ]);
  const upcomingAll = listUpcomingPhotoWindows(
    relevant.map((s) => ({
      scheduleId: s.id,
      typeId: s.typeId,
      slotKey: s.slotKey,
      slotLabelEn: s.slotLabelEn,
      slotLabelAr: s.slotLabelAr,
      startTime: s.startTime,
      dueTime: s.dueTime,
      daysOfWeekJson: s.daysOfWeekJson,
    })),
    now
  ).filter((w) => !have.has(`${w.scheduleId}:${w.periodKey}`));

  const typeById = new Map(relevant.map((s) => [s.typeId, s.type]));
  const upcoming = nextPhotoWave(upcomingAll).map((w) => {
    const type = typeById.get(w.typeId);
    if (!type) return null;
    return {
      id: `upcoming:${w.scheduleId}:${w.periodKey}`,
      kind: 'upcoming' as const,
      status: 'scheduled',
      dueAt: w.dueAt.toISOString(),
      windowStartAt: w.windowStartAt.toISOString(),
      slotKey: w.slotKey,
      type,
      schedule: { slotKey: w.slotKey, slotLabelEn: w.slotLabelEn, slotLabelAr: w.slotLabelAr },
      submission: null,
    };
  }).filter((row): row is NonNullable<typeof row> => row != null);

  return Response.json({ required: true, periodKey, now: now.toISOString(), items, upcoming });
});

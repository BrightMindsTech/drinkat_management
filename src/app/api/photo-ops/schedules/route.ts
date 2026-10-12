import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePhotoOpsAdmin } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { z } from 'zod';

export const GET = withApiErrors(async function GET() {
  await requirePhotoOpsAdmin();
  const schedules = await prisma.photoCheckSchedule.findMany({
    include: { type: { select: { code: true, titleEn: true, titleAr: true } } },
    orderBy: [{ typeId: 'asc' }, { dueTime: 'asc' }],
  });
  return Response.json({ schedules });
});

const schema = z.object({
  id: z.string().optional(),
  typeId: z.string().min(4),
  branchId: z.string().nullable().optional(),
  employeeId: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  daysOfWeekJson: z.string().optional(),
  slotKey: z.string(),
  slotLabelEn: z.string(),
  slotLabelAr: z.string(),
  startTime: z.string(),
  dueTime: z.string(),
  reminderMinutesBefore: z.number().int().nullable().optional(),
  overdueReminderMinutes: z.number().int().nullable().optional(),
  maxReminders: z.number().int().optional(),
  reminderCooldownMinutes: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  await requirePhotoOpsAdmin();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'Invalid schedule' }, { status: 400 });
  const { id, ...data } = parsed.data;
  const row = id
    ? await prisma.photoCheckSchedule.update({ where: { id }, data })
    : await prisma.photoCheckSchedule.create({ data: { ...data, active: data.active ?? false } });
  return Response.json({ schedule: row });
});

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePhotoOpsAdmin } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { cancelOpenPhotoTasks } from '@/lib/photo-eligibility';
import { generatePhotoTasksForEmployee } from '@/lib/photo-generate';
import { assignApprovedPhotoTypes, ensureOfficialPhotoProgram } from '@/lib/photo-ops-program';
import { z } from 'zod';

export const GET = withApiErrors(async function GET(req: NextRequest) {
  await requirePhotoOpsAdmin();
  const q = new URL(req.url).searchParams;
  if (q.get('history') === '1') {
    const employeeId = q.get('employeeId')?.trim() || undefined;
    const audits = await prisma.photoCheckAssignmentAudit.findMany({
      where: employeeId ? { employeeId } : {},
      include: { actor: { select: { email: true, employee: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    return Response.json({ audits });
  }
  const search = q.get('q')?.trim() ?? '';
  const branchId = q.get('branchId')?.trim() || undefined;
  const [employees, branches] = await Promise.all([
    prisma.employee.findMany({
      where: {
        status: { not: 'terminated' },
        ...(branchId ? { branchId } : {}),
        ...(search ? { name: { contains: search } } : {}),
      },
      select: {
        id: true,
        name: true,
        role: true,
        branchId: true,
        branch: { select: { name: true } },
        photoCheckSetting: { select: { required: true, updatedAt: true } },
      },
      orderBy: { name: 'asc' },
      take: 200,
    }),
    prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  return Response.json({ employees, branches });
});

const patchSchema = z.object({
  employeeId: z.string().min(4).optional(),
  employeeIds: z.array(z.string().min(4)).optional(),
  required: z.boolean().optional(),
});

async function applyEmployeePhotoOps(actorUserId: string, employeeId: string, required: boolean) {
  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, status: true },
  });
  if (!emp || emp.status === 'terminated') return { employeeId, error: 'Employee not found' as const };

  await prisma.photoCheckEmployeeSetting.upsert({
    where: { employeeId },
    update: { required, updatedById: actorUserId },
    create: { employeeId, required, updatedById: actorUserId },
  });

  let tasksCreated = 0;
  if (!required) {
    await cancelOpenPhotoTasks(prisma, employeeId, 'global_photo_requirement_off');
  } else {
    await assignApprovedPhotoTypes(prisma, employeeId);
    const gen = await generatePhotoTasksForEmployee(prisma, employeeId);
    tasksCreated = gen.created;
  }

  await prisma.photoCheckAssignmentAudit.create({
    data: {
      employeeId,
      actorUserId,
      action: required ? 'global_on' : 'global_off',
      beforeJson: '{}',
      afterJson: JSON.stringify({ required, tasksCreated, effectiveAt: new Date().toISOString() }),
    },
  });
  return { employeeId, ok: true as const, required, tasksCreated };
}

export const POST = withApiErrors(async function POST(req: NextRequest) {
  const session = await requirePhotoOpsAdmin();
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'employeeId required' }, { status: 400 });
  const { employeeId, employeeIds, required } = parsed.data;
  if (required === undefined) return Response.json({ error: 'required true/false needed' }, { status: 400 });
  const ids = [...new Set([...(employeeIds ?? []), ...(employeeId ? [employeeId] : [])])];
  if (ids.length === 0) return Response.json({ error: 'employeeId required' }, { status: 400 });
  if (required) await ensureOfficialPhotoProgram(prisma);
  const results = [];
  for (const id of ids) {
    results.push(await applyEmployeePhotoOps(session.user.id, id, required));
  }
  return Response.json({ ok: true, results });
});

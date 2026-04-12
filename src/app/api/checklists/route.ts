import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireQc } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  branchId: z.string().optional(),
  repeatsDaily: z.boolean().optional(),
  deadlineTime: z.string().regex(/^\d{1,2}:\d{2}$/), // "HH:mm" or "H:mm"
  items: z.array(z.object({ title: z.string().min(1), sortOrder: z.number().optional() })).optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireQc();
  const role = normalizeUserRole(session.user.role);
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');

  let where: { OR?: { branchId: string | null }[] } | undefined = branchId ? { OR: [{ branchId }, { branchId: null }] } : undefined;
  if (role === 'manager') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return Response.json([]);
    where = { OR: [{ branchId: user.employee.branchId }, { branchId: null }] };
  }

  const checklists = await prisma.checklist.findMany({
    where,
    include: { branch: true, items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  return Response.json(checklists);
}

export async function POST(req: NextRequest) {
  const session = await requireQc();
  const role = normalizeUserRole(session.user.role);
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  let branchId = parsed.data.branchId ?? null;
  if (role === 'manager') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const managerBranchId = user.employee.branchId;
    if (branchId && branchId !== managerBranchId) {
      return Response.json({ error: 'Managers can only create checklists in their own branch' }, { status: 403 });
    }
    if (!branchId) branchId = managerBranchId;
  }

  const checklist = await prisma.checklist.create({
    data: {
      name: parsed.data.name,
      branchId,
      createdById: session.user.id,
      repeatsDaily: parsed.data.repeatsDaily ?? false,
      deadlineTime: parsed.data.deadlineTime,
      items: parsed.data.items?.length
        ? {
            create: parsed.data.items.map((item, i) => ({
              title: item.title,
              sortOrder: item.sortOrder ?? i,
            })),
          }
        : undefined,
    },
    include: { branch: true, items: { orderBy: { sortOrder: 'asc' } } },
  });
  return Response.json(checklist);
}

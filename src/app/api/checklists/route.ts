import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireQc } from '@/lib/session';
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
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');

  const checklists = await prisma.checklist.findMany({
    where: branchId ? { OR: [{ branchId }, { branchId: null }] } : undefined,
    include: { branch: true, items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  return Response.json(checklists);
}

export async function POST(req: NextRequest) {
  const session = await requireQc();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const checklist = await prisma.checklist.create({
    data: {
      name: parsed.data.name,
      branchId: parsed.data.branchId ?? null,
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

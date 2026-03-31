import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { z } from 'zod';

export async function GET() {
  await requireOwner();
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { employees: true } } },
  });
  return Response.json(departments);
}

const createSchema = z.object({
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  await requireOwner();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const existing = await prisma.department.findUnique({ where: { name: parsed.data.name } });
  if (existing) return Response.json({ error: 'Department already exists' }, { status: 409 });

  const department = await prisma.department.create({
    data: { name: parsed.data.name.trim() },
  });
  return Response.json(department);
}

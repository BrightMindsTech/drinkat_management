import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';

const resetSchema = z.object({
  password: z.string().min(6),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner();

  const { id } = await params;
  const body = await req.json();
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!employee?.user) return new Response(null, { status: 404 });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: employee.user.id },
    data: { passwordHash },
  });

  return Response.json({ ok: true });
}


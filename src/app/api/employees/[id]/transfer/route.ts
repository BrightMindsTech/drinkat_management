import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { z } from 'zod';

const bodySchema = z.object({
  toBranchId: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwner();

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { branch: true, user: true },
  });
  if (!employee) return new Response(null, { status: 404 });

  const { toBranchId } = parsed.data;
  if (toBranchId === employee.branchId) return Response.json({ error: 'Employee is already in this branch' }, { status: 400 });

  const toBranch = await prisma.branch.findUnique({ where: { id: toBranchId } });
  if (!toBranch) return Response.json({ error: 'Branch not found' }, { status: 404 });

  await prisma.employeeTransfer.create({
    data: {
      employeeId: id,
      fromBranchId: employee.branchId,
      toBranchId,
      transferredById: session.user.id,
    },
  });

  await prisma.employee.update({
    where: { id },
    data: { branchId: toBranchId },
  });

  if (employee.userId) {
    await prisma.user.update({
      where: { id: employee.userId },
      data: { branchId: toBranchId },
    });
  }

  const updated = await prisma.employee.findUnique({
    where: { id },
    include: {
      branch: true,
      department: true,
      user: { select: { email: true } },
      transfers: {
        include: {
          fromBranch: true,
          toBranch: true,
        },
        orderBy: { transferredAt: 'desc' },
      },
      documents: true,
    },
  });
  return Response.json(updated);
}

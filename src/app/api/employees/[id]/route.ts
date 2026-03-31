import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { z } from 'zod';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwner();
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { branch: true, department: true, user: { select: { email: true } } },
  });
  if (!employee) return new Response(null, { status: 404 });
  return Response.json(employee);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id }, include: { user: true } });
  if (!employee) return new Response(null, { status: 404 });
  if (employee.userId) await prisma.user.delete({ where: { id: employee.userId } });
  await prisma.employee.delete({ where: { id } });
  return new Response(null, { status: 204 });
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  contact: z.string().nullable().optional(),
  salaryAmount: z.number().nullable().optional(),
  residentialArea: z.string().nullable().optional(),
  shiftTime: z.string().nullable().optional(),
  departmentId: z.string().nullable().optional(),
  status: z.enum(['active', 'on_leave', 'terminated']).optional(),
  advanceLimit: z.number().nullable().optional(),
  idCardPhotoPath: z.string().nullable().optional(),
  idCardFrontPhotoPath: z.string().nullable().optional(),
  idCardBackPhotoPath: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireOwner();

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const { id } = await params;
  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { branch: true, user: { select: { email: true } } },
  });
  if (!existing) return new Response(null, { status: 404 });

  const { name, contact, salaryAmount, residentialArea, shiftTime, departmentId, status, advanceLimit, idCardPhotoPath, idCardFrontPhotoPath, idCardBackPhotoPath } = parsed.data;

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(contact !== undefined ? { contact } : {}),
      ...(salaryAmount !== undefined ? { salaryAmount } : {}),
      ...(residentialArea !== undefined ? { residentialArea } : {}),
      ...(shiftTime !== undefined ? { shiftTime } : {}),
      ...(departmentId !== undefined ? { departmentId } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(advanceLimit !== undefined ? { advanceLimit } : {}),
      ...(idCardPhotoPath !== undefined ? { idCardPhotoPath } : {}),
      ...(idCardFrontPhotoPath !== undefined ? { idCardFrontPhotoPath } : {}),
      ...(idCardBackPhotoPath !== undefined ? { idCardBackPhotoPath } : {}),
    },
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

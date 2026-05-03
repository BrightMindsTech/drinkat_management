import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { z } from 'zod';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwner();
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { branch: true, department: true, user: { select: { email: true, role: true } } },
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
  /** Must stay in sync with linked `User.role` when a login exists. */
  role: z.enum(['staff', 'qc', 'marketing', 'manager']).optional(),
  departmentId: z.string().nullable().optional(),
  // Assign this employee under a manager (direct reports only).
  reportsToEmployeeId: z.string().nullable().optional(),
  status: z.enum(['active', 'on_leave', 'terminated']).optional(),
  advanceLimit: z.number().nullable().optional(),
  employmentType: z.enum(['full_time', 'part_time']).optional(),
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

  const {
    name,
    contact,
    salaryAmount,
    residentialArea,
    shiftTime,
    role,
    departmentId,
    reportsToEmployeeId,
    status,
    advanceLimit,
    employmentType,
    idCardPhotoPath,
    idCardFrontPhotoPath,
    idCardBackPhotoPath,
  } = parsed.data;

  // Validate manager assignment + branch scoping.
  if (reportsToEmployeeId !== undefined) {
    if (reportsToEmployeeId === null) {
      // Unassign is always allowed.
    } else {
      const managerEmployee = await prisma.employee.findUnique({
        where: { id: reportsToEmployeeId },
        include: { user: true, branch: true },
      });
      if (!managerEmployee) return Response.json({ error: 'Manager not found' }, { status: 404 });
      if (managerEmployee.status === 'terminated')
        return Response.json({ error: 'Cannot assign under terminated manager' }, { status: 400 });

      // Managers are stored as their own role string on Employee + User.
      const managerIsManagerRole = managerEmployee.role === 'manager' || managerEmployee.user?.role === 'manager';
      if (!managerIsManagerRole) return Response.json({ error: 'Target employee is not a manager' }, { status: 403 });

      // Direct reports may be in any branch (owner assigns reporting line in HR).
    }
  }

  if (role !== undefined && existing.userId) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { role },
    });
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(contact !== undefined ? { contact } : {}),
      ...(salaryAmount !== undefined ? { salaryAmount } : {}),
      ...(residentialArea !== undefined ? { residentialArea } : {}),
      ...(shiftTime !== undefined ? { shiftTime } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(departmentId !== undefined ? { departmentId } : {}),
      ...(reportsToEmployeeId !== undefined ? { reportsToEmployeeId } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(advanceLimit !== undefined ? { advanceLimit } : {}),
      ...(employmentType !== undefined ? { employmentType } : {}),
      ...(idCardPhotoPath !== undefined ? { idCardPhotoPath } : {}),
      ...(idCardFrontPhotoPath !== undefined ? { idCardFrontPhotoPath } : {}),
      ...(idCardBackPhotoPath !== undefined ? { idCardBackPhotoPath } : {}),
    },
    include: {
      branch: true,
      department: true,
      user: { select: { email: true, role: true } },
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

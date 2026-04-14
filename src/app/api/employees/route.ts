import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, requireOwner } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';

const createSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  salaryAmount: z.number().optional(),
  role: z.enum(['staff', 'qc', 'marketing']),
  branchId: z.string().min(1),
  departmentId: z.string().nullable().optional(),
  advanceLimit: z.number().nullable().optional(),
  employmentType: z.enum(['full_time', 'part_time']).optional(),
  email: z.string().email(),
  password: z.string().min(6),
  residentialArea: z.string().optional(),
  shiftTime: z.string().optional(),
  idCardFrontPhotoPath: z.string().min(1),
  idCardBackPhotoPath: z.string().min(1),
  idCardPhotoPath: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');

  if (role === 'owner') {
    const employees = await prisma.employee.findMany({
      where: { status: { not: 'terminated' }, ...(branchId ? { branchId } : {}) },
      include: { branch: true, department: true, user: { select: { email: true } } },
      orderBy: { name: 'asc' },
    });
    return Response.json(employees);
  }

  if (role === 'manager') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { employee: true },
    });
    if (!user?.employee) return Response.json([]);
    const managerEmployee = user.employee;
    const employees = await prisma.employee.findMany({
      where: {
        status: { not: 'terminated' },
        reportsToEmployeeId: managerEmployee.id,
        branchId: managerEmployee.branchId,
      },
      include: { branch: true, department: true, user: { select: { email: true } } },
      orderBy: { name: 'asc' },
    });
    return Response.json(employees);
  }

  // Staff or QC: get own employee record via user -> employee
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { employee: { include: { branch: true } } },
  });
  if (!user?.employee) return Response.json([]);
  return Response.json([user.employee]);
}

export async function POST(req: NextRequest) {
  await requireOwner();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const {
    name,
    contact,
    salaryAmount,
    role,
    branchId,
    departmentId,
    advanceLimit,
    employmentType,
    email,
    password,
    residentialArea,
    shiftTime,
    idCardFrontPhotoPath,
    idCardBackPhotoPath,
    idCardPhotoPath,
  } = parsed.data;

  const department = departmentId ? await prisma.department.findUnique({ where: { id: departmentId } }) : null;
  const isManagerDepartment = !!department && department.name.trim().toLowerCase() === 'manager';
  const resolvedUserRole = (isManagerDepartment ? 'manager' : role) as
    | 'staff'
    | 'qc'
    | 'manager'
    | 'marketing';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return Response.json({ error: 'Email already registered' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: resolvedUserRole,
      branchId,
    },
  });
  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      branchId,
      departmentId: departmentId ?? null,
      advanceLimit: advanceLimit ?? null,
      employmentType: employmentType ?? 'full_time',
      name,
      contact: contact ?? null,
      salaryAmount: salaryAmount ?? null,
      role: resolvedUserRole,
      residentialArea: residentialArea ?? null,
      shiftTime: shiftTime ?? null,
      idCardPhotoPath: idCardPhotoPath ?? null,
      idCardFrontPhotoPath: idCardFrontPhotoPath ?? null,
      idCardBackPhotoPath: idCardBackPhotoPath ?? null,
    },
    include: { branch: true, department: true, user: { select: { email: true } } },
  });
  return Response.json(employee);
}

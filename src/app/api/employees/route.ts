import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, requireOwner } from '@/lib/session';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';

const createSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  salaryAmount: z.number().optional(),
  role: z.enum(['staff', 'qc']),
  branchId: z.string().min(1),
  departmentId: z.string().nullable().optional(),
  advanceLimit: z.number().nullable().optional(),
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
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');

  if (session.user.role === 'owner') {
    const employees = await prisma.employee.findMany({
      where: { status: { not: 'terminated' }, ...(branchId ? { branchId } : {}) },
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
    email,
    password,
    residentialArea,
    shiftTime,
    idCardFrontPhotoPath,
    idCardBackPhotoPath,
    idCardPhotoPath,
  } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return Response.json({ error: 'Email already registered' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: role as 'staff' | 'qc',
      branchId,
    },
  });
  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      branchId,
      departmentId: departmentId ?? null,
      advanceLimit: advanceLimit ?? null,
      name,
      contact: contact ?? null,
      salaryAmount: salaryAmount ?? null,
      role: role as 'staff' | 'qc',
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

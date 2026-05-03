import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { z } from 'zod';

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  notes: z.string().optional(),
  reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function assertCanReadEmployeeReviews(session: { user: { id: string; role: string } }, employeeId: string) {
  const role = normalizeUserRole(session.user.role);
  if (role === 'owner') {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return new Response(null, { status: 404 });
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
  if (!user?.employee) return new Response(null, { status: 403 });
  if (user.employee.id === employeeId) return null;
  if (role === 'manager') {
    const target = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!target) return new Response(null, { status: 404 });
    if (target.reportsToEmployeeId === user.employee.id) {
      return null;
    }
  }
  return new Response(null, { status: 403 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const denied = await assertCanReadEmployeeReviews(session, id);
  if (denied) return denied;

  const reviews = await prisma.performanceReview.findMany({
    where: { employeeId: id },
    orderBy: { reviewedAt: 'desc' },
  });
  return Response.json(reviews);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  const { id } = await params;

  if (role !== 'owner' && role !== 'manager') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return Response.json({ error: 'Not found' }, { status: 404 });

  if (role === 'manager') {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const mgr = user.employee;
    if (employee.reportsToEmployeeId !== mgr.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const reviewedAt = parsed.data.reviewedAt ? new Date(parsed.data.reviewedAt) : new Date();

  const review = await prisma.performanceReview.create({
    data: {
      employeeId: id,
      rating: parsed.data.rating,
      notes: parsed.data.notes ?? null,
      reviewedAt,
      reviewedById: session.user.id,
    },
  });
  return Response.json(review);
}

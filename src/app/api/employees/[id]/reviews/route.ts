import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, requireOwner } from '@/lib/session';
import { z } from 'zod';

const createSchema = z.object({
  rating: z.number().int().min(1).max(5),
  notes: z.string().optional(),
  reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  if (session.user.role === 'owner') {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return new Response(null, { status: 404 });
  } else {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { employee: true } });
    if (!user?.employee || user.employee.id !== id) return new Response(null, { status: 403 });
  }

  const reviews = await prisma.performanceReview.findMany({
    where: { employeeId: id },
    orderBy: { reviewedAt: 'desc' },
  });
  return Response.json(reviews);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwner();
  const { id } = await params;

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return new Response(null, { status: 404 });

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

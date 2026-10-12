import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { z } from 'zod';

const schema = z.object({
  userId: z.string().min(1),
  enabled: z.boolean(),
});

export const GET = withApiErrors(async function GET() {
  await requireOwner();
  const users = await prisma.user.findMany({
    where: { hrKpiReviewer: true },
    select: { id: true, email: true, role: true, hrKpiReviewer: true, branchId: true },
  });
  return Response.json({ reviewers: users, payrollModules: 'frozen' });
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  await requireOwner();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });
  const updated = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { hrKpiReviewer: parsed.data.enabled },
    select: { id: true, email: true, hrKpiReviewer: true, role: true },
  });
  return Response.json({ user: updated, payrollModules: 'frozen' });
});

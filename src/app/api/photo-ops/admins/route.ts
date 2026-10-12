import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { z } from 'zod';

export const GET = withApiErrors(async function GET() {
  await requireOwner();
  const users = await prisma.user.findMany({
    where: { OR: [{ photoOpsAdmin: true }, { qcReportsInbox: true }, { hrKpiReviewer: true }] },
    select: {
      id: true,
      email: true,
      role: true,
      photoOpsAdmin: true,
      qcReportsInbox: true,
      hrKpiReviewer: true,
      employee: { select: { name: true } },
    },
  });
  return Response.json({ users });
});

const schema = z.object({
  userId: z.string(),
  photoOpsAdmin: z.boolean().optional(),
  qcReportsInbox: z.boolean().optional(),
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  await requireOwner();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'userId required' }, { status: 400 });
  const user = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: {
      ...(parsed.data.photoOpsAdmin !== undefined ? { photoOpsAdmin: parsed.data.photoOpsAdmin } : {}),
      ...(parsed.data.qcReportsInbox !== undefined ? { qcReportsInbox: parsed.data.qcReportsInbox } : {}),
    },
    select: { id: true, email: true, photoOpsAdmin: true, qcReportsInbox: true, employee: { select: { name: true } } },
  });
  return Response.json({ user });
});

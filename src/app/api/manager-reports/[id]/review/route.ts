import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role !== 'owner') {
    return Response.json({ error: 'Only owner can review manager reports' }, { status: 403 });
  }

  const { id } = await ctx.params;
  const row = await prisma.inboxNotification.findUnique({
    where: { id },
    select: { id: true, userId: true, category: true },
  });
  if (!row || row.userId !== session.user.id) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }
  if (row.category !== 'manager_time_clock_report' && row.category !== 'manager_form_report') {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }

  await prisma.inboxNotification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return Response.json({ ok: true });
}

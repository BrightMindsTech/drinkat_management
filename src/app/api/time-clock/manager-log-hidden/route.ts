import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';

type HideBody = {
  employeeId?: string;
};

export async function POST(req: Request) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role !== 'manager') {
    return Response.json({ error: 'Only managers can clear reports' }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as HideBody;
  const employeeId = (body.employeeId ?? '').trim();
  if (!employeeId) {
    return Response.json({ error: 'employeeId is required' }, { status: 400 });
  }

  await prisma.inboxNotification.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.user.id,
      category: 'time_clock_manager_hidden_employee',
      title: 'Hidden time-clock employee',
      body: employeeId,
      dataJson: JSON.stringify({ employeeId }),
      readAt: new Date(),
    },
  });

  return Response.json({ ok: true });
}

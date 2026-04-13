import { z } from 'zod';
import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { createInboxForUsers, getOwnerUserIds } from '@/lib/time-clock-helpers';

const bodySchema = z.object({
  logId: z.string().min(1),
  employeeId: z.string().min(1),
  employeeName: z.string().min(1),
  when: z.string().min(1),
  type: z.enum(['clock_in', 'clock_out', 'away_started']),
  details: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role !== 'manager') {
    return Response.json({ error: 'Only managers can report logs to owner' }, { status: 403 });
  }

  const raw = await req.json();
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const owners = await getOwnerUserIds();
  if (owners.length === 0) return Response.json({ ok: true, skipped: 'no_owners' });

  const d = parsed.data;
  await createInboxForUsers(owners, {
    category: 'manager_time_clock_report',
    title: `Manager report: ${d.type}`,
    body: `${d.employeeName} · ${d.details} · ${new Date(d.when).toLocaleString()}`,
    dataJson: JSON.stringify({
      source: 'manager_clock_page',
      logId: d.logId,
      employeeId: d.employeeId,
      employeeName: d.employeeName,
      when: d.when,
      type: d.type,
      details: d.details,
      reportedByUserId: session.user.id,
    }),
  });

  return Response.json({ ok: true });
}

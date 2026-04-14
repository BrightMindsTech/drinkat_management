import { requireSession } from '@/lib/session';
import { normalizeUserRole } from '@/lib/formVisibility';
import { prisma } from '@/lib/prisma';

type Ctx = { params: Promise<{ id: string }> };

function parseLogId(logId: string): { kind: 'clock_entry'; entryId: string } | { kind: 'away'; awayId: string } | null {
  if (logId.startsWith('in-') || logId.startsWith('out-')) {
    const entryId = logId.replace(/^(in|out)-/, '');
    if (entryId.length > 0) return { kind: 'clock_entry', entryId };
  }
  if (logId.startsWith('away-')) {
    const awayId = logId.slice('away-'.length);
    if (awayId.length > 0) return { kind: 'away', awayId };
  }
  return null;
}

/** Owner-only: full payload for a manager report (form submission or time-clock metadata). */
export async function GET(_req: Request, ctx: Ctx) {
  const session = await requireSession();
  if (normalizeUserRole(session.user.role) !== 'owner') {
    return Response.json({ error: 'Only owner can load manager report details' }, { status: 403 });
  }

  const { id } = await ctx.params;
  const row = await prisma.inboxNotification.findFirst({
    where: {
      id,
      userId: session.user.id,
      category: { in: ['manager_time_clock_report', 'manager_form_report', 'weekly_rating_submitted'] },
    },
  });
  if (!row) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }

  let data: Record<string, unknown> = {};
  try {
    data = row.dataJson ? (JSON.parse(row.dataJson) as Record<string, unknown>) : {};
  } catch {
    data = {};
  }

  if (row.category === 'weekly_rating_submitted') {
    const wid = String(data.weeklyRatingId ?? '');
    if (!wid) {
      return Response.json({ error: 'Missing rating reference' }, { status: 422 });
    }
    const wr = await prisma.weeklyRating.findUnique({
      where: { id: wid },
      include: {
        rater: { select: { id: true, name: true } },
        target: { select: { id: true, name: true } },
        branch: { select: { name: true } },
      },
    });
    if (!wr) {
      return Response.json({ error: 'Rating not found' }, { status: 404 });
    }
    return Response.json({
      kind: 'weekly_rating' as const,
      weekStartKey: wr.weekStartKey,
      score: wr.score,
      reason: wr.reason,
      rater: { id: wr.rater.id, name: wr.rater.name },
      target: { id: wr.target.id, name: wr.target.name },
      branchName: wr.branch.name,
      createdAt: wr.createdAt.toISOString(),
    });
  }

  if (row.category === 'manager_form_report') {
    const submissionId = String(data.submissionId ?? '');
    if (!submissionId) {
      return Response.json({ error: 'Missing submission reference' }, { status: 422 });
    }
    const s = await prisma.managementFormSubmission.findUnique({
      where: { id: submissionId },
      include: {
        template: true,
        employee: {
          include: {
            branch: true,
            department: true,
            reportsToEmployee: { select: { id: true, name: true } },
          },
        },
        branch: true,
      },
    });
    if (!s) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }
    return Response.json({
      kind: 'form' as const,
      submission: {
        id: s.id,
        status: s.status,
        submittedAt: s.submittedAt.toISOString(),
        rating: s.rating,
        comments: s.comments,
        answers: JSON.parse(s.answersJson) as Record<string, string>,
        template: {
          ...s.template,
          fields: JSON.parse(s.template.fieldsJson) as { key: string; label: string; type: string }[],
        },
        employee: { name: s.employee.name },
        branch: { name: s.branch.name },
        reportsToManager: s.employee.reportsToEmployee
          ? { name: s.employee.reportsToEmployee.name }
          : null,
      },
    });
  }

  const logId = String(data.logId ?? '');
  const parsed = parseLogId(logId);
  let timeClockRecord: Record<string, unknown> | null = null;

  if (parsed?.kind === 'clock_entry') {
    const ent = await prisma.timeClockEntry.findUnique({
      where: { id: parsed.entryId },
      include: {
        employee: { select: { id: true, name: true } },
        branch: { select: { name: true } },
      },
    });
    if (ent) {
      timeClockRecord = {
        type: 'time_clock_entry',
        id: ent.id,
        employee: ent.employee,
        branch: ent.branch.name,
        clockInAt: ent.clockInAt.toISOString(),
        clockOutAt: ent.clockOutAt?.toISOString() ?? null,
        clockInLat: ent.clockInLat,
        clockInLng: ent.clockInLng,
        clockOutLat: ent.clockOutLat,
        clockOutLng: ent.clockOutLng,
        clockOutReason: ent.clockOutReason,
      };
    }
  } else if (parsed?.kind === 'away') {
    const away = await prisma.awaySession.findUnique({
      where: { id: parsed.awayId },
      include: {
        employee: { select: { id: true, name: true } },
        branch: { select: { name: true } },
      },
    });
    if (away) {
      timeClockRecord = {
        type: 'away_session',
        id: away.id,
        employee: away.employee,
        branch: away.branch.name,
        kind: away.kind,
        otherNote: away.otherNote,
        startedAt: away.startedAt.toISOString(),
        endsAt: away.endsAt.toISOString(),
        status: away.status,
      };
    }
  }

  return Response.json({
    kind: 'time_clock' as const,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    data,
    timeClockRecord,
  });
}

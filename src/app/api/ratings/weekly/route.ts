import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { normalizeUserRole, type AppUserRole } from '@/lib/formVisibility';
import {
  getExpectedRatingTargetIds,
  getEligibleWeeklyRatingManagerTargets,
  getObligationWeekStartKey,
  isWeeklyRatingGateBlocking,
  isWeekendSubmissionEmphasis,
  rolesSubjectToWeeklyRating,
  assertTargetAllowedForRater,
} from '@/lib/weekly-ratings';
import { getOwnerUserIds } from '@/lib/time-clock-helpers';

const postSchema = z.object({
  targetEmployeeId: z.string().min(1),
  /** Coerce so a stringified score from the client still validates (strict z.number() would 400). */
  score: z.coerce.number().int().min(0).max(100),
  reason: z.string().optional(),
});

export async function GET() {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role === 'owner') {
    return Response.json({ error: 'Not applicable' }, { status: 403 });
  }
  if (!rolesSubjectToWeeklyRating(role)) {
    return Response.json({ error: 'Not applicable' }, { status: 403 });
  }

  const emp = await prisma.employee.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true, branchId: true },
  });
  if (!emp) {
    return Response.json({ error: 'No employee profile' }, { status: 404 });
  }

  const weekStartKey = getObligationWeekStartKey();

  if (role === 'manager') {
    const expectedIds = await getExpectedRatingTargetIds(prisma, emp.id, 'manager');
    const targets =
      expectedIds.length === 0
        ? []
        : await prisma.employee.findMany({
            where: { id: { in: expectedIds } },
            select: { id: true, name: true },
          });

    const existing = await prisma.weeklyRating.findMany({
      where: { raterEmployeeId: emp.id, weekStartKey },
      select: { targetEmployeeId: true, score: true, reason: true, updatedAt: true },
    });

    const blocking = await isWeeklyRatingGateBlocking(prisma, emp.id, 'manager');

    return Response.json({
      ratingStyle: 'required_all_targets' as const,
      weekStartKey,
      emphasisWeekend: isWeekendSubmissionEmphasis(),
      expectedTargets: targets.map((t) => ({
        id: t.id,
        name: t.name,
        existing: existing.find((e) => e.targetEmployeeId === t.id) ?? null,
      })),
      complete: expectedIds.length === 0 ? true : expectedIds.every((id) => existing.some((e) => e.targetEmployeeId === id)),
      blockingClock: blocking,
    });
  }

  const existingAll = await prisma.weeklyRating.findMany({
    where: { raterEmployeeId: emp.id, weekStartKey },
    select: { targetEmployeeId: true, score: true, reason: true, updatedAt: true },
  });
  const ratedByTarget = new Map(existingAll.map((e) => [e.targetEmployeeId, e]));

  const allManagers = await getEligibleWeeklyRatingManagerTargets(prisma, emp.id);
  const eligibleManagers = allManagers.filter((m) => !ratedByTarget.has(m.id));

  const ratedIds = [...ratedByTarget.keys()];
  const nameRows =
    ratedIds.length === 0
      ? []
      : await prisma.employee.findMany({
          where: { id: { in: ratedIds } },
          select: { id: true, name: true },
        });
  const nameById = new Map(nameRows.map((r) => [r.id, r.name]));

  const expectedTargets = ratedIds
    .sort((a, b) => (nameById.get(a) ?? '').localeCompare(nameById.get(b) ?? ''))
    .map((id) => ({
      id,
      name: nameById.get(id) ?? 'Unknown',
      existing: ratedByTarget.get(id) ?? null,
    }));

  return Response.json({
    ratingStyle: 'optional_managers' as const,
    weekStartKey,
    emphasisWeekend: isWeekendSubmissionEmphasis(),
    expectedTargets,
    eligibleManagers,
    complete: true,
    blockingClock: false,
  });
}

export async function POST(req: Request) {
  const session = await requireSession();
  const role = normalizeUserRole(session.user.role);
  if (role === 'owner' || !rolesSubjectToWeeklyRating(role)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const emp = await prisma.employee.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true, branchId: true },
  });
  if (!emp) return Response.json({ error: 'No employee profile' }, { status: 404 });

  const raw = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    return Response.json({ error: msg || 'Invalid request body' }, { status: 400 });
  }

  const { targetEmployeeId, score, reason } = parsed.data;
  if (score < 85) {
    const r = (reason ?? '').trim();
    if (r.length < 5) {
      return Response.json({ error: 'Reason required (min 5 characters) when score is below 85' }, { status: 400 });
    }
  }

  const allowed = await assertTargetAllowedForRater(prisma, emp.id, targetEmployeeId, role as AppUserRole);
  if (!allowed) return Response.json({ error: 'Invalid rating target' }, { status: 403 });

  const target = await prisma.employee.findUnique({
    where: { id: targetEmployeeId },
    select: { id: true, name: true, branchId: true },
  });
  if (!target) return Response.json({ error: 'Target not found' }, { status: 404 });

  const weekStartKey = getObligationWeekStartKey();
  const branchId = emp.branchId;

  const reasonTrimmed = score < 85 ? (reason ?? '').trim() : null;

  const ownerIds = await getOwnerUserIds();

  let rating: Awaited<ReturnType<typeof prisma.weeklyRating.upsert>>;
  try {
    // D1: Prisma’s interactive `$transaction` is not a real DB transaction; use plain
    // sequential writes so the engine doesn’t hit edge-case tx paths on Workers.
    rating = await prisma.weeklyRating.upsert({
      where: {
        raterEmployeeId_targetEmployeeId_weekStartKey: {
          raterEmployeeId: emp.id,
          targetEmployeeId,
          weekStartKey,
        },
      },
      create: {
        id: crypto.randomUUID(),
        raterEmployeeId: emp.id,
        targetEmployeeId,
        branchId,
        weekStartKey,
        score,
        reason: reasonTrimmed,
      },
      update: { score, reason: reasonTrimmed },
    });

    const payload = JSON.stringify({
      weeklyRatingId: rating.id,
      raterEmployeeId: emp.id,
      raterName: emp.name,
      targetEmployeeId: target.id,
      targetName: target.name,
      branchId,
      weekStartKey,
      score,
      reason: reasonTrimmed,
      type: 'weekly_rating_submitted',
    });

    for (const userId of [...new Set(ownerIds)]) {
      try {
        await prisma.inboxNotification.create({
          data: {
            id: crypto.randomUUID(),
            userId,
            category: 'weekly_rating_submitted',
            title: `Weekly rating: ${score}/100`,
            body: `${emp.name} rated ${target.name} (week ${weekStartKey}).`,
            dataJson: payload,
          },
        });
      } catch (inboxErr) {
        console.error('[ratings/weekly POST] inbox create failed for', userId, inboxErr);
      }
    }
  } catch (e) {
    console.error('[ratings/weekly POST]', e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2021' || e.code === 'P2022') {
        return Response.json(
          {
            error:
              'Database is missing the weekly ratings table or a column. Apply migration 0007_weekly_ratings.sql on D1 (npm run db:d1:migrate:weekly-ratings:remote) or run prisma db push locally.',
          },
          { status: 500 }
        );
      }
      return Response.json({ error: `Database error (${e.code}). ${e.message}` }, { status: 500 });
    }
    return Response.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Could not save the rating. Check server logs or apply the weekly-ratings migration.',
      },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    rating: {
      id: rating.id,
      targetEmployeeId,
      weekStartKey,
      score,
      reason: reasonTrimmed,
    },
  });
}

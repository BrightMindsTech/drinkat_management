import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireHrKpiReviewer } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { createHrNote, listHrNoteEmployees } from '@/lib/hr-notes';
import { hrNoteTone } from '@/lib/kpi-engine';

const postSchema = z.object({
  employeeId: z.string().min(1),
  score: z.number().int().min(0).max(10),
  reason: z.string().trim().min(1).max(2000),
});

export const GET = withApiErrors(async function GET() {
  await requireHrKpiReviewer();
  const [employees, notes] = await Promise.all([
    listHrNoteEmployees(prisma),
    prisma.hrNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        employee: { select: { id: true, name: true, role: true, branch: { select: { name: true } } } },
      },
    }),
  ]);
  return Response.json({
    employees: employees.map((e) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      branchName: e.branch?.name ?? '',
    })),
    notes: notes.map((n) => ({
      id: n.id,
      employeeId: n.employeeId,
      employeeName: n.employee.name,
      branchName: n.employee.branch?.name ?? '',
      score: n.score,
      tone: hrNoteTone(n.score),
      reason: n.reason,
      createdAt: n.createdAt.toISOString(),
    })),
  });
});

export const POST = withApiErrors(async function POST(req: Request) {
  const session = await requireHrKpiReviewer();
  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: 'Pick an employee, a score from 0–10, and a reason.' }, { status: 400 });
  }
  const created = await createHrNote(prisma, {
    reviewerId: session.user.id,
    employeeId: parsed.data.employeeId,
    score: parsed.data.score,
    reason: parsed.data.reason,
  });
  if (!created) return Response.json({ error: 'Employee not found.' }, { status: 404 });
  return Response.json({
    ok: true,
    id: created.note.id,
    employeeName: created.employeeName,
    score: created.note.score,
    tone: created.tone,
    kpi: created.kpi,
  });
});

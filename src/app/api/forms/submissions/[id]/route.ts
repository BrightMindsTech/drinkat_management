import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/session';
import { parseTemplateFields } from '@/lib/formTemplate';
import { canReviewManagementSubmission } from '@/lib/formVisibility';
import { z } from 'zod';

const reviewSchema = z.object({
  status: z.enum(['approved', 'denied']),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  comments: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const submission = await prisma.managementFormSubmission.findUnique({
    where: { id },
    include: { template: true },
  });
  if (!submission) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  if (!canReviewManagementSubmission(session.user.role, submission.template.category)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = await prisma.managementFormSubmission.update({
    where: { id },
    data: {
      status: parsed.data.status,
      rating: parsed.data.rating ?? null,
      comments: parsed.data.comments ?? null,
      reviewedAt: new Date(),
      reviewedById: session.user.id,
    },
    include: {
      template: true,
      employee: { include: { branch: true, department: true } },
      branch: true,
    },
  });

  let fields: unknown;
  try {
    fields = parseTemplateFields(updated.template.fieldsJson);
  } catch {
    fields = [];
  }

  return Response.json({
    ...updated,
    answers: JSON.parse(updated.answersJson) as Record<string, string>,
    template: { ...updated.template, fields },
  });
}

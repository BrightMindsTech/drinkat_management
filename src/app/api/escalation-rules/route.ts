import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';
import { withApiErrors } from '@/lib/api-route-error';
import { ISSUE_SEVERITIES } from '@/lib/qc-domains';
import { z } from 'zod';

const schema = z.object({
  severity: z.enum(ISSUE_SEVERITIES),
  slaHours: z.number().int().positive(),
  notifyRolesJson: z.string().optional(),
  active: z.boolean().optional(),
});

export const GET = withApiErrors(async function GET() {
  await requireOwner();
  const rules = await prisma.escalationRule.findMany({ orderBy: { severity: 'asc' } });
  return Response.json({
    rules,
    note: 'SLA hours are configurable. Staging defaults are unapproved and must not be treated as food-safety thresholds.',
  });
});

export const POST = withApiErrors(async function POST(req: NextRequest) {
  await requireOwner();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });
  const rule = await prisma.escalationRule.create({
    data: {
      severity: parsed.data.severity,
      slaHours: parsed.data.slaHours,
      notifyRolesJson: parsed.data.notifyRolesJson ?? '["owner","qc"]',
      active: parsed.data.active ?? true,
    },
  });
  return Response.json(rule);
});

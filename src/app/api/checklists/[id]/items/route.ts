import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireQc } from '@/lib/session';
import { z } from 'zod';

const addItemSchema = z.object({ title: z.string().min(1), sortOrder: z.number().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireQc();
  const { id: checklistId } = await params;
  const body = await req.json();
  const parsed = addItemSchema.safeParse(body);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const item = await prisma.checklistItem.create({
    data: {
      checklistId,
      title: parsed.data.title,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  return Response.json(item);
}

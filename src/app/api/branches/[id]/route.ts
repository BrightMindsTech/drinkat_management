import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireOwner } from '@/lib/session';

const patchSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  geofenceRadiusM: z.number().min(10).max(500).optional(),
  shiftProfile: z.enum(['default', 'airport']).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await ctx.params;
  const raw = await req.json();
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return Response.json(parsed.error.flatten(), { status: 400 });

  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) {
    return Response.json({ error: 'Branch not found' }, { status: 404 });
  }

  const updated = await prisma.branch.update({
    where: { id },
    data: {
      ...(parsed.data.latitude !== undefined ? { latitude: parsed.data.latitude } : {}),
      ...(parsed.data.longitude !== undefined ? { longitude: parsed.data.longitude } : {}),
      ...(parsed.data.geofenceRadiusM !== undefined ? { geofenceRadiusM: parsed.data.geofenceRadiusM } : {}),
      ...(parsed.data.shiftProfile !== undefined ? { shiftProfile: parsed.data.shiftProfile } : {}),
    },
  });

  return Response.json({
    id: updated.id,
    name: updated.name,
    latitude: updated.latitude,
    longitude: updated.longitude,
    geofenceRadiusM: updated.geofenceRadiusM,
    shiftProfile: updated.shiftProfile,
  });
}

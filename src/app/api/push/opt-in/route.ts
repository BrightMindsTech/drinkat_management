import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-route-error';

export const dynamic = 'force-dynamic';

/** Enable push for any signed-in account (owner, QC, remote staff — no time-clock visit required). */
export async function POST() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { pushConsentAt: true },
    });
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

    if (!user.pushConsentAt) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { pushConsentAt: new Date() },
      });
    }

    return Response.json({ ok: true, pushConsent: true });
  } catch (e) {
    return apiErrorResponse('push/opt-in POST', e, 'Failed to enable push');
  }
}

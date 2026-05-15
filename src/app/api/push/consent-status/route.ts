import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { apiErrorResponse } from '@/lib/api-route-error';

export const dynamic = 'force-dynamic';

/** Whether the user opted in to push (time-clock consent). Used to re-register devices on app open. */
export async function GET() {
  try {
    const session = await requireSession();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { pushConsentAt: true },
    });
    let subscriptionCount = 0;
    try {
      subscriptionCount = await prisma.pushSubscription.count({ where: { userId: session.user.id } });
    } catch (e) {
      console.error('[push/consent-status] subscription count failed', e);
    }
    return Response.json({
      pushConsent: user?.pushConsentAt != null,
      subscriptionCount,
    });
  } catch (e) {
    return apiErrorResponse('push/consent-status', e, 'Failed to load push status');
  }
}

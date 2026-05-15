import { buildTimeClockStatusPayload } from '@/lib/time-clock-status-handler';
import { requireSession } from '@/lib/session';
import { apiErrorResponse } from '@/lib/api-route-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await requireSession();
    const payload = await buildTimeClockStatusPayload(session);
    return Response.json(payload);
  } catch (e) {
    return apiErrorResponse('time-clock/status', e, 'Failed to load time clock status');
  }
}

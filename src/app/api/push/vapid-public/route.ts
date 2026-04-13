import { requireSession } from '@/lib/session';
import { getTimeClockEmployee } from '@/lib/time-clock-helpers';

export async function GET() {
  const session = await requireSession();
  const emp = await getTimeClockEmployee(session.user.id, session.user.role);
  if (!emp) {
    return Response.json({ error: 'Not applicable' }, { status: 403 });
  }
  const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!pub) {
    return Response.json({ configured: false, publicKey: null });
  }
  return Response.json({ configured: true, publicKey: pub });
}

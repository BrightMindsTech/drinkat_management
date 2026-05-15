import { requireSession } from '@/lib/session';

/** Public VAPID key for Web Push — any signed-in user (chat, HR, time clock). */
export async function GET() {
  await requireSession();
  const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!pub) {
    return Response.json({ configured: false, publicKey: null });
  }
  return Response.json({ configured: true, publicKey: pub });
}

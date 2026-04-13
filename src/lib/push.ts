import type { PushSubscription } from '@prisma/client';
import webpush from 'web-push';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

function ensureVapid() {
  const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const priv = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const contact = process.env.WEB_PUSH_CONTACT_EMAIL ?? 'mailto:support@example.com';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(contact, pub, priv);
  return true;
}

/** Web Push (browser / PWA). FCM tokens stored with provider fcm — optional legacy send. */
export async function sendPushToSubscription(sub: PushSubscription, payload: PushPayload): Promise<boolean> {
  if (sub.provider === 'web' && sub.keysJson) {
    if (!ensureVapid()) return false;
    try {
      const keys = JSON.parse(sub.keysJson) as { auth: string; p256dh: string };
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys,
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          data: payload.data ?? {},
        }),
        { TTL: 3600 }
      );
      return true;
    } catch {
      return false;
    }
  }

  if (sub.provider === 'fcm' && sub.endpoint.startsWith('fcm:')) {
    const token = sub.endpoint.slice(4);
    const legacyKey = process.env.FCM_LEGACY_SERVER_KEY;
    if (!legacyKey) return false;
    try {
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${legacyKey}`,
        },
        body: JSON.stringify({
          to: token,
          priority: 'high',
          notification: { title: payload.title, body: payload.body },
          data: payload.data ?? {},
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  return false;
}

export async function sendPushToUser(userId: string, subs: PushSubscription[], payload: PushPayload) {
  for (const s of subs) {
    await sendPushToSubscription(s, payload);
  }
}

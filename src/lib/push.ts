import type { PushSubscription } from '@prisma/client';
import { importPKCS8, SignJWT } from 'jose';
import webpush from 'web-push';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

function normalizeApnsDeviceToken(token: string): string {
  return token.replace(/\s/g, '');
}

async function sendApnsAlert(deviceToken: string, payload: PushPayload): Promise<boolean> {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const rawKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const bundleId = process.env.APNS_BUNDLE_ID ?? 'com.bmtechs.drinkat';
  const useSandbox = process.env.APNS_USE_SANDBOX === '1' || process.env.APNS_USE_SANDBOX === 'true';
  if (!keyId || !teamId || !rawKey) return false;

  let jwt: string;
  try {
    const key = await importPKCS8(rawKey, 'ES256');
    jwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setIssuedAt()
      .setExpirationTime('20m')
      .sign(key);
  } catch {
    return false;
  }

  const primaryHost = useSandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
  const fallbackHost = useSandbox ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';
  const tok = normalizeApnsDeviceToken(deviceToken);
  const body: Record<string, unknown> = {
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: 'default',
    },
  };
  if (payload.data) {
    for (const [k, v] of Object.entries(payload.data)) {
      if (k !== 'aps') body[k] = v;
    }
  }

  const sendToHost = async (host: string) => {
    const res = await fetch(`https://${host}/3/device/${tok}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  };

  try {
    if (await sendToHost(primaryHost)) return true;
  } catch {
    // Continue to fallback host below.
  }
  try {
    return await sendToHost(fallbackHost);
  } catch {
    return false;
  }
}

function ensureVapid() {
  const pub = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  const priv = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const contact = process.env.WEB_PUSH_CONTACT_EMAIL ?? 'mailto:support@example.com';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(contact, pub, priv);
  return true;
}

/** Web Push (browser / PWA), legacy FCM, and native iOS (APNs token in `apns:` endpoint). */
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

  if (sub.provider === 'apns' && sub.endpoint.startsWith('apns:')) {
    const deviceToken = sub.endpoint.slice(5);
    if (deviceToken.length < 10) return false;
    return sendApnsAlert(deviceToken, payload);
  }

  return false;
}

export async function sendPushToUser(userId: string, subs: PushSubscription[], payload: PushPayload) {
  for (const s of subs) {
    await sendPushToSubscription(s, payload);
  }
}

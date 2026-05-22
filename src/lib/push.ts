import type { PushSubscription } from '@prisma/client';
import webpush from 'web-push';
import { enrichPushData } from '@/lib/push-navigation';

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

function normalizeApnsDeviceToken(token: string): string {
  return token.replace(/\s/g, '');
}

function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function parsePemPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  const bin = Buffer.from(b64, 'base64');
  return bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
}

/** Convert DER-encoded ECDSA signature into JOSE (R || S) form for ES256 JWTs. */
function derEcdsaToJose(derSig: Uint8Array, size = 32): Uint8Array {
  // Some runtimes already return raw JOSE-style (R || S) signatures.
  if (derSig.length === size * 2 && derSig[0] !== 0x30) {
    return derSig;
  }
  let offset = 0;
  if (derSig[offset++] !== 0x30) throw new Error('Invalid DER signature');
  const seqLenByte = derSig[offset++];
  if (seqLenByte & 0x80) offset += seqLenByte & 0x7f;
  if (derSig[offset++] !== 0x02) throw new Error('Invalid DER signature R');
  let rLen = derSig[offset++];
  while (rLen > 0 && derSig[offset] === 0) {
    offset += 1;
    rLen -= 1;
  }
  const r = derSig.slice(offset, offset + rLen);
  offset += rLen;
  if (derSig[offset++] !== 0x02) throw new Error('Invalid DER signature S');
  let sLen = derSig[offset++];
  while (sLen > 0 && derSig[offset] === 0) {
    offset += 1;
    sLen -= 1;
  }
  const s = derSig.slice(offset, offset + sLen);

  const out = new Uint8Array(size * 2);
  out.set(r.slice(Math.max(0, r.length - size)), size - Math.min(size, r.length));
  out.set(s.slice(Math.max(0, s.length - size)), size + (size - Math.min(size, s.length)));
  return out;
}

async function makeApnsJwt(keyId: string, teamId: string, pem: string): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: teamId,
      iat: Math.floor(Date.now() / 1000),
    })
  );
  const signingInput = `${header}.${payload}`;

  const keyData = parsePemPkcs8(pem);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const derSigBuf = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );
  const joseSig = derEcdsaToJose(new Uint8Array(derSigBuf), 32);
  return `${signingInput}.${base64UrlEncode(joseSig)}`;
}

const APNS_EXPIRED_REASONS = new Set([
  'BadDeviceToken',
  'Unregistered',
  'ExpiredToken',
  'DeviceTokenNotForTopic',
  'InvalidProviderToken',
]);

function apnsFailureIsExpired(status: number, reasonRaw: string): boolean {
  if (status === 410) return true;
  if (status !== 400) return false;
  const trimmed = reasonRaw.trim();
  if (!trimmed) return false;
  if (APNS_EXPIRED_REASONS.has(trimmed)) return true;
  try {
    const parsed = JSON.parse(trimmed) as { reason?: string };
    if (parsed.reason && APNS_EXPIRED_REASONS.has(parsed.reason)) return true;
  } catch {
    /* plain-text reason */
  }
  return false;
}

async function sendApnsAlert(deviceToken: string, payload: PushPayload): Promise<PushDeliveryResult> {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const rawKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const bundleId = process.env.APNS_BUNDLE_ID ?? 'com.bmtechs.drinkat';
  const useSandbox = process.env.APNS_USE_SANDBOX === '1' || process.env.APNS_USE_SANDBOX === 'true';
  if (!keyId || !teamId || !rawKey) return 'failed';

  let jwt: string;
  try {
    jwt = await makeApnsJwt(keyId, teamId, rawKey);
  } catch (e) {
    console.error('[push/apns] jwt generation failed', {
      bundleId,
      keyIdPresent: Boolean(keyId),
      teamIdPresent: Boolean(teamId),
      privateKeyLength: rawKey.length,
      error: e instanceof Error ? e.message : String(e),
    });
    return 'failed';
  }

  const primaryHost = useSandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
  const fallbackHost = useSandbox ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';
  const tok = normalizeApnsDeviceToken(deviceToken);
  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  const body: Record<string, unknown> = {
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: 'default',
      'content-available': 1,
    },
  };
  if (payload.data) {
    for (const [k, v] of Object.entries(payload.data)) {
      if (k !== 'aps') body[k] = v;
    }
  }

  const sendToHost = async (host: string): Promise<PushDeliveryResult> => {
    const res = await fetch(`https://${host}/3/device/${tok}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-expiration': String(expiresAt),
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (res.ok) return 'ok';
    const reasonBody = await res.text().catch(() => '');
    const reasonHeader = res.headers.get('apns-reason') ?? '';
    const reason = reasonHeader || reasonBody;
    const expired = apnsFailureIsExpired(res.status, reason);
    console.error('[push/apns] delivery failed', {
      host,
      status: res.status,
      bundleId,
      expired,
      reason: reason.slice(0, 200),
    });
    return expired ? 'expired' : 'failed';
  };

  try {
    const primary = await sendToHost(primaryHost);
    if (primary === 'ok') return 'ok';
    if (primary === 'expired') return 'expired';
  } catch (e) {
    console.error('[push/apns] primary host request failed', {
      host: primaryHost,
      bundleId,
      error: e instanceof Error ? e.message : String(e),
    });
  }
  try {
    return await sendToHost(fallbackHost);
  } catch (e) {
    console.error('[push/apns] fallback host request failed', {
      host: fallbackHost,
      bundleId,
      error: e instanceof Error ? e.message : String(e),
    });
    return 'failed';
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

export type PushDeliveryResult = 'ok' | 'failed' | 'expired';

/** Web Push (browser / PWA), legacy FCM, and native iOS (APNs token in `apns:` endpoint). */
export async function sendPushToSubscription(
  sub: PushSubscription,
  payload: PushPayload
): Promise<PushDeliveryResult> {
  const enriched: PushPayload = {
    ...payload,
    data: enrichPushData(payload.data),
  };

  if (sub.provider === 'web' && sub.keysJson) {
    if (!ensureVapid()) return 'failed';
    try {
      const keys = JSON.parse(sub.keysJson) as { auth: string; p256dh: string };
      const topic =
        enriched.data?.type?.slice(0, 32) ??
        enriched.title.slice(0, 32).replace(/\s+/g, '_');
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys,
        },
        JSON.stringify({
          title: enriched.title,
          body: enriched.body,
          data: enriched.data ?? {},
        }),
        {
          TTL: 300,
          urgency: 'high',
          topic,
        }
      );
      return 'ok';
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) return 'expired';
      return 'failed';
    }
  }

  if (sub.provider === 'fcm' && sub.endpoint.startsWith('fcm:')) {
    const token = sub.endpoint.slice(4);
    const legacyKey = process.env.FCM_LEGACY_SERVER_KEY;
    if (!legacyKey) return 'failed';
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
          notification: { title: enriched.title, body: enriched.body },
          data: enriched.data ?? {},
        }),
      });
      if (res.status === 404 || res.status === 410) return 'expired';
      return res.ok ? 'ok' : 'failed';
    } catch {
      return 'failed';
    }
  }

  if (sub.provider === 'apns' && sub.endpoint.startsWith('apns:')) {
    const deviceToken = sub.endpoint.slice(5);
    if (deviceToken.length < 10) return 'failed';
    return sendApnsAlert(deviceToken, enriched);
  }

  return 'failed';
}

export type PushUserSendResult = {
  delivered: number;
  expiredRemoved: number;
};

/** @returns delivery count and how many stale subscription rows were deleted */
export async function sendPushToUser(
  userId: string,
  subs: PushSubscription[],
  payload: PushPayload
): Promise<PushUserSendResult> {
  let delivered = 0;
  const expiredIds: string[] = [];
  for (const s of subs) {
    const result = await sendPushToSubscription(s, payload);
    if (result === 'ok') delivered += 1;
    else if (result === 'expired') expiredIds.push(s.id);
  }
  if (expiredIds.length > 0) {
    const { prisma } = await import('@/lib/prisma');
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } });
    console.log('[push] removed expired subscriptions', { userId, count: expiredIds.length });
  }
  return { delivered, expiredRemoved: expiredIds.length };
}

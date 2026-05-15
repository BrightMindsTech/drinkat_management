/** Convert VAPID base64url key to Uint8Array for PushManager.subscribe */
export function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registerWebSubscriptionOnServer(sub: PushSubscription): Promise<boolean> {
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.auth || !j.keys?.p256dh) return false;
  const res = await fetch('/api/push/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      provider: 'web',
      endpoint: j.endpoint,
      keys: { auth: j.keys.auth, p256dh: j.keys.p256dh },
    }),
  });
  return res.ok;
}

/** Re-sync browser subscription to server (fixes “sometimes” push after DB loss / new login). */
export async function syncWebPushSubscriptionToBackend(sub: PushSubscription): Promise<boolean> {
  return registerWebSubscriptionOnServer(sub);
}

export async function subscribeWebPush(publicKey: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
  const ok = await registerWebSubscriptionOnServer(sub);
  if (!ok) return null;
  return sub;
}

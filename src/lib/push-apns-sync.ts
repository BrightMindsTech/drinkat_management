/** Sync / verify APNs device token with the backend (no native plugin imports). */

export async function syncApnsDeviceTokenToBackend(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/push/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ provider: 'apns', token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** True when this exact device token is saved for the signed-in user. */
export async function isApnsDeviceTokenOnServer(token: string): Promise<boolean> {
  try {
    const res = await fetch('/api/push/device-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { registered?: boolean };
    return data.registered === true;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** After APNs register(), poll for token in cache and server (event may arrive late). */
export async function waitForApnsRegistration(maxMs = 15000): Promise<boolean> {
  const { getCachedApnsDeviceToken } = await import('@/lib/push-apns-cache');
  const steps = Math.ceil(maxMs / 500);
  for (let i = 0; i < steps; i++) {
    const token = getCachedApnsDeviceToken();
    if (token) {
      if (await isApnsDeviceTokenOnServer(token)) return true;
      if (await syncApnsDeviceTokenToBackend(token)) return true;
    }
    await sleep(500);
  }
  return false;
}

const DEVICE_ID_KEY = 'drinkat.trustedDeviceId';
const TOKEN_KEY = 'drinkat.trustedDeviceToken';

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getOrCreateTrustedDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}

export async function registerThisTrustedDevice(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const deviceId = getOrCreateTrustedDeviceId();
    const token = localStorage.getItem(TOKEN_KEY) || '';
    const res = await fetch('/api/trusted-device', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        deviceId,
        token,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 180) : '',
      }),
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { token?: string };
    if (json.token) localStorage.setItem(TOKEN_KEY, json.token);
    return true;
  } catch {
    return false;
  }
}

export async function resumeTrustedDeviceSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!deviceId || !token) return false;
    const res = await fetch('/api/trusted-device/resume', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ deviceId, token }),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) localStorage.removeItem(TOKEN_KEY);
      return false;
    }
    const json = (await res.json()) as { token?: string };
    if (json.token) localStorage.setItem(TOKEN_KEY, json.token);
    return true;
  } catch {
    return false;
  }
}

export async function revokeThisTrustedDevice(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const deviceId = localStorage.getItem(DEVICE_ID_KEY);
    await fetch('/api/trusted-device', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ deviceId }),
    });
  } catch {
    /* still drop the local token */
  }
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

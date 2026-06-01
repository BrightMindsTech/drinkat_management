export const APNS_DEVICE_TOKEN_KEY = 'drinkat-apns-device-token';

export function getCachedApnsDeviceToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(APNS_DEVICE_TOKEN_KEY);
}

export function setCachedApnsDeviceToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(APNS_DEVICE_TOKEN_KEY, token);
}

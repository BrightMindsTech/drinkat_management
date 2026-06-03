import type { Locale } from '@/contexts/LanguageContext';

/** BCP 47 tags: en-US and ar-JO use 12-hour time in Intl by default with hour12: true. */
export function localeToBcp47(locale: Locale): string {
  return locale === 'ar' ? 'ar-JO' : 'en-US';
}

function parseDate(value: Date | string | number): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const APP_DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

export const APP_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

export const APP_DATE_TIME_WITH_SECONDS: Intl.DateTimeFormatOptions = {
  ...APP_DATE_TIME_FORMAT,
  second: '2-digit',
};

export function formatAppDateTime(value: Date | string | number, locale: Locale = 'en'): string {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleString(localeToBcp47(locale), APP_DATE_TIME_FORMAT);
}

export function formatAppTime(value: Date | string | number, locale: Locale = 'en'): string {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleTimeString(localeToBcp47(locale), APP_TIME_FORMAT);
}

export function formatAppDate(
  value: Date | string | number,
  locale: Locale = 'en',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  const d = parseDate(value);
  if (!d) return '—';
  return d.toLocaleDateString(localeToBcp47(locale), options);
}

/** Live clock / timezone-aware display (time clock screen). */
export function formatAppDateTimeInTimeZone(
  value: Date,
  timeZone: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = APP_DATE_TIME_WITH_SECONDS
): string {
  return new Intl.DateTimeFormat(localeToBcp47(locale), { ...options, timeZone }).format(value);
}

/** Checklist deadline stored as H:mm / HH:mm (24h internally). */
export function formatAppClockTimeLabel(hhmm: string, locale: Locale = 'en'): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return formatAppTime(d, locale);
}

/** Employee shift range stored as "09:00 - 17:00" or "09:00–17:00" (24h internally). */
export function formatAppShiftTimeRange(value: string, locale: Locale = 'en'): string {
  const parts = value.split(/\s*[-–]\s*/);
  if (parts.length < 2) return value;
  const from = formatAppClockTimeLabel(parts[0].trim(), locale);
  const until = formatAppClockTimeLabel(parts[1].trim(), locale);
  return `${from} – ${until}`;
}

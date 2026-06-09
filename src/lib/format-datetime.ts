import type { Locale } from '@/contexts/LanguageContext';

/** Drinkat branches are in Jordan — fixed offset avoids UTC (Workers) vs local (browser) hydration mismatches. */
const AMMAN_OFFSET_MS = 3 * 60 * 60 * 1000;

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const MONTHS_EN_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;
const WEEKDAYS_EN_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const MONTHS_AR = [
  'كانون الثاني',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين الأول',
  'تشرين الثاني',
  'كانون الأول',
] as const;
const MONTHS_AR_LONG = MONTHS_AR;
const WEEKDAYS_AR_SHORT = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'] as const;

/** BCP 47 tags — kept for any legacy Intl call sites. */
export function localeToBcp47(locale: Locale): string {
  return locale === 'ar' ? 'ar-JO' : 'en-US';
}

function parseDate(value: Date | string | number): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Calendar parts in Jordan (UTC+3, no DST). Identical on Cloudflare Workers and browsers. */
export function ammanCalendarDayKey(d: Date): string {
  const p = ammanDateParts(d);
  return `${p.year}-${pad2(p.month + 1)}-${pad2(p.day)}`;
}

export function isSameAmmanCalendarDay(a: Date | string | number, b: Date | string | number): boolean {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) return false;
  return ammanCalendarDayKey(da) === ammanCalendarDayKey(db);
}

export function ammanDateParts(d: Date): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  weekday: number;
} {
  const shifted = new Date(d.getTime() + AMMAN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
    weekday: shifted.getUTCDay(),
  };
}

function format12h(hours24: number, minutes: number, locale: Locale): string {
  const h12 = hours24 % 12 || 12;
  const ampm = hours24 >= 12 ? (locale === 'ar' ? 'م' : 'PM') : locale === 'ar' ? 'ص' : 'AM';
  return `${h12}:${pad2(minutes)} ${ampm}`;
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
  const p = ammanDateParts(d);
  const months = locale === 'ar' ? MONTHS_AR : MONTHS_EN;
  return `${months[p.month]} ${p.day}, ${p.year}, ${format12h(p.hours, p.minutes, locale)}`;
}

export function formatAppTime(value: Date | string | number, locale: Locale = 'en'): string {
  const d = parseDate(value);
  if (!d) return '—';
  const p = ammanDateParts(d);
  return format12h(p.hours, p.minutes, locale);
}

export function formatAppDate(
  value: Date | string | number,
  locale: Locale = 'en',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string {
  const d = parseDate(value);
  if (!d) return '—';
  const p = ammanDateParts(d);
  const longMonth = options.month === 'long';
  const months = locale === 'ar' ? MONTHS_AR_LONG : longMonth ? MONTHS_EN_LONG : MONTHS_EN;
  const showDay = options.day !== undefined || options.weekday === undefined;
  const showYear = options.year !== undefined;

  if (options.weekday === 'short' && showDay && showYear) {
    const weekdays = locale === 'ar' ? WEEKDAYS_AR_SHORT : WEEKDAYS_EN_SHORT;
    return `${weekdays[p.weekday]}, ${months[p.month]} ${p.day}, ${p.year}`;
  }
  if (!showDay && showYear && longMonth) {
    return `${months[p.month]} ${p.year}`;
  }
  if (showDay && showYear) {
    return `${months[p.month]} ${p.day}, ${p.year}`;
  }
  if (showDay) {
    return `${months[p.month]} ${p.day}`;
  }
  return `${months[p.month]} ${p.year}`;
}

/** `YYYY-MM` payroll / archive month headers. */
export function formatAppMonthYear(monthKey: string, locale: Locale = 'en'): string {
  return formatAppDate(`${monthKey}-01`, locale, { month: 'long', year: 'numeric', day: undefined });
}

/** Today chip — still call only after client mount when using `new Date()`. */
export function formatAppTodayShort(locale: Locale = 'en'): string {
  return formatAppDate(new Date(), locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

/** Live clock / timezone-aware display. */
export function formatAppDateTimeInTimeZone(
  value: Date,
  timeZone: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = APP_DATE_TIME_WITH_SECONDS
): string {
  if (timeZone === 'Asia/Amman') {
    const withSeconds = options.second !== undefined;
    const d = parseDate(value);
    if (!d) return '—';
    const p = ammanDateParts(d);
    const months = locale === 'ar' ? MONTHS_AR : MONTHS_EN;
    const base = `${months[p.month]} ${p.day}, ${p.year}, ${format12h(p.hours, p.minutes, locale)}`;
    return withSeconds ? `${base}:${pad2(p.seconds)}` : base;
  }
  return new Intl.DateTimeFormat(localeToBcp47(locale), { ...options, timeZone }).format(value);
}

/** Checklist deadline stored as H:mm / HH:mm (24h internally). */
export function formatAppClockTimeLabel(hhmm: string, locale: Locale = 'en'): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return hhmm;
  return format12h(hours, minutes, locale);
}

/** Employee shift range stored as "09:00 - 17:00" or "09:00–17:00" (24h internally). */
export function formatAppShiftTimeRange(value: string, locale: Locale = 'en'): string {
  const parts = value.split(/\s*[-–]\s*/);
  if (parts.length < 2) return value;
  const from = formatAppClockTimeLabel(parts[0].trim(), locale);
  const until = formatAppClockTimeLabel(parts[1].trim(), locale);
  return `${from} – ${until}`;
}

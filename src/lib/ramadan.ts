import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';

/**
 * Whether the instant `now` falls in Ramadan in `timeZone`, using the Islamic Umm al-Qura calendar
 * (matches common civil Hijri usage in Jordan / Gulf). Month 9 = Ramadan.
 *
 * If `RAMADAN_CALENDAR=force` env is set, always treats as Ramadan (skip overnight rules that use this).
 * If detection throws, returns true (assume Ramadan) so auto overnight clock-out is skipped — safer than
 * mass clock-out when the calendar API is unavailable. Set `RAMADAN_CALENDAR=off` to disable detection.
 */
export function isRamadanUmmAlQura(now: Date, timeZone: string = DEFAULT_APP_TIMEZONE): boolean {
  if (process.env.RAMADAN_CALENDAR === 'force') return true;
  if (process.env.RAMADAN_CALENDAR === 'off') return false;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      calendar: 'islamic-umalqura',
      month: 'numeric',
    }).formatToParts(now);

    const raw = parts.find((p) => p.type === 'month')?.value;
    if (raw == null) {
      console.warn('[ramadan] missing Hijri month; treating as Ramadan (skip auto 4am clock-out)');
      return true;
    }
    const month = parseInt(raw, 10);
    if (Number.isNaN(month)) {
      console.warn('[ramadan] invalid Hijri month; treating as Ramadan (skip auto 4am clock-out)');
      return true;
    }
    return month === 9;
  } catch (e) {
    console.warn('[ramadan] islamic-umalqura unavailable; treating as Ramadan (skip auto 4am clock-out)', e);
    return true;
  }
}

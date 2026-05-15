import { formatInTimeZone } from 'date-fns-tz';
import { DEFAULT_APP_TIMEZONE } from '@/lib/shifts';

/** YYYY-MM salary period for an advance (deduction month), in app timezone. */
export function periodMonthFromDate(date: Date, timeZone = DEFAULT_APP_TIMEZONE): string {
  return formatInTimeZone(date, timeZone, 'yyyy-MM');
}

export function currentAdvancePeriodMonth(now = new Date(), timeZone = DEFAULT_APP_TIMEZONE): string {
  return periodMonthFromDate(now, timeZone);
}

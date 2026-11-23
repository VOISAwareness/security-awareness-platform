/**
 * campaignSchedule: the checks on new dates for a campaign being resumed
 * from hold or reinvoked (the same rules campaigns-api applies). The values
 * are the date & time picker's "YYYY-MM-DDTHH:mm" strings, UK time. Pure.
 */
import { isAfter, parseDateTimeValue } from './calendarDates.js';
import { toDate } from '../shared/dateTime.js';

/**
 * What is wrong with a new schedule, or '' when it is fine.
 * `requireEnd` is false only for a campaign that auto-ends after sending.
 */
export function scheduleProblem({ startTime, endTime } = {}, { requireEnd = true, now = new Date() } = {}) {
  if (!parseDateTimeValue(startTime)) return 'Choose a new start date and time.';
  if (toDate(startTime) <= now) return 'The new start must be in the future.';
  if (!endTime) return requireEnd ? 'Choose a new end date and time.' : '';
  if (!parseDateTimeValue(endTime)) return 'Choose a new end date and time.';
  if (!isAfter(endTime, startTime)) return 'The end must be after the start.';
  return '';
}

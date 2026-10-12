import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDateTimeValue,
  toDateTimeValue,
  dateToValue,
  monthGrid,
  addMonths,
  isBeforeDay,
  to12h,
  to24h,
  minuteOptions,
  defaultTimeFor,
  formatDateTimeLabel,
  isAfter,
} from './calendarDates.js';

test('parses the datetime-local format and rejects anything else', () => {
  assert.deepEqual(parseDateTimeValue('2026-10-12T09:05'), { year: 2026, month: 9, day: 12, hours: 9, minutes: 5 });
  assert.equal(parseDateTimeValue(''), null);
  assert.equal(parseDateTimeValue('12/10/2026 09:05'), null);
  assert.equal(parseDateTimeValue('2026-02-30T10:00'), null);
  assert.equal(parseDateTimeValue('2026-10-12T24:00'), null);
});

test('value round-trips, padded', () => {
  const v = { year: 2026, month: 0, day: 3, hours: 7, minutes: 4 };
  assert.equal(toDateTimeValue(v), '2026-01-03T07:04');
  assert.deepEqual(parseDateTimeValue(toDateTimeValue(v)), v);
  assert.equal(dateToValue(new Date(2026, 11, 31, 23, 59)), '2026-12-31T23:59');
});

test('month grid: six Sunday-first weeks with the month in place', () => {
  const grid = monthGrid(2026, 9); // October 2026 starts on a Thursday
  assert.equal(grid.length, 42);
  assert.deepEqual(grid[0], { year: 2026, month: 8, day: 27, inMonth: false });
  assert.deepEqual(grid[4], { year: 2026, month: 9, day: 1, inMonth: true });
  assert.equal(grid.filter((c) => c.inMonth).length, 31);
});

test('addMonths crosses years', () => {
  assert.deepEqual(addMonths({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 });
  assert.deepEqual(addMonths({ year: 2026, month: 0 }, -1), { year: 2025, month: 11 });
});

test('isBeforeDay compares whole days and ignores a missing minimum', () => {
  const min = '2026-10-12T15:30';
  assert.equal(isBeforeDay({ year: 2026, month: 9, day: 11 }, min), true);
  assert.equal(isBeforeDay({ year: 2026, month: 9, day: 12 }, min), false);
  assert.equal(isBeforeDay({ year: 2025, month: 11, day: 31 }, ''), false);
});

test('12h <-> 24h', () => {
  assert.deepEqual(to12h(0), { hour: 12, meridiem: 'AM' });
  assert.deepEqual(to12h(12), { hour: 12, meridiem: 'PM' });
  assert.deepEqual(to12h(23), { hour: 11, meridiem: 'PM' });
  assert.equal(to24h(12, 'AM'), 0);
  assert.equal(to24h(12, 'PM'), 12);
  assert.equal(to24h(3, 'PM'), 15);
});

test('minute options keep an off-grid saved minute', () => {
  assert.equal(minuteOptions(10).length, 12);
  const withSeven = minuteOptions(7);
  assert.equal(withSeven.length, 13);
  assert.deepEqual(withSeven.slice(0, 4), [0, 5, 7, 10]);
});

test('a picked day defaults to 9 AM, or the next 5-minute mark once 9 AM has passed', () => {
  const day = { year: 2026, month: 9, day: 12 };
  assert.deepEqual(defaultTimeFor(day, new Date(2026, 9, 11, 18, 0)), { hours: 9, minutes: 0 });
  assert.deepEqual(defaultTimeFor(day, new Date(2026, 9, 12, 14, 2)), { hours: 14, minutes: 5 });
  assert.deepEqual(defaultTimeFor(day, new Date(2026, 9, 12, 14, 5)), { hours: 14, minutes: 10 });
  assert.deepEqual(defaultTimeFor(day, new Date(2026, 9, 12, 23, 58)), { hours: 23, minutes: 55 });
});

test('label reads like a person would say it', () => {
  assert.equal(formatDateTimeLabel('2026-10-12T09:05'), 'Mon, 12 Oct 2026 · 9:05 AM');
  assert.equal(formatDateTimeLabel('2026-10-12T00:30'), 'Mon, 12 Oct 2026 · 12:30 AM');
  assert.equal(formatDateTimeLabel(''), '');
});

test('isAfter: end strictly after start, missing values pass', () => {
  assert.equal(isAfter('2026-10-12T10:00', '2026-10-12T09:00'), true);
  assert.equal(isAfter('2026-10-12T09:00', '2026-10-12T09:00'), false);
  assert.equal(isAfter('2026-10-11T23:00', '2026-10-12T09:00'), false);
  assert.equal(isAfter('', '2026-10-12T09:00'), true);
});

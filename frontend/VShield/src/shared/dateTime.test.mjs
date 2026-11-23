import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_TIME_ZONE, formatDate, formatDateTime, formatDayDateTime, formatShortDate, formatTime,
  nowInAppZone, toDate, wallClockOf, zoneLabel, zonedTimeToUtc,
} from './dateTime.js';

test('UK time, BST in summer and GMT in winter', () => {
  assert.equal(APP_TIME_ZONE, 'Europe/London');
  assert.equal(zoneLabel('2026-07-01T12:00:00Z'), 'BST');
  assert.equal(zoneLabel('2026-11-20T12:00:00Z'), 'GMT');
  assert.equal(formatTime('2026-07-01T12:00:00Z'), '1:00 PM BST');
  assert.equal(formatTime('2026-11-20T12:00:00Z'), '12:00 PM GMT');
});

test('formats', () => {
  const t = '2026-11-20T09:05:00Z';
  assert.equal(formatDate(t), '20 Nov 2026');
  assert.equal(formatShortDate(t), '20-Nov-26');
  assert.equal(formatDateTime(t), '20 Nov 2026, 9:05 AM GMT');
  assert.equal(formatDayDateTime(t), 'Fri, 20 Nov 2026 · 9:05 AM GMT');
  assert.equal(formatDateTime('2026-06-01T23:30:00Z'), '2 Jun 2026, 12:30 AM BST', 'the UK day, not the UTC one');
});

test('ISO with a zone is read as given', () => {
  assert.equal(toDate('2026-07-01T14:30:00+05:30').toISOString(), '2026-07-01T09:00:00.000Z');
  assert.equal(toDate('2026-07-01T14:30:00.000Z').toISOString(), '2026-07-01T14:30:00.000Z');
});

test('the older "MM/DD/YYYY hh:mm AM" form is UK time too', () => {
  assert.equal(toDate('08/10/2026 09:00 AM').toISOString(), '2026-08-10T08:00:00.000Z');
  assert.equal(toDate('12/01/2026 12:30 AM').toISOString(), '2026-12-01T00:30:00.000Z');
  assert.equal(formatShortDate('10/05/2026'), '5-Oct-26');
  assert.equal(toDate('13/01/2026 10:00 AM'), null);
});

test('a stored wall-clock string is UK time', () => {
  assert.equal(toDate('2026-07-01T14:30').toISOString(), '2026-07-01T13:30:00.000Z');
  assert.equal(toDate('2026-12-01T14:30').toISOString(), '2026-12-01T14:30:00.000Z');
  assert.equal(formatDateTime('2026-07-01T14:30'), '1 Jul 2026, 2:30 PM BST');
  assert.equal(formatDate('2026-07-01'), '1 Jul 2026');
});

test('zonedTimeToUtc round-trips, also around the clock changes', () => {
  for (const iso of ['2026-03-29T00:30:00Z', '2026-03-29T01:30:00Z', '2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z', '2026-01-15T10:00:00Z']) {
    const w = wallClockOf(new Date(iso));
    const back = zonedTimeToUtc(w);
    assert.deepEqual(wallClockOf(back), w, iso);
  }
});

test('unreadable values format as empty', () => {
  for (const v of [null, undefined, '', 'soon', NaN, new Date('x'), '2026-13-01T10:00']) {
    assert.equal(formatDateTime(v), '');
    assert.equal(formatDate(v), '');
  }
});

test('nowInAppZone reads UK wall clock through local fields', () => {
  const n = nowInAppZone(new Date('2026-07-01T23:30:00Z'));
  assert.deepEqual([n.getFullYear(), n.getMonth(), n.getDate(), n.getHours(), n.getMinutes()], [2026, 6, 2, 0, 30]);
});

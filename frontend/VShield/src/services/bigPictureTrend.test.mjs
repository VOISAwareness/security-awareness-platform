import assert from 'node:assert/strict';
import test from 'node:test';

import { DAY, RANGES, STEADY, progress, trend } from './bigPictureTrend.js';

const END = Date.UTC(2026, 9, 6);

test('trend: works back from today through the dated changes', () => {
  // two people with 300 points between them today; +80 ten days ago, -30 two days ago
  const t = trend({ total: 300, n: 2, end: END, ledger: [{ at: END - 2 * DAY, points: -30 }, { at: END - 10 * DAY, points: 80 }] }, { days: 30, step: 1 });
  assert.equal(t.series.length, 31);
  assert.equal(t.series[0].at, END - 30 * DAY);
  assert.equal(t.series.at(-1).at, END);
  assert.equal(t.from, (300 - 50) / 2, 'before both changes');
  assert.equal(t.series.find((p) => p.at === END - 5 * DAY).avg, (300 + 30) / 2, 'after the report, before the click');
  assert.equal(t.to, 150);
  assert.equal(t.change, 25);
  assert.equal(t.word, 'improving');
});

test('trend: the verdict has a steady band either side of zero', () => {
  const at = (points) => trend({ total: 1000, n: 10, end: END, ledger: [{ at: END - DAY, points }] }, { days: 30, step: 1 }).word;
  assert.equal(at(STEADY * 10), 'improving');
  assert.equal(at(STEADY * 10 - 1), 'steady');
  assert.equal(at(-(STEADY * 10 - 1)), 'steady');
  assert.equal(at(-STEADY * 10), 'slipping');
  assert.equal(at(0), 'steady');
});

test('trend: weekly steps end on today, and changes outside the range only shift the level', () => {
  const six = RANGES.find((r) => r.id === '6m');
  const t = trend({ total: 500, n: 5, end: END, ledger: [{ at: END - 300 * DAY, points: 400 }] }, six);
  assert.equal(t.series.at(-1).at, END);
  assert.ok(t.series.every((p, i, a) => !i || p.at > a[i - 1].at));
  assert.equal(t.change, 0, 'a change before the range does not move it');
});

test('progress: six months for the organisation, the campaign itself for one campaign', () => {
  const history = { total: 1000, n: 10, end: END, ledger: [{ at: END - 100 * DAY, points: 200 }, { at: END - 400 * DAY, points: 900 }] };
  assert.deepEqual(progress({ history }), { word: 'improving', change: 20 }, 'only the last six months count');
  const people = [{ change: 80 }, { change: -30 }, { change: -60 }, { change: 0 }];
  assert.deepEqual(progress({ people, history }, { campaign: true }), { word: 'steady', change: -2.5 });
  assert.equal(progress({ people: [{ change: -30 }], history }, { campaign: true }).word, 'slipping');
});

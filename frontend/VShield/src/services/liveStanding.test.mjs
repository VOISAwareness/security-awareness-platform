/** Tests for mapping GET /standing onto the standing the screens use. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { LIVE_LEVELS, standingFromApi } from './liveStanding.js';

const data = {
  email: 'Ana@Example.test',
  known: true,
  points: 160,
  levelId: 'L2G1',
  nextLevelId: 'L2G2',
  toNext: 40,
  pct: 20,
  bestLevelId: 'L2G2',
  history: [
    { rule: 'Compromised', delta: -50, campaignId: 'CMP-4', campaignName: '', at: '2026-10-09T09:00:00Z' },
    { rule: 'Reported', delta: 80, campaignId: 'CMP-1', campaignName: 'Payroll Update Notice', at: '2026-10-01T09:00:00Z' },
  ],
};

test('off unless switched on', () => {
  assert.equal(LIVE_LEVELS, false);
});

test('maps points, level, progress, best and history', () => {
  const s = standingFromApi(data, { name: 'Ana', department: 'Sales', rank: 7, total: 120 });
  assert.equal(s.email, 'ana@example.test');
  assert.equal(s.points, 160);
  assert.equal(s.level.id, 'L2G1');
  assert.equal(s.progress.next.id, 'L2G2');
  assert.equal(s.progress.toNext, 40);
  assert.equal(s.best.id, 'L2G2');
  assert.deepEqual([s.name, s.department, s.rank, s.total, s.known], ['Ana', 'Sales', 7, 120, true]);
  assert.deepEqual(
    s.history.map((h) => [h.event, h.what, h.where, h.points]),
    [
      ['Compromised', 'Entered details on a fake page', 'CMP-4', -50],
      ['Reported', 'Reported a phishing email', 'Payroll Update Notice', 80],
    ],
  );
});

test('the level comes from the points, and best is never below it', () => {
  const s = standingFromApi({ ...data, points: 760, levelId: 'L1G1', bestLevelId: 'L2G2' });
  assert.equal(s.level.id, 'L4G1');
  assert.equal(s.best.id, 'L4G1');
});

test('a new person, and answers without points', () => {
  const s = standingFromApi({ email: 'new@x.test', known: false, points: 0, history: [] });
  assert.deepEqual([s.level.id, s.best.id, s.history.length, s.known, s.rank], ['L1G1', 'L1G1', 0, false, null]);
  assert.equal(standingFromApi(null), null);
  assert.equal(standingFromApi({ points: 'abc' }), null);
});

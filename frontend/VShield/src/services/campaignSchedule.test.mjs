import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleProblem } from './campaignSchedule.js';

const now = new Date('2026-11-23T09:00:00Z'); // 9:00 AM GMT

test('a start in the future and an end after it is fine', () => {
  assert.equal(scheduleProblem({ startTime: '2026-11-24T09:00', endTime: '2026-11-30T09:00' }, { now }), '');
});

test('the start is needed and must be in the future (UK time)', () => {
  assert.match(scheduleProblem({ endTime: '2026-11-30T09:00' }, { now }), /start/);
  assert.match(scheduleProblem({ startTime: '2026-11-23T08:59', endTime: '2026-11-30T09:00' }, { now }), /future/);
  assert.equal(scheduleProblem({ startTime: '2026-11-23T09:05', endTime: '2026-11-30T09:00' }, { now }), '');
});

test('the end must be after the start, and is needed unless the campaign auto-ends', () => {
  assert.match(scheduleProblem({ startTime: '2026-11-24T09:00', endTime: '2026-11-24T08:00' }, { now }), /after/);
  assert.match(scheduleProblem({ startTime: '2026-11-24T09:00' }, { now }), /end/);
  assert.equal(scheduleProblem({ startTime: '2026-11-24T09:00' }, { now, requireEnd: false }), '');
});

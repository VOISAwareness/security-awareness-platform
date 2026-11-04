import assert from 'node:assert/strict';
import test from 'node:test';

import { listUsageCounts, timesUsed } from './listUsage.js';

const campaigns = [
  { selectedListId: 'ul-two', status: 'SENT' },
  { selectedListId: 'ul-one', status: 'SENT' },
  { selectedListId: 'ul-one', status: 'SENDING' },
  { selectedListId: 'ul-one', status: 'DRAFT' },
  { selectedListId: 'ul-one', status: 'PENDING_APPROVAL' },
  { selectedListId: 'ul-one', status: 'APPROVED' },
  { selectedListId: 'ul-one', status: 'REJECTED' },
  { selectedListId: 'ul-one', status: 'SEND_FAILED' },
  { status: 'SENT' }, // a test campaign to email IDs added one by one
  null,
];

test('a list is used once per campaign sent to it', () => {
  assert.deepEqual(listUsageCounts(campaigns), { 'ul-two': 1, 'ul-one': 2 });
  assert.deepEqual(listUsageCounts(undefined), {});
});

test('the figure comes from the campaigns once loaded, else from the list', () => {
  const counts = listUsageCounts(campaigns);
  assert.equal(timesUsed({ id: 'ul-two', usedCount: 0 }, counts), 1);
  assert.equal(timesUsed({ id: 'ul-001', usedCount: 4 }, counts), 0); // sample number replaced
  assert.equal(timesUsed({ id: 'ul-001', usedCount: 4 }, null), 4);
  assert.equal(timesUsed({ id: 'x', NumberofTimesUsed: 2 }, null), 2);
});

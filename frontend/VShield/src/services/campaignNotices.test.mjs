import assert from 'node:assert/strict';
import test from 'node:test';

import { NOTICE_KIND, noticeText, noticesFor } from './campaignNotices.js';

const rows = [
  { campaignId: 'C1', campaignTitle: 'Payroll', status: 'REJECTED', changesRequested: true, createdBy: 'Sarah@Vodafone.com', rejectedBy: 'mgr@vodafone.com', rejectionComments: ' Fix the subject ', rejectedAt: '2026-11-04T10:00:00Z', wizardStep: 3 },
  { campaignId: 'C2', campaignTitle: 'Gift card', status: 'REJECTED', changesRequested: false, createdBy: 'sarah@vodafone.com', rejectionComments: 'Off brand', rejectedAt: '2026-11-04T12:00:00Z' },
  { campaignId: 'C3', status: 'REJECTED', changesRequested: true, createdBy: 'someone@vodafone.com', rejectedAt: '2026-11-04T13:00:00Z' },
  { campaignId: 'C4', status: 'PENDING_APPROVAL', createdBy: 'sarah@vodafone.com' },
  { campaignId: 'C5', status: 'REJECTED', changesRequested: true, submittedBy: 'sarah@vodafone.com', updatedAt: '2026-11-01T09:00:00Z' },
];

test("a creator sees their own sent-back and rejected campaigns, newest first", () => {
  const got = noticesFor(rows, 'sarah@vodafone.com');
  assert.deepEqual(got.map((n) => [n.campaignId, n.kind]), [
    ['C2', NOTICE_KIND.REJECTED],
    ['C1', NOTICE_KIND.CHANGES],
    ['C5', NOTICE_KIND.CHANGES],
  ]);
  assert.equal(got[1].message, 'Fix the subject');
  assert.equal(got[1].by, 'mgr@vodafone.com');
  assert.equal(got[1].wizardStep, 3);
});

test('sent back again is a new notice', () => {
  const first = noticesFor(rows, 'sarah@vodafone.com').find((n) => n.campaignId === 'C1').key;
  const again = noticesFor([{ ...rows[0], rejectedAt: '2026-11-05T08:00:00Z' }], 'sarah@vodafone.com')[0].key;
  assert.notEqual(first, again);
});

test('no actor, no notices; each kind reads as it should', () => {
  assert.deepEqual(noticesFor(rows, ''), []);
  assert.deepEqual(noticesFor(null, 'sarah@vodafone.com'), []);
  assert.equal(noticeText({ kind: NOTICE_KIND.CHANGES }).action, 'Open draft');
  assert.equal(noticeText({ kind: NOTICE_KIND.REJECTED }).headline, 'Rejected');
});

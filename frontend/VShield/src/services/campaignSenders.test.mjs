import assert from 'node:assert/strict';
import test from 'node:test';

import { noVerifiedSender, senderChoices } from './campaignSenders.js';

const rows = [
  { email: 'payroll@vodafone.com', verificationStatus: 'Pending' },
  { email: 'it.alerts@vodafone.com', verificationStatus: 'Verified' },
  { email: 'Spirit_VOIS@domain', verificationStatus: 'Not verified' },
  { email: 'old@vodafone.com', verificationStatus: 'Failed' },
  { email: 'IT.Alerts@vodafone.com', verificationStatus: 'Verified' }, // same address, other case
];

test('only verified addresses can be chosen; the rest are listed with why', () => {
  const c = senderChoices(rows);
  assert.deepEqual(c.map((x) => [x.email, x.selectable]), [
    ['it.alerts@vodafone.com', true],
    ['old@vodafone.com', false],
    ['payroll@vodafone.com', false],
    ['Spirit_VOIS@domain', false],
  ]);
  assert.equal(c[2].label, 'payroll@vodafone.com (verification pending)');
  assert.ok(!noVerifiedSender(c));
});

test('an API from before SES verification: every address can be chosen', () => {
  const c = senderChoices([{ email: 'a@x.com', status: 'Active' }, { email: 'b@x.com' }]);
  assert.ok(c.every((x) => x.selectable));
});

test('a saved sender not on the list is kept at the top', () => {
  const c = senderChoices(rows, 'legacy@vodafone.com');
  assert.deepEqual([c[0].email, c[0].selectable], ['legacy@vodafone.com', true]);
  assert.match(c[0].label, /not on Email IDs/);
  assert.equal(senderChoices(rows, 'IT.ALERTS@vodafone.com').length, 4);
});

test('nothing verified yet is noticed', () => {
  assert.ok(noVerifiedSender(senderChoices([{ email: 'a@x.com', verificationStatus: 'Pending' }], 'z@x.com')));
  assert.ok(noVerifiedSender(senderChoices([])));
});

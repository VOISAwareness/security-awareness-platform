import assert from 'node:assert/strict';
import test from 'node:test';

import { addedTime, noVerifiedSender, senderChoices, sortByAdded } from './campaignSenders.js';

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

test('addedTime reads both date spellings', () => {
  assert.equal(addedTime('17th July 2026'), Date.parse('17 July 2026'));
  assert.equal(addedTime('27 Nov 2026'), Date.parse('27 Nov 2026'));
  assert.ok(Number.isNaN(addedTime('')));
});

test('sortByAdded orders by added date, pickable ones first, undated last', () => {
  const c = senderChoices([
    { email: 'old@x.com', verificationStatus: 'Verified', createdDate: '1st Jan 2026' },
    { email: 'new@x.com', verificationStatus: 'Verified', createdDate: '27 Nov 2026' },
    { email: 'nodate@x.com', verificationStatus: 'Verified' },
    { email: 'pending@x.com', verificationStatus: 'Pending', createdDate: '30 Nov 2026' },
  ]);
  assert.deepEqual(sortByAdded(c, 'newest').map((x) => x.email), ['new@x.com', 'old@x.com', 'nodate@x.com', 'pending@x.com']);
  assert.deepEqual(sortByAdded(c, 'oldest').map((x) => x.email), ['old@x.com', 'new@x.com', 'nodate@x.com', 'pending@x.com']);
  assert.equal(sortByAdded(c, null), c);
});

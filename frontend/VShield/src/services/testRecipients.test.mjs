import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_TEST_RECIPIENTS,
  addTestRecipient,
  isTestCampaign,
  removeTestRecipient,
  testRecipientEmails,
  usesTestRecipients,
} from './testRecipients.js';

test('isTestCampaign reads the tick', () => {
  assert.equal(isTestCampaign({ isTestCampaign: true }), true);
  assert.equal(isTestCampaign({ isTestCampaign: 'true' }), true);
  assert.equal(isTestCampaign({ isTestCampaign: false }), false);
  assert.equal(isTestCampaign({ isTestCampaign: 'false' }), false);
  assert.equal(isTestCampaign({}), false);
  assert.equal(isTestCampaign(null), false);
});

test('testRecipientEmails: trimmed, blanks and repeats dropped', () => {
  assert.deepEqual(testRecipientEmails({ testRecipientEmails: [' a@x.io ', '', 'A@X.io', 'b@x.io', null] }), ['a@x.io', 'b@x.io']);
  assert.deepEqual(testRecipientEmails({ testRecipientEmails: 'a@x.io' }), []);
  assert.deepEqual(testRecipientEmails(null), []);
});

test('addTestRecipient adds one valid, new email ID', () => {
  assert.deepEqual(addTestRecipient([], ' me@example.com '), { list: ['me@example.com'], error: '' });
  assert.deepEqual(addTestRecipient(['me@example.com'], 'two@example.com').list, ['me@example.com', 'two@example.com']);
});

test('addTestRecipient refuses blanks, bad addresses, repeats and more than the cap', () => {
  const one = ['me@example.com'];
  assert.match(addTestRecipient(one, '  ').error, /Type an email ID/);
  assert.match(addTestRecipient(one, 'not-an-email').error, /not a valid email ID/);
  assert.match(addTestRecipient(one, 'me@example').error, /not a valid email ID/);
  assert.match(addTestRecipient(one, 'ME@example.com').error, /already added/);
  const full = Array.from({ length: MAX_TEST_RECIPIENTS }, (_, i) => `u${i}@example.com`);
  const res = addTestRecipient(full, 'one-more@example.com');
  assert.match(res.error, new RegExp(`at most ${MAX_TEST_RECIPIENTS}`));
  assert.equal(res.list, full);
  // The list is never changed in place.
  assert.deepEqual(one, ['me@example.com']);
});

test('removeTestRecipient removes it in any case', () => {
  assert.deepEqual(removeTestRecipient(['a@x.io', 'b@x.io'], 'A@X.IO'), ['b@x.io']);
  assert.deepEqual(removeTestRecipient(null, 'a@x.io'), []);
});

test('usesTestRecipients: a test campaign with its own email IDs field', () => {
  assert.equal(usesTestRecipients({ isTestCampaign: true, testRecipientEmails: [] }), true);
  assert.equal(usesTestRecipients({ isTestCampaign: true, testRecipientEmails: ['a@x.io'] }), true);
  // Saved before the field existed: keeps its recipient list.
  assert.equal(usesTestRecipients({ isTestCampaign: true, selectedListId: 'UL-1' }), false);
  assert.equal(usesTestRecipients({ isTestCampaign: false, testRecipientEmails: ['a@x.io'] }), false);
});

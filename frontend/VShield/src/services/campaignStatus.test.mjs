/**
 * Tests for the shared campaign vocabulary.
 *
 * Uses Node's built-in test runner (`node --test`) so the frontend gains
 * coverage of its one piece of load-bearing pure logic without pulling in a
 * test framework. Run with `npm test` from frontend/VShield.
 *
 * Why this module and not others: three different field vocabularies coexist in
 * the campaigns table, and every campaign screen depends on normalizeCampaign
 * reconciling them. A silent regression here shows up as blank titles and wrong
 * statuses across the whole app.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  STATUS,
  campaignLabel,
  derivePhase,
  isEditable,
  normalizeCampaign,
  parseDate,
  statusMeta,
} from './campaignStatus.js';

const DAY = 24 * 60 * 60 * 1000;
const future = () => new Date(Date.now() + 7 * DAY).toISOString();
const past = () => new Date(Date.now() - 7 * DAY).toISOString();

test('normalizeCampaign maps the original send-POC vocabulary', () => {
  const c = normalizeCampaign({
    campaignId: 'CMP-POC-001',
    status: 'SENT',
    campaignName: 'Security Awareness POC Campaign',
    subject: 'Security Awareness Notification',
  });
  assert.equal(c.campaignTitle, 'Security Awareness POC Campaign');
  assert.equal(c.emailSubject, 'Security Awareness Notification');
});

test('normalizeCampaign maps the bundled PascalCase vocabulary', () => {
  const c = normalizeCampaign({
    campaignId: 'CAMP-001',
    CampaignTitle: 'Q2 SSO Sim',
    EmailSubject: 'password expired',
    SenderEmailID: 'no-reply@example',
    RecipientDetails: { UserListID: 'ul-001' },
  });
  assert.equal(c.campaignTitle, 'Q2 SSO Sim');
  assert.equal(c.senderEmailId, 'no-reply@example');
  assert.equal(c.selectedListId, 'ul-001');
});

test('a lifecycle phase never becomes a workflow status', () => {
  // The bundled data stored Completed/Live/Upcoming in `campaignStatus`. Those
  // are phases, not pipeline states, and must not be mistaken for one.
  const c = normalizeCampaign({ campaignId: 'X', campaignStatus: 'Completed' });
  assert.equal(c.status, STATUS.DRAFT);
});

test('a real workflow status is preserved', () => {
  const c = normalizeCampaign({ campaignId: 'X', status: 'PENDING_APPROVAL' });
  assert.equal(c.status, 'PENDING_APPROVAL');
});

test('derivePhase only applies once a campaign can actually run', () => {
  assert.equal(derivePhase({ status: 'DRAFT', startTime: future() }), null);
  assert.equal(derivePhase({ status: 'PENDING_APPROVAL', startTime: past() }), null);
  assert.equal(derivePhase({ status: 'APPROVED', startTime: future() }), 'Upcoming');
  assert.equal(derivePhase({ status: 'SENT', startTime: past(), endTime: future() }), 'Live');
  assert.equal(derivePhase({ status: 'SENT', startTime: past(), endTime: past() }), 'Completed');
  // Sent but undated: finished is the honest reading, not "live".
  assert.equal(derivePhase({ status: 'SENT' }), 'Completed');
});

test('parseDate handles all three date shapes in play', () => {
  assert.ok(parseDate('2026-10-01T09:00:00Z') instanceof Date); // API ISO
  assert.ok(parseDate('2026-10-01T09:00') instanceof Date); // datetime-local
  assert.equal(parseDate('08/10/2026 09:00 AM').getHours(), 9); // bundled data
  assert.equal(parseDate('08/10/2026 12:00 PM').getHours(), 12);
  assert.equal(parseDate('08/10/2026 12:00 AM').getHours(), 0);
});

test('parseDate returns null rather than an Invalid Date', () => {
  assert.equal(parseDate('not a date'), null);
  assert.equal(parseDate(''), null);
  assert.equal(parseDate(null), null);
  assert.equal(parseDate(undefined), null);
});

test('campaignLabel always yields something printable', () => {
  assert.equal(campaignLabel({ campaignTitle: 'T', emailSubject: 'S' }), 'T');
  assert.equal(campaignLabel({ emailSubject: 'S' }), 'S');
  assert.equal(campaignLabel({ campaignId: 'X' }), 'Untitled campaign (X)');
});

test('editability mirrors the backend', () => {
  assert.equal(isEditable('DRAFT'), true);
  assert.equal(isEditable('REJECTED'), true);
  assert.equal(isEditable('PENDING_APPROVAL'), false);
  assert.equal(isEditable('SENT'), false);
});

test('unknown values degrade safely', () => {
  assert.equal(normalizeCampaign(null), null);
  assert.equal(statusMeta('WAT').label, 'WAT');
  assert.equal(statusMeta(undefined).label, 'Unknown');
});

test('individually targeted campaigns still say who receives them', () => {
  const c = normalizeCampaign({
    campaignId: 'CAMP-003',
    recipientDetails: { EmailIDsListed: ['a@x.com', 'b@x.com', 'c@x.com'] },
  });
  assert.equal(c.recipientEmails.length, 3);
  assert.equal(c.selectedListName, '3 individually selected recipients');
  assert.equal(c.recipientCount, 3);
});

test('a saved list is never overwritten by the individual-recipient fallback', () => {
  const c = normalizeCampaign({
    campaignId: 'X',
    selectedListId: 'ul-002',
    selectedListName: 'Batch 02',
    recipientCount: 58,
    recipientDetails: { EmailIDsListed: ['a@x.com'] },
  });
  assert.equal(c.selectedListName, 'Batch 02');
  assert.equal(c.recipientCount, 58);
});

test('singular wording for a single recipient', () => {
  const c = normalizeCampaign({
    campaignId: 'X',
    RecipientDetails: { EmailIDsListed: ['solo@x.com'] },
  });
  assert.equal(c.selectedListName, '1 individually selected recipient');
});

test('no recipients at all leaves the fields alone', () => {
  const c = normalizeCampaign({ campaignId: 'X' });
  assert.deepEqual(c.recipientEmails, []);
  assert.equal(c.selectedListName, '');
});

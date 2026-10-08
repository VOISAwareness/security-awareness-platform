/**
 * Tests for the design adapter and the POC identity helper.
 *
 * The Campaigns and Requests & Approvals screens filter purely on the derived
 * display status, so a wrong mapping here hides campaigns from the approver
 * queue or shows them in the wrong tab.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { DESIGN_STATUS, designStatus, toDesignCampaign } from './campaignDesign.js';
import { normalizeCampaign } from './campaignStatus.js';
import { actorFor } from './identity.js';

const NOW = new Date('2026-10-08T12:00:00Z');
const make = (fields) => normalizeCampaign({ campaignId: 'CMP-1', ...fields });

test('pending requests split into Pending and Expired on start time', () => {
  const future = make({ status: 'PENDING_APPROVAL', startTime: '2026-10-09T09:00:00Z' });
  const past = make({ status: 'PENDING_APPROVAL', startTime: '2026-10-07T09:00:00Z' });
  const undated = make({ status: 'PENDING_APPROVAL' });
  assert.equal(designStatus(future, NOW), DESIGN_STATUS.PENDING);
  assert.equal(designStatus(past, NOW), DESIGN_STATUS.EXPIRED);
  assert.equal(designStatus(undated, NOW), DESIGN_STATUS.PENDING);
});

test('reject with notification shows as Notified, plain reject as Rejected', () => {
  assert.equal(
    designStatus(make({ status: 'REJECTED', changesRequested: true }), NOW),
    DESIGN_STATUS.NOTIFIED
  );
  assert.equal(designStatus(make({ status: 'REJECTED' }), NOW), DESIGN_STATUS.REJECTED);
});

test('every running state is Published; drafts and failures keep their own tabs', () => {
  for (const status of ['APPROVED', 'SENDING', 'SENT']) {
    assert.equal(designStatus(make({ status }), NOW), DESIGN_STATUS.PUBLISHED);
  }
  assert.equal(designStatus(make({ status: 'DRAFT' }), NOW), DESIGN_STATUS.DRAFTED);
  assert.equal(designStatus(make({ status: 'FAILED' }), NOW), DESIGN_STATUS.FAILED);
});

test('toDesignCampaign exposes the fields the screens read', () => {
  const row = toDesignCampaign(
    make({
      status: 'REJECTED',
      changesRequested: true,
      campaignTitle: 'Q4 phishing drill',
      createdBy: 'sarah@x.com',
      rejectedBy: 'manager@x.com',
      rejectionComments: 'Please fix the sender name',
      selectedListName: 'Finance DL',
      startTime: '2026-10-09T09:00',
      isTestCampaign: true,
    }),
    NOW
  );
  assert.equal(row.CampaignStatus, 'Notified');
  assert.equal(row.CampaignTitle, 'Q4 phishing drill');
  assert.equal(row.CreatedBy, 'sarah@x.com');
  assert.equal(row.NotifiedBy, 'manager@x.com');
  assert.equal(row.NotificationMessage, 'Please fix the sender name');
  assert.equal(row.UserList, 'Finance DL');
  assert.equal(row.StartTime, '2026-10-09T09:00');
  assert.equal(row.TestCampaign, 'Yes');
  assert.equal(row.campaignId, 'CMP-1');
});

test('an approved resubmission does not show its old rejection note', () => {
  const row = toDesignCampaign(
    make({
      status: 'APPROVED',
      rejectedBy: 'manager@x.com',
      rejectionComments: 'Old: fix the sender',
      approvedBy: 'lead@x.com',
      approvalComments: 'Looks good now',
    }),
    NOW
  );
  assert.equal(row['Approved/RejectedBy'], 'lead@x.com');
  assert.equal(row.NotificationMessage, 'Looks good now');
});

test('an untargeted campaign says so instead of a fake audience', () => {
  const row = toDesignCampaign(make({ status: 'PENDING_APPROVAL' }), NOW);
  assert.equal(row.UserList, 'No recipients selected');
});

test('actorFor prefers the lower-cased profile email, then the role', () => {
  assert.equal(actorFor({ role: 'Admin', UserEMailID: 'Aarav.Sharma@X.com' }), 'aarav.sharma@x.com');
  assert.equal(actorFor({ role: 'Admin' }), 'Admin');
  assert.equal(actorFor(null), 'wizard-user');
});

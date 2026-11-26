import assert from 'node:assert/strict';
import { test } from 'node:test';

import { announcementTemplatesLive, draftFromRollout, fromRollout, updateRollout, historyTime, loadAnnouncementData, publishTemplate, saveRollout, splitUserLists, updateTemplate, userListsLive } from './announcements.js';

const client = (calls = []) => ({
  calls,
  announcements: {
    list: async (kind) => (calls.push(['list', kind]), [{ announcementId: 'ANC-001', announcementScenarioId: 'ANC-001' }]),
    create: async (fields) => (calls.push(['create', fields]), { ...fields, announcementId: fields.kind === 'TEMPLATE' ? 'ANC-007' : 'ANR-001' }),
    update: async (id, fields) => (calls.push(['update', id, fields]), { announcementId: id, announcementScenarioId: id, ...fields }),
  },
  userLists: { list: async () => [
    { userListId: 'UL-1', name: 'Finance', listType: 'SAVED', totalUsers: 40 },
    { userListId: 'dl-x', dlName: 'All India', listType: 'SYNCED', totalUsers: 300 },
  ] },
});

test('loadAnnouncementData fills both live objects in the sample files\' shapes', async () => {
  await loadAnnouncementData({ client: client() });
  assert.deepEqual(announcementTemplatesLive.announcement.map((t) => t.announcementId), ['ANC-001']);
  assert.equal(userListsLive.savedUserLists[0].id, 'UL-1');
  assert.equal(userListsLive.syncedDistributionLists[0].dlId, 'dl-x');
});

test('publishTemplate saves the form as a TEMPLATE and adds it to the gallery', async () => {
  const c = client();
  await loadAnnouncementData({ client: c });
  const row = await publishTemplate({ announcementScenarioName: 'New', stats: { sent: 1 }, campaignId: 'CAMP-1' }, { actor: 'a@x', client: c });
  const [, sent] = c.calls.find((x) => x[0] === 'create');
  assert.deepEqual(sent, { announcementScenarioName: 'New', kind: 'TEMPLATE', actor: 'a@x' });
  assert.equal(row.announcementId, 'ANC-007');
  assert.equal(announcementTemplatesLive.announcement[0].announcementId, 'ANC-007');
});

test('updateTemplate changes the template in place, never its id or kind', async () => {
  const c = client();
  await loadAnnouncementData({ client: c });
  await updateTemplate('ANC-001', { announcementScenarioId: 'ANC-999', announcementId: 'X', kind: 'ROLLOUT', announcementScenarioName: 'Renamed', status: 'SENT' }, { actor: 'a@x', client: c });
  const [, id, sent] = c.calls.find((x) => x[0] === 'update');
  assert.equal(id, 'ANC-001');
  assert.deepEqual(sent, { announcementScenarioName: 'Renamed', actor: 'a@x' });
  assert.equal(announcementTemplatesLive.announcement.length, 1);
  assert.equal(announcementTemplatesLive.announcement[0].announcementScenarioName, 'Renamed');
});

test('saveRollout keeps the list by id and name, never its members', async () => {
  const c = client();
  await saveRollout({ announcementCampaignTitle: 'Q4', loadedData: { users: [{ email: 'x' }] } }, 'request',
    { id: 'UL-1', name: 'Finance', totalUsers: 40, users: [{ email: 'x' }] }, { actor: 'a@x', client: c });
  const [, sent] = c.calls[0];
  assert.deepEqual(sent, { announcementCampaignTitle: 'Q4', kind: 'ROLLOUT', submit: 'request', actor: 'a@x',
    selectedListId: 'UL-1', selectedListName: 'Finance', recipientCount: 40 });
});

test('splitUserLists', () => {
  assert.deepEqual(splitUserLists(null), { savedUserLists: [], syncedDistributionLists: [] });
});

test('historyTime writes the History page\'s local "MM/DD/YYYY hh:mm AM"', () => {
  assert.equal(historyTime('2026-10-12T09:05'), '10/12/2026 09:05 AM');
  assert.equal(historyTime('2026-10-12T00:30'), '10/12/2026 12:30 AM');
  assert.equal(historyTime('2026-10-12T17:00'), '10/12/2026 05:00 PM');
  assert.equal(historyTime(''), '');
  assert.equal(historyTime('not a date'), '');
});

test('fromRollout maps a roll-out to the History page\'s fields', () => {
  const row = fromRollout({
    announcementId: 'ANR-004', status: 'APPROVED', announcementCampaignTitle: 'VPN change', announcementScenarioId: 'ANC-002',
    announcementStartTime: '2026-10-12T09:00', autoEndPostSending: true, createdBy: 'Ana <ana@x>', approvedBy: 'ana@x',
    selectedListName: 'Finance', announcementEmailSubject: 'Heads up',
  });
  assert.equal(row.AnnouncementStatus, 'Published');
  assert.equal(row.AnnouncementTitle, 'VPN change');
  assert.equal(row.AnnouncementTemplateID, 'ANC-002');
  assert.equal(row.AnnouncementStartTime, '10/12/2026 09:00 AM');
  assert.equal(row.AnnouncementEndTime, '10/12/2026 09:00 AM'); // ends when sent
  assert.equal(row.AnnouncementReasonForCancel, 'NA');
  assert.equal(row.AnnouncementUserListID, 'Finance');
  assert.equal(row.AnnouncementCreatedBy, 'Ana');
  assert.equal(row['AnnouncementApproved/RejectedBy'], 'ana@x');
  assert.equal(fromRollout({ announcementId: 'ANR-5', status: 'PENDING_APPROVAL' }).AnnouncementStatus, 'Pending');
});

test('fromRollout can give people as addresses, and carries the decision comments', () => {
  const row = fromRollout({ announcementId: 'ANR-6', status: 'REJECTED', createdBy: 'Ana Rao <Ana@X.example>', rejectedBy: 'ben@x.example', decisionComments: 'Wrong list' }, { emails: true });
  assert.equal(row.AnnouncementStatus, 'Rejected');
  assert.equal(row.AnnouncementCreatedBy, 'ana@x.example');
  assert.equal(row['AnnouncementApproved/RejectedBy'], 'ben@x.example');
  assert.equal(row.AnnouncementNotificationMessage, 'Wrong list');
});

test('a rejected roll-out becomes a draft and is saved back in place', async () => {
  const row = { announcementId: 'ANR-3', kind: 'ROLLOUT', status: 'REJECTED', createdBy: 'a@x', rejectedBy: 'b@x', decisionComments: 'Fix it',
    expiresAt: 9, announcementCampaignTitle: 'T', selectedListId: 'UL-1', selectedListName: 'Finance', recipientCount: 40 };
  const draft = draftFromRollout(row);
  assert.deepEqual(draft, { announcementCampaignTitle: 'T', selectedListId: 'UL-1', selectedListName: 'Finance', recipientCount: 40, editingRolloutId: 'ANR-3' });
  const c = client();
  await updateRollout('ANR-3', { ...draft, announcementCampaignTitle: 'T2', loadedData: { members: ['x'] }, status: 'APPROVED' }, null, { actor: 'a@x', client: c });
  const [, id, sent] = c.calls.find((x) => x[0] === 'update');
  assert.equal(id, 'ANR-3');
  assert.deepEqual(sent, { announcementCampaignTitle: 'T2', selectedListId: 'UL-1', selectedListName: 'Finance', recipientCount: 40, actor: 'a@x' });
});

test('a cancelled roll-out reads as Cancelled, with its reason', () => {
  const row = fromRollout({ announcementId: 'ANR-7', status: 'CANCELLED', cancelReason: 'Wrong week', cancelledBy: 'ben@x' });
  assert.equal(row.AnnouncementStatus, 'Cancelled');
  assert.equal(row.AnnouncementReasonForCancel, 'Wrong week');
  assert.equal(fromRollout({ announcementId: 'ANR-8', status: 'APPROVED' }).AnnouncementReasonForCancel, 'NA');
});

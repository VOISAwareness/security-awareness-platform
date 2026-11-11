import assert from 'node:assert/strict';
import { test } from 'node:test';

import { announcementTemplatesLive, loadAnnouncementData, publishTemplate, saveRollout, splitUserLists, userListsLive } from './announcements.js';

const client = (calls = []) => ({
  calls,
  announcements: {
    list: async (kind) => (calls.push(['list', kind]), [{ announcementId: 'ANC-001', announcementScenarioId: 'ANC-001' }]),
    create: async (fields) => (calls.push(['create', fields]), { ...fields, announcementId: fields.kind === 'TEMPLATE' ? 'ANC-007' : 'ANR-001' }),
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

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { forgetCampaignEmails, loadCampaignEmail } from './campaignEmail.js';

const client = (rows, calls = []) => ({
  calls,
  campaigns: {
    get: async (id) => {
      calls.push(id);
      if (!(id in rows)) throw new Error('No campaign with that id');
      return rows[id];
    },
  },
});

test('a campaign\'s email is read once, then from the cache', async () => {
  const store = new Map();
  const c = client({ 'CMP-1': { campaignId: 'CMP-1', emailBody: '<p>Hi</p>' } });
  assert.equal(await loadCampaignEmail('CMP-1', { client: c, store }), '<p>Hi</p>');
  assert.equal(await loadCampaignEmail('CMP-1', { client: c, store }), '<p>Hi</p>');
  assert.deepEqual(c.calls, ['CMP-1']);
});

test('older field names, no body and no id', async () => {
  const store = new Map();
  const c = client({ 'CMP-2': { EmailBody: '<b>Old</b>' }, 'CMP-3': {} });
  assert.equal(await loadCampaignEmail('CMP-2', { client: c, store }), '<b>Old</b>');
  assert.equal(await loadCampaignEmail('CMP-3', { client: c, store }), '');
  assert.equal(await loadCampaignEmail('', { client: c, store }), '');
  assert.deepEqual(c.calls, ['CMP-2', 'CMP-3']);
});

test('a failed read is tried again next time; forget clears the cache', async () => {
  const store = new Map();
  const rows = {};
  const c = client(rows);
  await assert.rejects(loadCampaignEmail('CMP-4', { client: c, store }));
  rows['CMP-4'] = { emailBody: '<p>Now</p>' };
  assert.equal(await loadCampaignEmail('CMP-4', { client: c, store }), '<p>Now</p>');
  forgetCampaignEmails(store);
  assert.equal(store.size, 0);
});

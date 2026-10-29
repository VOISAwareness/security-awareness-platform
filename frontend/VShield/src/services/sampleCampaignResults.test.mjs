import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleCampaignResults } from './sampleCampaignResults.js';

const people = Array.from({ length: 60 }, (_, i) => ({
  UserEMailID: `Person${i}@example.com`,
  Country: ['UK', 'Spain', 'India'][i % 3],
  Department: ['Finance', 'Legal'][i % 2],
}));

test('the same campaign gives the same results every time', () => {
  assert.deepEqual(sampleCampaignResults('CMP-101', people), sampleCampaignResults('CMP-101', people));
  assert.notDeepEqual(sampleCampaignResults('CMP-101', people), sampleCampaignResults('CMP-102', people));
});

test('each recipient appears once, from the people directory', () => {
  const rows = sampleCampaignResults('CMP-7', people);
  assert.ok(rows.length >= 12 && rows.length <= 40);
  assert.equal(new Set(rows.map((r) => r.email)).size, rows.length);
  assert.ok(rows.every((r) => r.email.endsWith('@example.com') && r.email === r.email.toLowerCase()));
});

test('outcomes follow the funnel: open, then click or report, then give data or train', () => {
  for (const id of ['A', 'B', 'C', 'D', 'E']) {
    for (const r of sampleCampaignResults(id, people)) {
      if (r.trapped || r.reported) assert.ok(r.opened);
      if (r.compromised || r.trained) assert.ok(r.trapped);
      assert.ok(!(r.trapped && r.reported));
    }
  }
});

test('fewer people than the sample size: everyone is a recipient', () => {
  assert.equal(sampleCampaignResults('X', people.slice(0, 5)).length, 5);
  assert.deepEqual(sampleCampaignResults('X', []), []);
});

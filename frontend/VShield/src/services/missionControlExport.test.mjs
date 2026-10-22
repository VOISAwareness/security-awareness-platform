import assert from 'node:assert/strict';
import test from 'node:test';
import { strFromU8, unzipSync } from 'fflate';

import { missionControl, missionStory } from './missionControl.js';
import { missionBook, missionSummary } from './missionControlExport.js';
import { campaignReport } from './sampleReports.js';
import { CAMPAIGNS, DEPTS, person } from './sampleCampaigns.js';

const ITEMS = CAMPAIGNS.map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: person }) }));
const M = missionControl(ITEMS, { days: 30 });
const TRAINING = { funnel: [{ name: 'Assigned', value: 200 }, { name: 'Completed', value: 150 }], programmes: [{ program: 'Basics', completion: 75, pass: 70, score: 80, status: 'Good' }] };
const S = missionStory(M, { completion: 0.75, needsWork: 0 });

const sheetNames = (bytes) => [...strFromU8(unzipSync(bytes)['xl/workbook.xml']).matchAll(/<sheet name="([^"]+)"/g)].map((x) => x[1]);

test('the full report: a sheet per part, one row per lure and per campaign', () => {
  const bytes = missionBook(M, S, TRAINING);
  assert.deepEqual(sheetNames(bytes), ['Summary', 'What stands out', 'Lures', 'Campaigns', 'Training']);
  const files = unzipSync(bytes);
  const rows = (i) => (strFromU8(files[`xl/worksheets/sheet${i}.xml`]).match(/<row /g) || []).length;
  // a title and a note (the gap is an empty row, not written), then the column names and the rows
  assert.equal(rows(3), 3 + M.lures.length);
  assert.equal(rows(4), 3 + M.response.length);
  assert.deepEqual(sheetNames(missionBook(M, S, null)), ['Summary', 'What stands out', 'Lures', 'Campaigns'], 'no training sheet without training figures');
});

test('the summary: the period, the health and every finding, never advice', () => {
  const text = missionSummary(M, S);
  assert.match(text, /last 30 days/);
  assert.match(text, new RegExp(`${M.pulse.campaigns} campaigns`));
  assert.match(text, new RegExp(M.pulse.health.word.toLowerCase()));
  for (const f of Object.values(S).flat()) assert.ok(text.includes(f.headline), f.id);
  assert.ok(!/\b(should|must|recommend|consider)\b/i.test(text));
});

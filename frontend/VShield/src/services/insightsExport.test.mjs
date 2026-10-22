import assert from 'node:assert/strict';
import test from 'node:test';
import { strFromU8, unzipSync } from 'fflate';

import { insights, standsOut } from './insights.js';
import { insightsBook, insightsSummary } from './insightsExport.js';
import { campaignReport } from './sampleReports.js';
import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from './sampleCampaigns.js';

const ITEMS = [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: person }) }));
const M = insights(ITEMS, { days: 30 });
const LIST = standsOut(M);
const TRAINING = { funnel: [{ name: 'Assigned', value: 200 }, { name: 'Completed', value: 150 }], programmes: [{ program: 'Basics', completion: 75, pass: 70, score: 80, status: 'Good' }] };

const sheetNames = (bytes) => [...strFromU8(unzipSync(bytes)['xl/workbook.xml']).matchAll(/<sheet name="([^"]+)"/g)].map((x) => x[1]);

test('the full report: a sheet per part, one row per lure, campaign and fortnight', () => {
  const bytes = insightsBook(M, LIST, TRAINING);
  assert.deepEqual(sheetNames(bytes), ['Summary', 'What stands out', 'Lures', 'Campaigns', 'Fortnight by fortnight', 'Training']);
  const files = unzipSync(bytes);
  const rows = (i) => (strFromU8(files[`xl/worksheets/sheet${i}.xml`]).match(/<row /g) || []).length;
  // a title and a note (the gap is an empty row, not written), then the column names and the rows
  assert.equal(rows(3), 3 + M.lures.length);
  assert.equal(rows(4), 3 + M.campaigns.length);
  assert.equal(rows(5), 3 + M.trend.length);
  assert.ok(strFromU8(files['xl/worksheets/sheet1.xml']).includes('The 30 days before'), 'the summary sets the period against the one before');
  assert.deepEqual(sheetNames(insightsBook(M, LIST, null)), ['Summary', 'What stands out', 'Lures', 'Campaigns', 'Fortnight by fortnight'], 'no training sheet without training figures');
});

test('the summary: the period, the health and every finding, never advice', () => {
  const text = insightsSummary(M, LIST);
  assert.match(text, /last 30 days/);
  assert.match(text, new RegExp(`${M.now.campaigns} campaigns`));
  assert.match(text, new RegExp(M.now.health.word.toLowerCase()));
  for (const f of LIST) assert.ok(text.includes(f.title), f.id);
  assert.ok(!/\b(should|must|recommend|consider)\b/i.test(text));
});

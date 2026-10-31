import assert from 'node:assert/strict';
import test from 'node:test';

import { scopeItems, sliceOf } from './scope.js';
import { insights } from './insights.js';
import { campaignReport } from './sampleReports.js';
import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from './sampleCampaigns.js';

const ITEMS = [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: person }) }));

test('sliceOf: a department\'s part, shaped as a report, or null where the campaign did not go', () => {
  const r = ITEMS[0].report;
  const d = r.departments[0];
  const s = sliceOf(r, d.name);
  assert.equal(s.id, r.id);
  assert.equal(s.delivered, d.recipients);
  assert.equal(s.clicked, d.clicked);
  assert.equal(s.reported, d.reported);
  assert.equal(s.compromised, d.compromised);
  assert.equal(s.rates.click, d.clicked / d.recipients);
  assert.deepEqual(s.departments, [d]);
  assert.equal(s.timing.firstReport, d.timing.firstReport);
  assert.equal(sliceOf(r, 'No such team'), null);
});

test('scopeItems: the company sees every campaign; a department, only those that went to it', () => {
  assert.equal(scopeItems(ITEMS, null), ITEMS);
  assert.equal(scopeItems(ITEMS, {}), ITEMS);
  const name = ITEMS[0].report.departments[0].name;
  const mine = scopeItems(ITEMS, { department: name });
  assert.ok(mine.length > 0 && mine.length < ITEMS.length);
  assert.ok(mine.every((x) => x.report.departments.length === 1 && x.report.departments[0].name === name));
});

test('insights() on a department\'s scope: its own figures, the same as its row in the company\'s', () => {
  const m = insights(ITEMS, { days: 30 });
  const name = m.departments[0].name;
  const s = insights(scopeItems(ITEMS, { department: name }), { days: 30, now: m.basis.end });
  const row = m.departments.find((d) => d.name === name);
  assert.equal(s.now.delivered, row.recipients);
  assert.equal(s.now.clicked, row.clicked);
  assert.equal(s.now.reported, row.reported);
  assert.equal(s.now.compromised, row.compromised);
  // its campaign types are the company's department × type cells
  for (const l of s.lures) {
    const cell = m.deptLures[name].find((x) => x.type === l.type);
    assert.equal(l.clicked, cell.clicked, l.type);
    assert.equal(l.delivered, cell.recipients, l.type);
  }
  // only one department in sight
  assert.deepEqual(s.departments.map((d) => d.name), [name]);
  assert.ok(Number.isFinite(s.now.firstReport));
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { LEVEL_ORDER, campaignReport, orgReport } from './sampleReports.js';

const DEPTS = ['AIDA', 'CARE', 'Finance', 'Network', 'Supply', 'Cyber', 'Cloud', 'IT Ops', 'Procurement', 'HR'];
const personAt = (i) => ({ name: `Person ${i}`, dept: DEPTS[i % DEPTS.length] });
const CAMPAIGNS = Array.from({ length: 10 }, (_, k) => ({ id: `C${k}`, name: `Campaign ${k}`, started: `${k + 1} Oct`, total: 500 + k * 137, seed: k + 1 }));

test('campaignReport: the same campaign gives the same report', () => {
  assert.deepEqual(campaignReport(CAMPAIGNS[2], { depts: DEPTS, personAt }), campaignReport(CAMPAIGNS[2], { depts: DEPTS, personAt }));
});

test('campaignReport: the funnel only narrows, and departments add up', () => {
  for (const c of CAMPAIGNS) {
    const r = campaignReport(c, { depts: DEPTS, personAt });
    assert.ok(r.delivered <= r.sent && r.opened <= r.delivered && r.clicked <= r.delivered && r.compromised <= r.clicked, c.id);
    assert.ok(r.reported + r.clicked <= r.delivered, c.id);
    for (const k of Object.keys(r.rates)) assert.ok(r.rates[k] >= 0 && r.rates[k] <= 1, `${c.id} ${k}`);
    assert.equal(r.departments.reduce((a, d) => a + d.recipients, 0), r.delivered, c.id);
    assert.ok(r.departments.every((d, i, all) => i === 0 || all[i - 1].reportRate >= d.reportRate), 'best reporters first');
    assert.equal(r.points.net, r.points.earned - r.points.lost);
    assert.equal(r.firstReporters.length, 3);
  }
});

test('campaignReport: points follow the live rules', () => {
  const base = campaignReport(CAMPAIGNS[0], { depts: DEPTS, personAt });
  const doubled = campaignReport(CAMPAIGNS[0], { depts: DEPTS, personAt, rules: { Reported: 160, Trained: 60, Clicked: -60, Compromised: -100 } });
  assert.equal(doubled.points.earned, base.points.earned * 2);
  assert.equal(doubled.points.lost, base.points.lost * 2);
});

test('orgReport: trend oldest first, levels count everyone, at-risk includes hidden rows', () => {
  const board = {
    total: 5,
    podium: { first: { rank: 1, pts: '4,620', levelId: 'L7G1', dept: 'Cyber' }, second: { rank: 2, pts: '900', levelId: 'L4G1', dept: 'HR' }, third: { rank: 3, pts: '200', levelId: 'L2G2', dept: 'HR' } },
    rows: [{ rank: 4, pts: '-50', levelId: 'L0', dept: 'Cyber' }, { rank: 5, pts: null, levelId: null, hidden: true, dept: 'HR' }],
  };
  const r = orgReport(CAMPAIGNS, board, { depts: DEPTS, personAt });
  assert.equal(r.campaigns, 8);
  assert.equal(r.trend.length, 8);
  assert.equal(r.trend[0].id, 'C7', 'oldest first');
  assert.equal(r.trend.at(-1).id, 'C0');
  assert.deepEqual(r.levels.map((l) => l.family), [...LEVEL_ORDER]);
  assert.equal(r.levels.reduce((a, l) => a + l.count, 0), 5);
  assert.equal(r.atRisk, 2);
  assert.equal(r.avgScore, Math.round((4620 + 900 + 200 - 50) / 4));
  assert.equal(r.departments.find((d) => d.name === 'HR').atRisk, 1);
  assert.ok(r.rates.report > 0 && r.rates.report < 1);
});

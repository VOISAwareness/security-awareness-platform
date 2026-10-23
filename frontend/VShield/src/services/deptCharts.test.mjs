import assert from 'node:assert/strict';
import test from 'node:test';

import { DEPT_CHARTS, deptOrder, deptRows } from './deptCharts.js';
import { insights, peopleInsights } from './insights.js';
import { campaignReport } from './sampleReports.js';
import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from './sampleCampaigns.js';
import { organisation } from './sampleOrganisation.js';

const ITEMS = [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: person }) }));
const at = (days) => {
  const m = insights(ITEMS, { days });
  const p = peopleInsights(organisation({ end: m.basis.end, steps: 24 }), { days });
  return { m, p, rows: deptRows(m, p) };
};

test('four charts, with the names people read', () => {
  assert.deepEqual(DEPT_CHARTS.map((c) => c.id), ['ranking', 'movement', 'reporting', 'spots']);
  assert.deepEqual(DEPT_CHARTS.map((c) => c.label), ['Ranking', 'Movement', 'Reporting', 'Weak spots']);
});

test('a row per department, with its risk, its change, its months and its emails', () => {
  const { p, rows } = at(30);
  assert.equal(rows.length, p.departments.length);
  for (const r of rows) {
    assert.ok(Number.isFinite(r.score));
    assert.ok(Number.isFinite(r.change), `${r.name} has a change`);
    assert.ok(Math.abs(r.score - r.before - r.change) < 1e-9);
    assert.equal(r.trend.length, p.trend.length, `${r.name} has a score for every month`);
    assert.ok(Math.abs(r.trend.at(-1) - r.score) < 1e-9, 'its last month is its score now');
    assert.ok(r.emails > 0 && r.hooked >= 0 && r.hooked <= 1 && r.reportRate >= 0 && r.reportRate <= 1, r.name);
    assert.ok(Math.abs(r.perClick - r.reported / r.clicked) < 1e-9);
    assert.ok(['Protected', 'Holding', 'Exposed'].includes(r.health.word));
  }
});

test('the order: riskiest first, or the most improved first for Movement', () => {
  const { rows } = at(30);
  const ranking = deptOrder(rows, 'ranking');
  ranking.forEach((r, i) => assert.ok(i === 0 || r.score <= ranking[i - 1].score));
  const movement = deptOrder(rows, 'movement');
  movement.forEach((r, i) => assert.ok(i === 0 || r.change >= movement[i - 1].change));
  assert.equal(rows.length, ranking.length, 'ordering copies, never drops');
  assert.deepEqual(deptOrder(rows, 'spots'), ranking, 'the other charts keep the ranking');
});

test('the periods differ: safer over 30 days, riskier over 90', () => {
  const count = (days) => { const { rows } = at(days); return { safer: rows.filter((r) => r.change <= -0.05).length, riskier: rows.filter((r) => r.change >= 0.05).length }; };
  const a = count(30); const c = count(90);
  assert.ok(a.safer > a.riskier, `30 days: ${JSON.stringify(a)}`);
  assert.ok(c.riskier > c.safer, `90 days: ${JSON.stringify(c)}`);
});

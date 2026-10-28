import assert from 'node:assert/strict';
import test from 'node:test';

import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from './sampleCampaigns.js';
import { campaignReport } from './sampleReports.js';
import { insights, peopleInsights } from './insights.js';
import { organisation } from './sampleOrganisation.js';
import { deptRows } from './deptCharts.js';
import { COUNTRIES, apportion, countriesOf } from './sampleRegions.js';
import { SENDER_DOMAINS, STATUS_NOW } from './sampleOperations.js';
import { deptFacts, deptHealth, pipeline, regions, waiting } from './insightsSummary.js';

const items = [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((c) => ({ campaign: c, report: campaignReport(c, { depts: DEPTS, personAt: person }) }));
const at = (days) => {
  const m = insights(items, { days });
  const p = peopleInsights(organisation({ end: m.basis.end, steps: 24 }), { days });
  return { m, p, rows: deptRows(m, p) };
};

test('apportion: whole numbers, in proportion, adding up to the total', () => {
  assert.deepEqual(apportion(10, [1, 1, 1]), [4, 3, 3]);
  assert.deepEqual(apportion(0, [1, 2]), [0, 0]);
  assert.deepEqual(apportion(7, [0, 0]), [0, 0]);
  const split = apportion(1001, COUNTRIES.map((c) => c.share));
  assert.equal(split.reduce((a, b) => a + b, 0), 1001);
});

test("a campaign's countries add up to the campaign, and never click or report more than they got", () => {
  const { m } = at(30);
  for (const row of m.campaigns) {
    const parts = countriesOf(row);
    for (const k of ['delivered', 'clicked', 'reported', 'compromised']) {
      assert.equal(parts.reduce((a, c) => a + c[k], 0), row[k], `${row.name} ${k}`);
    }
    for (const c of parts) assert.ok(c.compromised <= c.clicked, `${row.name} ${c.name}`);
  }
});

test('regions: every country, the most people first, the company split exactly, rates from the counts', () => {
  for (const days of [30, 60, 90]) {
    const { m, p } = at(days);
    const list = regions(m.campaigns, p.now.people);
    assert.deepEqual(list.map((r) => r.name).sort(), COUNTRIES.map((c) => c.name).sort());
    assert.equal(list.reduce((a, r) => a + r.people, 0), p.now.people);
    assert.equal(list.reduce((a, r) => a + r.clicked, 0), m.now.clicked);
    assert.equal(list.reduce((a, r) => a + r.reported, 0), m.now.reported);
    list.forEach((r, i) => {
      if (i) assert.ok(list[i - 1].people >= r.people);
      assert.equal(r.hooked, r.clicked / r.delivered);
      assert.ok(['Protected', 'Holding', 'Exposed'].includes(r.health.word));
    });
  }
});

test('departments: every one counted once by health; three facts, each a real department', () => {
  const { rows } = at(30);
  const h = deptHealth(rows);
  assert.equal(h.Protected + h.Holding + h.Exposed + h.none, rows.length);
  const facts = deptFacts(rows);
  assert.deepEqual(facts.map((f) => f.id), ['highest', 'fell', 'lowestReport']);
  assert.equal(facts[0].row.score, Math.max(...rows.map((r) => r.score)));
  assert.ok(facts[1].row.change < 0);
  assert.equal(facts[2].row.reportRate, Math.min(...rows.filter((r) => Number.isFinite(r.reportRate)).map((r) => r.reportRate)));
});

test('departments: when none fell over the period, the largest rise takes its place', () => {
  const { rows } = at(90);
  assert.ok(rows.every((r) => !(r.change < 0)));
  const facts = deptFacts(rows);
  assert.deepEqual(facts.map((f) => f.id), ['highest', 'rose', 'lowestReport']);
  assert.equal(facts[1].row.change, Math.max(...rows.map((r) => r.change)));
});

test('pipeline: the workflow in order, the sent ones being the period', () => {
  const { m } = at(30);
  const flow = pipeline(STATUS_NOW, m.basis.campaigns);
  assert.deepEqual(flow.map((s) => s.key), ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENDING', 'SENT', 'REJECTED', 'FAILED']);
  assert.equal(flow.find((s) => s.key === 'SENT').count, m.basis.campaigns);
});

test('waiting: each count from its source, and nothing waiting reads grey', () => {
  const { m, p, rows } = at(30);
  const flow = pipeline(STATUS_NOW, m.basis.campaigns);
  const list = waiting({ flow, drivers: p.now.drivers, rows, domains: SENDER_DOMAINS });
  const byId = Object.fromEntries(list.map((w) => [w.id, w]));
  assert.equal(byId.approvals.count, STATUS_NOW.PENDING_APPROVAL);
  assert.equal(byId.overdue.count, p.now.drivers.overdueTraining);
  assert.equal(byId.repeat.count, p.now.drivers.repeatClickers);
  assert.equal(byId.exposed.count, deptHealth(rows).Exposed);
  assert.equal(byId.failed.count, 0);
  assert.equal(byId.failed.tone, 'context');
  for (const w of list) assert.ok(w.to.route || w.to.view || w.to.tab, w.id);
});

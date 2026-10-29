import assert from 'node:assert/strict';
import test from 'node:test';

import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from './sampleCampaigns.js';
import { campaignReport } from './sampleReports.js';
import { insights, peopleInsights } from './insights.js';
import { organisation } from './sampleOrganisation.js';
import { deptRows } from './deptCharts.js';
import { deptHealth, riskLevels, riskiest, scorecard } from './insightsSummary.js';

const items = [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((c) => ({ campaign: c, report: campaignReport(c, { depts: DEPTS, personAt: person }) }));
const at = (days) => {
  const m = insights(items, { days });
  const p = peopleInsights(organisation({ end: m.basis.end, steps: 24 }), { days });
  return { m, p, rows: deptRows(m, p) };
};

test('scorecard: ten measures, each from its source, with six months of trend', () => {
  for (const days of [30, 60, 90]) {
    const { m, p } = at(days);
    const card = scorecard(m, p);
    const by = Object.fromEntries(card.map((r) => [r.id, r]));
    assert.equal(card.length, 10);
    assert.equal(by.campaigns.now, m.now.campaigns);
    assert.equal(by.delivered.now, m.now.delivered);
    assert.equal(by.openRate.now, m.now.openRate);
    assert.equal(by.gaveDetails.now, m.now.compromised / m.now.delivered);
    assert.equal(by.repeatClickers.now, p.now.drivers.repeatClickers);
    assert.equal(by.repeatClickers.before, p.before.drivers.repeatClickers);
    assert.equal(by.firstReport.now, m.now.firstReport);
    assert.equal(by.beatClick.now, m.now.beatClick / m.now.campaigns);
    assert.equal(by.completion.now, p.now.training.completion);
    assert.equal(by.quizScore.before, p.before.training.quizScore);
    for (const r of card) {
      assert.equal(r.trend.length, 6, r.id);
      assert.equal(r.heads.length, 6, r.id);
      assert.ok(r.heads.every((t, i) => i === 0 || t > r.heads[i - 1]), `${r.id}: oldest first`);
      assert.ok(r.trend.every((v) => v === null || Number.isFinite(v)), r.id);
      assert.ok([null, 'up', 'down'].includes(r.better), r.id);
    }
  }
});

test('scorecard: the newest month of each campaign measure is the thirty days to the end', () => {
  const { m, p } = at(30);
  const by = Object.fromEntries(scorecard(m, p).map((r) => [r.id, r]));
  assert.equal(by.campaigns.trend.at(-1), m.now.campaigns);
  assert.equal(by.openRate.trend.at(-1), m.now.openRate);
  assert.equal(by.campaigns.heads.at(-1), m.basis.end);
});

test('scorecard: with no period before, nothing to compare is shown as missing, not zero', () => {
  const { m, p } = at(30);
  const by = Object.fromEntries(scorecard({ ...m, before: null }, { ...p, before: null }).map((r) => [r.id, r]));
  assert.equal(by.campaigns.before, null);
  assert.equal(by.gaveDetails.before, null);
  assert.equal(by.repeatClickers.before, null);
  assert.equal(by.quizScore.before, null);
});

test('risk levels: the levels add up to everyone, then and now', () => {
  for (const days of [30, 90]) {
    const { p } = at(days);
    const r = riskLevels(p);
    assert.deepEqual(r.levels.map((l) => l.key), ['low', 'moderate', 'high', 'critical']);
    assert.equal(r.levels.reduce((a, l) => a + l.now, 0), r.people);
    assert.equal(r.levels.reduce((a, l) => a + l.before, 0), p.before.people);
    assert.ok(Math.abs(r.levels.reduce((a, l) => a + l.share, 0) - 1) < 1e-9);
    assert.equal(r.lower, p.now.improved);
    assert.equal(r.higher, p.now.slipped);
  }
});

test('departments by health: every one counted once', () => {
  const { rows } = at(30);
  const h = deptHealth(rows);
  assert.equal(h.Protected + h.Holding + h.Exposed + h.none, rows.length);
});

test('riskiest: the highest Risk Scores and the highest Hook Rates, three of each', () => {
  const { m, rows } = at(30);
  const r = riskiest(rows, m.lures);
  assert.equal(r.departments.length, 3);
  assert.equal(r.departments[0].score, Math.max(...rows.map((x) => x.score)));
  assert.ok(r.departments.every((d, i) => i === 0 || d.score <= r.departments[i - 1].score));
  assert.equal(r.lures[0].hooked, Math.max(...m.lures.map((l) => l.hooked ?? -1)));
  assert.ok(r.lures.length <= 3 && r.lures.every((l, i) => i === 0 || l.hooked <= r.lures[i - 1].hooked));
});

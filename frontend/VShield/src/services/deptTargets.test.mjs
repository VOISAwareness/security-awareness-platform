import assert from 'node:assert/strict';
import test from 'node:test';

import { DEPT_MEASURES, deptPage, deptTargets } from './deptTargets.js';
import { insights, peopleInsights } from './insights.js';
import { TARGETS, standing } from './insightsTargets.js';
import { campaignReport } from './sampleReports.js';
import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from './sampleCampaigns.js';
import { organisation } from './sampleOrganisation.js';

const ITEMS = [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: person }) }));
const at = (days) => {
  const m = insights(ITEMS, { days });
  const p = peopleInsights(organisation({ end: m.basis.end, steps: 24 }), { days });
  return { m, p };
};

test('six measures, each with a target', () => {
  assert.equal(DEPT_MEASURES.length, 6);
  DEPT_MEASURES.forEach((k) => assert.ok(TARGETS[k], k));
});

test('a row per department with its six measures, now and before, from both sources', () => {
  const { m, p } = at(30);
  const rows = deptTargets(m, p);
  assert.equal(rows.length, p.departments.length);
  for (const r of rows) {
    const d = p.departments.find((x) => x.name === r.name);
    const c = m.departments.find((x) => x.name === r.name);
    const b = m.deptBefore.find((x) => x.name === r.name);
    assert.equal(r.people, d.people);
    assert.equal(r.now.riskScore, d.score);
    assert.equal(r.before.riskScore, d.scoreBefore);
    assert.equal(r.now.highRiskShare, d.highRisk / d.people);
    assert.equal(r.now.hookRate, c.clicked / c.recipients);
    assert.equal(r.now.reportRate, c.reported / c.recipients);
    assert.equal(r.now.gaveDetails, c.compromised / c.recipients);
    assert.equal(r.before.hookRate, b.clicked / b.recipients);
    assert.equal(r.now.trainingCompletion, d.training.completion);
    DEPT_MEASURES.forEach((k) => assert.ok(Number.isFinite(r.now[k]) && Number.isFinite(r.before[k]), `${r.name} ${k}`));
    assert.ok(['Protected', 'Holding', 'Exposed'].includes(r.health.word));
  }
});

test('the period before: the same departments, from the campaigns before the period', () => {
  const { m, p } = at(30);
  assert.deepEqual(m.deptBefore.map((d) => d.name).sort(), p.departments.map((d) => d.name).sort());
  // the period before counts the campaigns the company's figures before do
  // (each campaign splits its clicks across departments, so within a rounding)
  const clicked = m.deptBefore.reduce((a, d) => a + d.clicked, 0);
  assert.ok(Math.abs(clicked - m.before.clicked) / m.before.clicked < 0.02, `${clicked} against ${m.before.clicked}`);
});

test('the rows: the most measures off target first, then the most at risk, then the riskiest', () => {
  const { m, p } = at(30);
  const rows = deptTargets(m, p);
  rows.forEach((r) => {
    assert.equal(r.off, DEPT_MEASURES.filter((k) => standing(r.now[k], TARGETS[k]) === 'off').length);
    assert.equal(r.atRisk, DEPT_MEASURES.filter((k) => standing(r.now[k], TARGETS[k]) === 'risk').length);
  });
  rows.forEach((r, i) => {
    if (i === 0) return;
    const a = rows[i - 1];
    assert.ok(a.off > r.off || (a.off === r.off && (a.atRisk > r.atRisk || (a.atRisk === r.atRisk && a.now.riskScore >= r.now.riskScore))), r.name);
  });
});

test('a department page: its Risk Score over twelve steps, its months, lures and training', () => {
  const { m, p } = at(30);
  const name = p.departments[0].name;
  const page = deptPage(m, p, name);
  const d = p.departments[0];
  assert.equal(page.risk.length, 12);
  assert.equal(page.risk.at(-1).score, d.score);
  assert.equal(page.risk.at(-1).to, p.trend.at(-1).to);
  assert.ok(page.months.length > 0 && page.months.length <= 12);
  const last = page.months.at(-1);
  const c = m.departments.find((x) => x.name === name);
  assert.equal(last.to, m.basis.end);
  assert.equal(last.hooked, c.clicked / c.recipients);
  assert.equal(last.reportRate, c.reported / c.recipients);
  assert.ok(page.lures.length > 0);
  page.lures.forEach((l, i) => assert.ok(i === 0 || l.hooked <= page.lures[i - 1].hooked));
  page.lures.forEach((l) => assert.equal(l.company, m.lures.find((x) => x.type === l.type).hooked));
  assert.equal(page.training.trained, d.cohorts.trainedRate);
  assert.equal(page.training.untrained, d.cohorts.untrainedRate);
  assert.equal(deptPage(m, p, 'No such team'), null);
});

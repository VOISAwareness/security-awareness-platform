import assert from 'node:assert/strict';
import test from 'node:test';

import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from './sampleCampaigns.js';
import { campaignReport } from './sampleReports.js';
import { insights, peopleInsights } from './insights.js';
import { organisation } from './sampleOrganisation.js';
import { trends } from './insightsSummary.js';

const items = [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((c) => ({ campaign: c, report: campaignReport(c, { depts: DEPTS, personAt: person }) }));
const at = (days) => {
  const m = insights(items, { days });
  const p = peopleInsights(organisation({ end: m.basis.end, steps: 24 }), { days });
  return { m, p };
};

test('the year: twelve steps of thirty days, oldest first, the newest ending with the period', () => {
  const { m } = at(30);
  assert.equal(m.year.length, 12);
  assert.equal(m.year.at(-1).to, m.basis.end);
  assert.ok(m.year.every((s, i) => i === 0 || s.to > m.year[i - 1].to));
  // the newest step is the 30-day period, and the last six are the months
  assert.equal(m.year.at(-1).campaigns, m.now.campaigns);
  assert.deepEqual(m.year.slice(-6).map((s) => s.campaigns), m.months.map((s) => s.campaigns));
});

test('trends: the Risk Score over twelve steps, from the people trend', () => {
  const { m, p } = at(30);
  const t = trends(m, p);
  assert.equal(t.risk.length, 12);
  assert.equal(t.risk.at(-1).score, p.trend.at(-1).score);
});

test('trends: the campaign months start at the first with a campaign, each from its step', () => {
  const { m, p } = at(30);
  const t = trends(m, p);
  assert.ok(t.months.length > 0 && t.months.length <= 12);
  assert.ok(t.months[0].campaigns > 0, 'no empty months before the first campaign');
  const last = t.months.at(-1);
  assert.equal(last.to, m.basis.end);
  assert.equal(last.hooked, m.now.hooked);
  assert.equal(last.reportRate, m.now.reportRate);
  assert.equal(last.gave, m.now.compromised / m.now.delivered);
  assert.equal(last.firstReport, m.now.firstReport);
});

test('trends: training is the click rate of each group, and the trained click less in the sample', () => {
  const { m, p } = at(30);
  const { training } = trends(m, p);
  assert.equal(training.untrained, p.now.cohorts.untrainedRate);
  assert.equal(training.trained, p.now.cohorts.trainedRate);
  assert.ok(training.trained < training.untrained);
});

test('trends: with no campaigns at all, no months, not empty ones', () => {
  const { m, p } = at(30);
  const none = { ...m, year: m.year.map((s) => ({ ...s, campaigns: 0 })) };
  assert.deepEqual(trends(none, p).months, []);
});

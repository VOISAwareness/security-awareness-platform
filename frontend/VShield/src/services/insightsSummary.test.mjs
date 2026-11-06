import assert from 'node:assert/strict';
import test from 'node:test';

import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from './sampleCampaigns.js';
import { campaignReport } from './sampleReports.js';
import { insights, peopleInsights, periodSteps, summary } from './insights.js';
import { organisation } from './sampleOrganisation.js';
import { scoreAt, trends } from './insightsSummary.js';

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

const DAY = 86400000;

test('the period in steps: four of about a week for 30 days, calendar months for 60 and 90', () => {
  const end = Date.UTC(2026, 9, 6); // 6 Oct
  const w = periodSteps(end - 30 * DAY, end, 30);
  assert.equal(w.length, 4);
  assert.equal(w[0].from, end - 30 * DAY);
  assert.equal(w.at(-1).to, end);
  assert.equal(w[0].axis, '7–13 Sept');
  const m = periodSteps(end - 90 * DAY, end, 90);
  assert.deepEqual(m.map((s) => s.axis), ['Jul', 'Aug', 'Sept', 'Oct']);
  assert.equal(m[1].range, 'August 2026'); // a whole month
  assert.equal(m[0].range, '9–31 Jul'); // cut to the period
  assert.equal(m.at(-1).range, '1–6 Oct');
  // the steps follow on, and cover the period exactly
  m.forEach((s, i) => assert.equal(s.from, i === 0 ? end - 90 * DAY : m[i - 1].to));
  assert.equal(m.at(-1).to, end);
});

test('every campaign in the period is in exactly one step', () => {
  for (const days of [30, 60, 90]) {
    const { m } = at(days);
    assert.equal(m.period.reduce((a, s) => a + s.campaigns, 0), m.now.campaigns, `${days} days`);
  }
});

test('the average time to report is after the first report and counts every report', () => {
  const { m } = at(30);
  assert.ok(m.now.avgReport > m.now.firstReport);
  const one = summary([items[0].report]);
  assert.ok(one.avgReport > items[0].report.timing.firstReport);
});

test('trends: the Risk Score at the end of each step, between the snapshots', () => {
  const { m, p } = at(90);
  const t = trends(m, p);
  assert.equal(t.risk.length, m.period.length);
  assert.equal(t.risk.at(-1).score, p.trend.at(-1).score);
  const [a, b] = p.trend.slice(-2);
  assert.equal(scoreAt(p.trend, (a.to + b.to) / 2), (a.score + b.score) / 2);
  assert.equal(scoreAt([], 0), null);
});

test('trends: the campaign steps carry their measures and their dates in words', () => {
  const { m, p } = at(60);
  const t = trends(m, p);
  assert.equal(t.months.length, m.period.length);
  t.months.forEach((s, i) => {
    assert.equal(s.hooked, m.period[i].hooked);
    assert.equal(s.avgReport, m.period[i].avgReport);
    assert.ok(s.axis && s.range);
  });
});

test('trends: training is the click rate of each group, and the trained click less in the sample', () => {
  const { m, p } = at(30);
  const { training } = trends(m, p);
  assert.equal(training.untrained, p.now.cohorts.untrainedRate);
  assert.equal(training.trained, p.now.cohorts.trainedRate);
  assert.ok(training.trained < training.untrained);
});

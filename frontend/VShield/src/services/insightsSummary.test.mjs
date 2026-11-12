import assert from 'node:assert/strict';
import test from 'node:test';

import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from '../test-fixtures/sampleCampaigns.js';
import { campaignReport } from '../test-fixtures/sampleReports.js';
import { calendarMonths, insights, peopleInsights, summary } from './insights.js';
import { organisation } from '../test-fixtures/sampleOrganisation.js';
import { scoreAt, trends } from './insightsSummary.js';
import { dateOf } from './bigPicture.js';

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


test('the Summary steps: the last six calendar months, the newest so far', () => {
  const end = Date.UTC(2026, 10, 12, 9); // 12 Nov
  const m = calendarMonths(end);
  assert.deepEqual(m.map((s) => s.axis), ['June', 'July', 'August', 'September', 'October', 'Nov (so far)']);
  assert.equal(m[0].range, 'June 2026');
  assert.equal(m.at(-1).range, '1–12 Nov 2026');
  assert.equal(m.at(-1).to, end);
  assert.equal(m[0].from, Date.UTC(2026, 5, 1) - 1);
  // the months follow on with no gap
  m.forEach((s, i) => { if (i) assert.equal(s.from, m[i - 1].to); });
  // across a year end
  assert.deepEqual(calendarMonths(Date.UTC(2027, 1, 3)).map((s) => s.axis), ['September', 'October', 'November', 'December', 'January', 'Feb (so far)']);
  // on a month's last moment it is whole
  assert.equal(calendarMonths(Date.UTC(2026, 10, 1) - 1).at(-1).axis, 'October');
});

test('the Summary steps are the same whatever the period, and hold every campaign in them once', () => {
  const steps = [30, 60, 90].map((days) => at(days).m.period);
  assert.deepEqual(steps[0], steps[1]);
  assert.deepEqual(steps[0], steps[2]);
  const m = steps[0];
  const inside = items.filter((x) => dateOf(x.campaign.started) > m[0].from && dateOf(x.campaign.started) <= m.at(-1).to).length;
  assert.equal(m.reduce((a, s) => a + s.campaigns, 0), inside);
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

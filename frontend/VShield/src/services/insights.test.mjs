import assert from 'node:assert/strict';
import test from 'node:test';

import { arrival, insights, median, movement, peopleInsights, standsOut, summary } from './insights.js';
import { campaignReport } from './sampleReports.js';
import { CAMPAIGNS, DEPTS, MOTIVATORS, PAST_CAMPAIGNS, person } from './sampleCampaigns.js';
import { TIERS, organisation, riskScore } from './sampleOrganisation.js';

const ITEMS = [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: person }) }));
const DAY = 86400000;

test('median: the middle value', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), null);
  assert.equal(median([null, 7]), 7);
});

test('the period: 30, 60 or 90 days back from the newest campaign, and the one before it', () => {
  const [a, b, c] = [30, 60, 90].map((days) => insights(ITEMS, { days }));
  assert.ok(a.basis.campaigns > 0 && a.basis.campaigns < b.basis.campaigns && b.basis.campaigns < c.basis.campaigns, 'a longer period takes in more campaigns');
  for (const m of [a, b, c]) {
    assert.equal(m.campaigns.length, m.basis.campaigns);
    assert.ok(m.before && m.before.campaigns > 0, `the ${m.basis.days} days before have campaigns too`);
  }
  // the period before ends where the period starts: no campaign counts twice
  const ids = new Set(a.campaigns.map((x) => x.id));
  assert.equal(ITEMS.filter((x) => ids.has(x.campaign.id)).length, a.basis.campaigns);
  assert.ok(insights(ITEMS.filter((x) => CAMPAIGNS.includes(x.campaign)), { days: 90 }).before.campaigns < c.before.campaigns, 'past campaigns fill the period before');
});

test('the programme adds up from its campaigns', () => {
  const m = insights(ITEMS, { days: 30 });
  const ids = new Set(m.campaigns.map((x) => x.id));
  const rows = ITEMS.filter((x) => ids.has(x.campaign.id)).map((x) => x.report);
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  assert.equal(m.now.delivered, sum('delivered'));
  assert.equal(m.now.hooked, sum('clicked') / sum('delivered'));
  assert.equal(m.now.perClick, sum('reported') / sum('clicked'));
  assert.equal(m.now.learned, sum('trained') / sum('clicked'));
  assert.equal(m.now.beatClick, rows.filter((r) => r.timing.firstReport < r.timing.firstClick).length);
  assert.equal(m.now.firstReport, median(rows.map((r) => r.timing.firstReport)));
  assert.deepEqual(m.now, summary(rows));
  assert.ok(['Protected', 'Holding', 'Exposed'].includes(m.now.health.word));
});

test('lures: one row per kind, the most convincing first, adding up to the whole', () => {
  const m = insights(ITEMS, { days: 90 });
  assert.equal(new Set(m.lures.map((l) => l.type)).size, m.lures.length);
  assert.ok(m.lures.every((l, i, all) => i === 0 || all[i - 1].hooked >= l.hooked));
  assert.equal(m.lures.reduce((a, l) => a + l.delivered, 0), m.now.delivered);
  assert.equal(m.lures.reduce((a, l) => a + l.campaigns, 0), m.now.campaigns);
});

test('the trend: 13 fortnights to the newest campaign, the period marked', () => {
  const m = insights(ITEMS, { days: 30 });
  assert.equal(m.trend.length, 13);
  assert.ok(m.trend.every((w, i, all) => i === 0 || w.to - all[i - 1].to === 14 * DAY));
  assert.equal(m.trend.at(-1).to, m.basis.end);
  assert.ok(m.trend.at(-1).inPeriod && !m.trend[0].inPeriod);
  assert.equal(m.trend.reduce((a, w) => a + w.campaigns, 0), ITEMS.filter((x) => m.basis.end - 13 * 14 * DAY < Date.UTC(2026, ...monthDay(x.campaign.started))).length);
  const longer = insights(ITEMS, { days: 90 });
  assert.ok(longer.trend.filter((w) => w.inPeriod).length > m.trend.filter((w) => w.inPeriod).length);
});

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function monthDay(started) {
  const [d, mon] = started.split(' ');
  return [MONTHS.indexOf(mon), Number(d)];
}

const ORG = organisation({ end: insights(ITEMS).basis.end });

test('months, motivators and departments add up to the period', () => {
  const m = insights(ITEMS, { days: 60 });
  assert.equal(m.months.length, 6);
  assert.equal(m.months.at(-1).to, m.basis.end);
  assert.ok(m.months.filter((x) => x.inPeriod).length === 2, 'sixty days is the last two months');
  assert.equal(m.motivators.reduce((a, x) => a + x.campaigns, 0), m.now.campaigns);
  assert.ok(m.motivators.every((x) => MOTIVATORS.includes(x.motivator)));
  assert.ok(m.motivators.every((x, i, all) => i === 0 || all[i - 1].hooked >= x.hooked));
  assert.equal(m.departments.reduce((a, d) => a + d.recipients, 0), m.now.delivered);
  assert.ok(m.departments.every((d) => d.clickRate >= 0 && d.reportRate <= 1));
  assert.ok(m.now.complaintRate > 0 && m.now.complaintRate < 0.01 && m.now.openRate > m.now.hooked);
});

test('arrival: the share of reports in only grows, from none to most within two hours', () => {
  const m = insights(ITEMS, { days: 30 });
  const { curve, half, by15, by60, first } = m.arrival.now;
  assert.equal(curve.length, 121);
  assert.equal(curve[0].share, 0);
  assert.ok(curve.every((p, i) => i === 0 || p.share >= curve[i - 1].share));
  assert.ok(curve.at(-1).share > 0.6 && curve.at(-1).share <= 1);
  assert.ok(half > first && half < 120 && by15 < 0.5 && by60 >= 0.5);
  assert.equal(arrival([]).half, null);
  assert.ok(m.arrival.before);
});

test('people: the period at its end against its start, and what happened in it', () => {
  for (const days of [30, 60, 90]) {
    const p = peopleInsights(ORG, { days });
    const k = days / 30;
    assert.equal(p.basis.steps, k);
    assert.equal(p.now.people, ORG.at(-1).people);
    assert.equal(p.before.people, ORG.at(-1 - k).people);
    assert.equal(p.now.score, riskScore(ORG.at(-1).tiers));
    assert.equal(p.now.improved, p.moved.down, 'who improved comes from the moves');
    assert.equal(p.now.slipped, p.moved.up);
    assert.ok(p.now.cohorts.times > 1 && p.departments.every((d) => d.trend.length === ORG.length));
    assert.equal(p.now.training.assigned, ORG.slice(-k).reduce((a, s) => a + s.training.assigned, 0));
    assert.equal(p.before.training.assigned, ORG.slice(-2 * k, -k).reduce((a, s) => a + s.training.assigned, 0));
    assert.equal(p.departments.reduce((a, d) => a + d.training.assigned, 0), p.now.training.assigned);
    assert.ok(p.departments.every((d, i, all) => i === 0 || all[i - 1].score >= d.score), 'the riskiest first');
    assert.equal(p.trend.filter((s) => s.inPeriod).length, k);
  }
});

test("the sample's story: better over 30 days, steady over 60, worse over 90", () => {
  const at = (days) => ({ m: insights(ITEMS, { days }), p: peopleInsights(ORG, { days }) });
  const a = at(30); const b = at(60); const c = at(90);
  assert.deepEqual([a, b, c].map((x) => x.m.now.health.word), ['Protected', 'Holding', 'Exposed']);
  // 30 days: fewer clicks, more reports, the risk score down, more people safer than riskier
  assert.ok(a.m.now.hooked < a.m.before.hooked - 0.03 && a.m.now.reportRate > a.m.before.reportRate + 0.03);
  assert.ok(a.p.now.score < a.p.before.score - 1 && a.p.now.improved > a.p.now.slipped);
  // 60 days: about the same as the 60 before
  assert.ok(Math.abs(b.m.now.hooked - b.m.before.hooked) < 0.02 && Math.abs(b.m.now.reportRate - b.m.before.reportRate) < 0.02);
  assert.ok(Math.abs(b.p.now.score - b.p.before.score) < 0.5);
  // 90 days: more clicks, fewer reports, the risk score up, more people riskier than safer
  assert.ok(c.m.now.hooked > c.m.before.hooked + 0.03 && c.m.now.reportRate < c.m.before.reportRate - 0.03);
  assert.ok(c.p.now.score > c.p.before.score + 1 && c.p.now.slipped > c.p.now.improved);
});

test('movement: every move adds up to where people started and where they ended', () => {
  const start = { low: 50, moderate: 30, high: 15, critical: 5 };
  const end = { low: 58, moderate: 26, high: 12, critical: 4 };
  const mv = movement(start, end, 20);
  const out = (t) => mv.links.filter((l) => l.from === t).reduce((a, l) => a + l.n, 0);
  const into = (t) => mv.links.filter((l) => l.to === t).reduce((a, l) => a + l.n, 0);
  for (const t of TIERS) { assert.equal(out(t), start[t], `from ${t}`); assert.equal(into(t), end[t], `into ${t}`); }
  assert.equal(mv.joined, 0);
  assert.ok(mv.down >= 20, 'as many moved down as asked');
  const grew = movement(start, { ...end, moderate: 31 }, 0);
  assert.equal(grew.joined, 5);
  assert.equal(grew.links.find((l) => l.from === 'joined').to, 'moderate');
  for (const t of TIERS) assert.equal(grew.links.filter((l) => l.to === t).reduce((a, l) => a + l.n, 0), t === 'moderate' ? 31 : end[t]);
});

test('department by lure: every pair adds up to the department and to the lure', () => {
  const m = insights(ITEMS, { days: 30 });
  for (const d of m.departments) assert.equal(m.deptLures[d.name].reduce((a, x) => a + x.recipients, 0), d.recipients, d.name);
  for (const l of m.lures) assert.equal(m.lureDepts[l.type].reduce((a, x) => a + x.recipients, 0), l.delivered, l.type);
  assert.ok(m.campaigns.every((c) => c.departments.reduce((a, d) => a + d.recipients, 0) === c.delivered));
});

test('what changed: a short list, the most telling first, each opening its profile, never advice', () => {
  const m = insights(ITEMS, { days: 30 });
  const p = peopleInsights(ORG, { days: 30 });
  const alone = standsOut(m);
  assert.ok(alone.length >= 1 && alone.every((f) => f.view === 'lure'), 'without people, only the lures');
  const list = standsOut(m, p);
  assert.ok(list.length >= 4);
  assert.ok(list.every((f) => ['department', 'lure', 'risk', 'training'].includes(f.view) && f.focus && f.chip && f.title && f.title.length <= 30 && ['bad', 'good', 'watch'].includes(f.tone)));
  assert.ok(list.filter((f) => f.view === 'lure').every((f) => m.lures.some((l) => l.type === f.focus)));
  assert.ok(list.filter((f) => f.view === 'department').every((f) => p.departments.some((d) => d.name === f.focus)));
  const words = list.map((f) => `${f.title} ${f.sub}`).join(' ').toLowerCase();
  assert.ok(!/\b(should|must|recommend|consider)\b/.test(words), 'reports, never advises');
});

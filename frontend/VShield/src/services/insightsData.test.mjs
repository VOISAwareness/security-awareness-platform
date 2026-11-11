import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fromApi } from './insightsData.js';
import { insights, peopleInsights } from './insights.js';
import { peopleFor } from './insightsPeople.js';

const DAY = 86400000;
const asOf = Date.UTC(2026, 10, 11);
const dept = (name, index, extra = {}) => ({
  name, index, people: 10, tiers: { low: 5, moderate: 3, high: 1, critical: 1 },
  cohorts: { trained: 4, untrained: 6, trainedClicks: 1, untrainedClicks: 3, assigned: 3, voluntary: 1, assignedClicks: 1, voluntaryClicks: 0 },
  training: { assigned: 4, started: 3, completed: 2, passed: 2, quizTaken: 3, quizScoreSum: 240, daysSum: 9, badges: 2, points: 120, quizScore: 80 },
  ...extra,
});
const step = (k) => {
  const departments = [dept('Finance', 0), dept('Sales', 1)];
  return {
    to: asOf - (23 - k) * 30 * DAY, people: 20, tiers: { low: 10, moderate: 6, high: 2, critical: 2 },
    cohorts: { trained: 8, untrained: 12, trainedClicks: 2, untrainedClicks: 6, assigned: 6, voluntary: 2, assignedClicks: 2, voluntaryClicks: 0 },
    improved: 1, slipped: 1, drivers: { repeatClickers: 2, neverReported: 3, overdueTraining: 1, quizFailures: 0 },
    training: { assigned: 8, started: 6, completed: 4, passed: 4, quizTaken: 6, quizScoreSum: 480, daysSum: 18, badges: 4, points: 240, quizScore: 80, paths: { Basics: { assigned: 8, started: 6, completed: 4, passed: 4, quizTaken: 6, quizScoreSum: 480, daysSum: 18 } } },
    departments,
  };
};
const report = (id, started) => ({
  id, name: `Campaign ${id}`, started, sent: 10, delivered: 10, opened: 6, clicked: 2, compromised: 1, reported: 3, trained: 1, complained: 0,
  rates: { open: 0.6, click: 0.2, compromise: 0.1, report: 0.3, trainedAfterClick: 0.5 }, resilience: 1.5,
  timing: { firstReport: 4, medianReport: 30, firstClick: 2 },
  departments: [{ name: 'Finance', recipients: 10, sent: 10, delivered: 10, opened: 6, clicked: 2, compromised: 1, reported: 3, trained: 1, complained: 0, reportRate: 0.3, clickRate: 0.2, timing: { firstReport: 4, medianReport: 30, firstClick: 2 } }],
});
const API = {
  asOf,
  items: [
    { campaign: { id: 'C1', name: 'Campaign C1', type: 'Click', started: '2026-11-01', total: 10 }, report: report('C1', '2026-11-01') },
    { campaign: { id: 'C2', name: 'Campaign C2', type: 'Reward scam', started: '2026-09-20', total: 10 }, report: report('C2', '2026-09-20') },
  ],
  org: Array.from({ length: 24 }, (_, k) => step(k)),
  people: {
    campaigns: [{ name: 'Campaign C1', type: 'Click' }, { name: 'Campaign C2', type: 'Reward scam' }],
    months: [{ to: asOf }],
    rows: [{ id: 'VSLD-1', name: 'Ana Costa', department: 'Finance', levels: ['High'], level: 'High', records: [[0, 1, 0, 0], [1, 1, 1, 0]], emails: 2, clicked: 2, reported: 1, gave: 0, step: 'Passed', trained: 'Assigned', drivers: {} }],
  },
  programmes: [],
};

test('fromApi names the compacted campaign records', () => {
  const d = fromApi(API);
  assert.deepEqual(d.people.rows[0].records[1], { campaign: 'Campaign C2', type: 'Reward scam', clicked: 1, reported: 1, gave: 0 });
  assert.equal(d.asOf, asOf);
  assert.equal(peopleFor(d.people.rows, { campaignType: 'Click', did: 'clicked' }).length, 1);
  assert.equal(peopleFor(d.people.rows, { trained: 'Voluntary' }).length, 0);
});

test('fromApi stands up to an empty or odd answer', () => {
  const d = fromApi(null);
  assert.deepEqual([d.items, d.org, d.people.rows], [[], [], []]);
});

test('ISO start dates place campaigns in the period ending at asOf', () => {
  const m = insights(fromApi(API).items, { days: 30, now: asOf });
  assert.equal(m.basis.campaigns, 1); // 1 Nov is in; 20 Sep is in the period before
  assert.ok(m.before);
  assert.equal(m.campaigns[0].openRate, 0.6);
});

test('the period counts quizzes taken, programmes and the lift groups', () => {
  const p = peopleInsights(fromApi(API).org, { days: 60 });
  const t = p.now.training;
  assert.equal(t.quizScore, 80); // 960 over 12 quizzes
  assert.equal(t.quizPassRate, 8 / 12);
  assert.equal(t.avgDays, 36 / 8);
  assert.deepEqual(p.now.programmes.map((x) => [x.program, x.assigned, x.completion]), [['Basics', 16, 0.5]]);
  assert.deepEqual(p.now.cohorts.groups.map((g) => [g.key, g.people, g.rate]), [['Assigned', 6, 2 / 6], ['Voluntary', 2, 0], ['None', 12, 0.5]]);
  const fin = p.departments.find((d) => d.name === 'Finance').training;
  assert.equal(fin.quizPassRate, 4 / 6);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { GROUPS, PEOPLE_FILTERS, bigPicture, dateOf } from './bigPicture.js';
import { campaignReport } from './sampleReports.js';

const DEPTS = ['AIDA', 'CARE', 'Finance', 'Network', 'Supply', 'Cyber', 'Cloud', 'IT Ops', 'Procurement', 'HR'];
const TYPES = ['Credential theft', 'Finance lure', 'IT lure', 'HR lure'];
const personAt = (i) => ({ name: `Person ${i}`, dept: DEPTS[i % DEPTS.length] });
// 12 campaigns, one every 4 days back from 30 Oct
const CAMPAIGNS = Array.from({ length: 12 }, (_, k) => {
  const d = new Date(Date.UTC(2026, 9, 30 - k * 4));
  return { id: `C${k}`, name: `Campaign ${k}`, type: TYPES[k % TYPES.length], started: `${d.getUTCDate()} ${['Sep', 'Oct'][d.getUTCMonth() - 8]}`, total: 600 + k * 97, seed: k + 1 };
});
const ITEMS = CAMPAIGNS.map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt }) }));
const PEOPLE = Array.from({ length: 300 }, (_, i) => ({ key: `p${i}`, dept: DEPTS[i % DEPTS.length], points: [-150, 0, 40, 120, 260, 500, 800, 1250, 2000, 4500][i % 10] + (i % 7) * 5 }));

test('dateOf reads "6 Oct"', () => {
  assert.equal(dateOf('6 Oct'), Date.UTC(2026, 9, 6));
  assert.equal(dateOf('30 Sep'), Date.UTC(2026, 8, 30));
});

test('the same inputs give the same picture', () => {
  assert.deepEqual(bigPicture(ITEMS, PEOPLE), bigPicture(ITEMS, PEOPLE));
});

test('the organisation: the last 30 days, and everything adds up', () => {
  const r = bigPicture(ITEMS, PEOPLE);
  assert.equal(r.basis.campaigns, 8, '30 Oct back to 2 Oct');
  assert.equal(r.basis.population, 300);
  assert.equal(r.groups.map((g) => g.id).join(), GROUPS.map((g) => g.id).join());
  assert.equal(r.groups.reduce((a, g) => a + g.people, 0), r.basis.people);
  assert.equal(r.groups.reduce((a, g) => a + g.climbed, 0), r.moved.climbed);
  assert.equal(r.groups.reduce((a, g) => a + g.slipped, 0), r.moved.slipped);
  assert.equal(r.teams.reduce((a, t) => a + t.net, 0), r.points.earned - r.points.lost);
  assert.ok(r.teams.every((t, i, all) => i === 0 || all[i - 1].net >= t.net), 'teams by points gained');
  assert.ok(r.lures.every((l, i, all) => i === 0 || all[i - 1].click >= l.click), 'lures by clicks');
  const low = r.groups.find((g) => g.id === 'low');
  const top = r.groups.find((g) => g.id === 'top');
  assert.ok(low.click > top.click && low.report < top.report, 'lower levels click more and report less');
  assert.equal(r.standing.reduce((a, g) => a + g.now, 0), 300);
  assert.equal(r.standing.reduce((a, g) => a + g.before, 0), 300);
  assert.ok(r.forecast.strong.now >= 0 && r.forecast.strong.low <= r.forecast.strong.expected && r.forecast.strong.expected <= r.forecast.strong.high);
  assert.equal(r.forecast.down.within, r.people.filter((x) => x.pDrop > 0).length);
  assert.ok(Math.abs(r.forecast.down.expected - r.people.reduce((a, x) => a + x.pDrop, 0)) < 1e-9, 'expected = sum of chances');
});

test('one campaign: everyone given took part', () => {
  const r = bigPicture(ITEMS, PEOPLE, { focus: 'C3' });
  assert.equal(r.basis.campaigns, 1);
  assert.equal(r.basis.people, 300);
  assert.equal(r.lures.length, 1);
  assert.equal(r.lures[0].type, 'HR lure');
  assert.ok(r.forecast.up.within >= 0);
});

test('one step from a change, from today’s points', () => {
  const people = [
    { key: 'a', dept: 'X', points: 1290 }, // 10 from Security Champion
    { key: 'b', dept: 'X', points: 760 }, // 10 above Phish Catcher's floor
    { key: 'c', dept: 'X', points: 10 }, // 10 above zero
    { key: 'd', dept: 'X', points: 2000 }, // none of these
  ];
  const { edge } = bigPicture(ITEMS, people);
  assert.deepEqual(edge, { nearUp: 1, nearSlip: 1, nearZero: 1 });
});

test('points follow the live rules', () => {
  const r = bigPicture(ITEMS, PEOPLE, { rules: { Reported: 100 } });
  assert.equal(r.points.earned % 100, 0);
});

test('everyone one by one, bottom of the board first, adding up to the totals', () => {
  const r = bigPicture(ITEMS, PEOPLE);
  assert.equal(r.people.length, 300);
  assert.ok(r.people.every((x, i, all) => i === 0 || all[i - 1].points <= x.points), 'lowest points first');
  assert.equal(r.people[0].rank, 300);
  assert.equal(r.people.at(-1).rank, 1);
  const count = (id) => r.people.filter(PEOPLE_FILTERS.find((f) => f.id === id).test).length;
  assert.equal(count('climbed'), r.moved.climbed);
  assert.equal(count('slipped'), r.moved.slipped);
  assert.equal(count('fellBelowZero'), r.moved.belowZero);
  assert.equal(count('backAbove'), r.moved.backAbove);
  assert.equal(count('nearUp'), r.edge.nearUp);
  assert.equal(count('nearSlip'), r.edge.nearSlip);
  assert.equal(count('nearZero'), r.edge.nearZero);
  assert.equal(r.people.reduce((a, x) => a + x.change, 0), r.points.earned - r.points.lost);
  assert.ok(r.people.every((x) => x.reported + x.clicked <= x.campaigns && x.gave <= x.clicked));
});

test('departments one by one, least ground gained per person first', () => {
  const r = bigPicture(ITEMS, PEOPLE);
  assert.equal(r.departments.length, DEPTS.length);
  assert.equal(r.departments.reduce((a, d) => a + d.people, 0), 300);
  assert.ok(r.departments.every((d, i, all) => i === 0 || all[i - 1].perPerson <= d.perPerson));
  assert.ok(r.departments.every((d) => d.perPerson === Math.round(d.net / d.people) && d.belowZeroShare >= 0 && d.belowZeroShare <= 1));
  assert.equal(r.departments.reduce((a, d) => a + d.slipped, 0), r.moved.slipped);
  const finance = r.departments.find((d) => d.name === 'Finance');
  assert.equal(finance.nearZero, r.people.filter((x) => x.dept === 'Finance' && x.nearZero).length);
});

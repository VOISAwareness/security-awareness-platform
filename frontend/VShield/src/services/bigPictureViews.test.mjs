import assert from 'node:assert/strict';
import test from 'node:test';

import { bigPicture } from './bigPicture.js';
import { breakdown, findings } from './bigPictureFindings.js';
import { departmentsShown, findingPeople, health, peopleFiltered, peopleShown, recordOf, verdict } from './bigPictureViews.js';
import { campaignReport } from './sampleReports.js';

const DEPTS = ['Finance', 'HR', 'Cyber', 'CARE'];
const CAMPAIGNS = Array.from({ length: 6 }, (_, k) => ({ id: `C${k}`, name: `Campaign ${k}`, type: 'IT lure', started: `${20 - k * 3} Oct`, total: 600, seed: k + 1 }));
const ITEMS = CAMPAIGNS.map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: (i) => ({ name: `P${i}`, dept: DEPTS[i % 4] }) }) }));
const PEOPLE = Array.from({ length: 120 }, (_, i) => ({ key: `p${i}`, name: `Person ${i}`, email: `p${i}@example.com`, dept: DEPTS[i % 4], points: [-150, -20, 10, 60, 160, 310, 740, 1290, 2600, 4500][i % 10] + (i % 7) * 3 }));
const R = bigPicture(ITEMS, PEOPLE);
const ALL = { show: 'all', dept: 'all', level: 'all', q: '', sort: { key: 'points', dir: 'asc' } };

test('peopleShown: everyone, lowest first; then narrowed by each filter', () => {
  const all = peopleShown(R, ALL);
  assert.equal(all.length, 120);
  assert.ok(all.every((x, i) => i === 0 || all[i - 1].points <= x.points));
  assert.ok(peopleShown(R, { ...ALL, show: 'belowZero' }).every((x) => x.belowZero));
  assert.ok(peopleShown(R, { ...ALL, dept: 'HR' }).every((x) => x.dept === 'HR'));
  assert.equal(peopleShown(R, { ...ALL, q: 'person 11' }).map((x) => x.name).sort().join(), 'Person 11,Person 110,Person 111,Person 112,Person 113,Person 114,Person 115,Person 116,Person 117,Person 118,Person 119');
  assert.equal(peopleFiltered(ALL), false);
  assert.equal(peopleFiltered({ ...ALL, dept: 'HR' }), true);
});

test('departmentsShown: search and sort', () => {
  assert.deepEqual(departmentsShown(R, { q: 'h', sort: { key: 'name', dir: 'asc' } }).map((d) => d.name), ['HR']);
  const byPeople = departmentsShown(R, { q: '', sort: { key: 'people', dir: 'desc' } });
  assert.ok(byPeople.every((d, i) => i === 0 || byPeople[i - 1].people >= d.people));
});

test('findingPeople: a finding narrowed to a department and a name', () => {
  const f = findings(R).find((x) => x.link?.show);
  const b = breakdown(R, f);
  const dept = b.departments[0].name;
  assert.ok(findingPeople(b, { dept, q: '' }).every((x) => x.dept === dept));
  assert.equal(findingPeople(b, { dept: null, q: '' }).length, b.people.length);
});

test('verdict: which way the board moved, in a word', () => {
  const at = (climbed, slipped) => verdict({ basis: { people: 100 }, moved: { climbed, slipped } });
  assert.equal(at(20, 5).word, 'improving');
  assert.equal(at(5, 20).word, 'slipping');
  assert.equal(at(10, 9).word, 'steady');
  assert.equal(at(0, 0).word, 'steady');
  assert.deepEqual([at(20, 5).up, at(20, 5).down], [0.2, 0.05]);
});

test('health: reports against clicks, in a word', () => {
  assert.equal(health({ reported: 20, clicked: 10, emails: 100 }).word, 'Protected');
  assert.equal(health({ reported: 19, clicked: 10, emails: 100 }).word, 'Holding');
  assert.equal(health({ reported: 10, clicked: 10, emails: 100 }).word, 'Holding');
  assert.equal(health({ reported: 9, clicked: 10, emails: 100 }).word, 'Exposed');
  assert.equal(health({ reported: 0, clicked: 0, emails: 5 }).word, 'Holding', 'nobody clicked, nobody reported');
  assert.equal(health({ reported: 0, clicked: 0, emails: 0 }), null, 'no emails, no health');
  const h = health({ reported: 21, clicked: 25, emails: 100 });
  assert.equal(h.reportRate, 0.21);
  assert.equal(h.clickRate, 0.25);
  const r = bigPicture(ITEMS, PEOPLE);
  const all = health(recordOf(r.departments));
  const sum = (k) => r.departments.reduce((a, d) => a + d[k], 0);
  assert.equal(all.reportRate, sum('reported') / sum('emails'));
  assert.ok(r.departments.every((d) => !d.emails || ['Protected', 'Holding', 'Exposed'].includes(health(d).word)));
});

test('findingPeople: a team finding opens on its team, and on any other department', () => {
  const f = findings(R).find((x) => x.link?.dept);
  const b = breakdown(R, f);
  const team = f.link.dept;
  const other = b.departments.find((d) => d.name !== team).name;
  assert.ok(findingPeople(b, { dept: team, q: '' }).every((x) => x.dept === team));
  assert.equal(findingPeople(b, { dept: team, q: '' }).length, R.people.filter((x) => x.dept === team).length);
  assert.ok(findingPeople(b, { dept: other, q: '' }).every((x) => x.dept === other));
});

test('peopleShown: a campaign type keeps the people who clicked one, in a department too', () => {
  const clicked = peopleShown(R, { ...ALL, lure: 'IT lure' });
  assert.ok(clicked.length > 0 && clicked.length < 120);
  assert.ok(clicked.every((x) => x.clickedTypes.includes('IT lure') && x.clicked > 0));
  // everyone who clicked at all clicked this, the only type in the sample
  assert.equal(clicked.length, R.people.filter((x) => x.clicked > 0).length);
  const inHR = peopleShown(R, { ...ALL, lure: 'IT lure', dept: 'HR' });
  assert.ok(inHR.length > 0 && inHR.every((x) => x.dept === 'HR'));
  assert.equal(peopleShown(R, { ...ALL, lure: 'Travel scam' }).length, 0);
  assert.equal(peopleFiltered({ ...ALL, lure: 'IT lure' }), true);
});

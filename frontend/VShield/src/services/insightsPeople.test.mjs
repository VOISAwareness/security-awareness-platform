import assert from 'node:assert/strict';
import test from 'node:test';
import { unzipSync, strFromU8 } from 'fflate';

import { organisation, riskScore } from '../test-fixtures/sampleOrganisation.js';
import { DRIVERS, LEVELS, STEPS, countsBy, findPeople, levelsByMonth, peopleBook, peopleFor } from './insightsPeople.js';
import { peopleTable } from '../test-fixtures/samplePeople.js';

const CAMPAIGNS = [
  { name: 'Payroll Update', type: 'Credential theft' },
  { name: 'Mailbox Quota', type: 'Helpdesk impersonation' },
  { name: 'VPN Re-authentication', type: 'Credential theft' },
  { name: 'Gift Card Winner', type: 'Reward scam' },
  { name: 'Parcel Delivery Failed', type: 'Travel scam' },
];
const org = organisation({ end: Date.UTC(2026, 9, 6), steps: 24 });
const { rows, months } = peopleTable({ org, campaigns: CAMPAIGNS, programmes: ['Phishing Basics', 'Password Security'] });
const types = Object.fromEntries(CAMPAIGNS.map((c) => [c.name, c.type]));

test('one row per person, the same every time', () => {
  assert.equal(rows.length, org.at(-1).people);
  const again = peopleTable({ org, campaigns: CAMPAIGNS });
  assert.deepEqual(again.rows.slice(0, 5).map((x) => [x.name, x.level]), rows.slice(0, 5).map((x) => [x.name, x.level]));
  assert.equal(months.length, 6);
});

test('every department has exactly the organisation\'s people at each level, every month', () => {
  org.slice(-6).forEach((step, k) => step.departments.forEach((d) => {
    const got = levelsByMonth(rows, months, d.name)[k];
    assert.deepEqual([got.Low, got.Moderate, got.High, got.Critical], [d.tiers.low, d.tiers.moderate, d.tiers.high, d.tiers.critical], `${d.name}, month ${k}`);
  }));
});

test('each person\'s record gives their level', () => {
  const rule = {
    Low: (x) => x.clicked === 0 && x.reported > 0,
    Moderate: (x) => x.gave === 0 && (x.clicked === 1 || (x.clicked === 0 && x.reported === 0)),
    High: (x) => x.gave === 0 && x.clicked >= 2,
    Critical: (x) => x.gave > 0,
  };
  rows.forEach((x) => {
    assert.ok(LEVELS.includes(x.level) && STEPS.includes(x.step));
    assert.ok(rule[x.level](x), `${x.name}: ${x.level}`);
    assert.ok(x.clicked + x.reported <= x.emails && x.gave <= x.clicked);
  });
});

test('the Risk Score is everyone\'s level averaged on 0 to 100', () => {
  const d = org.at(-1).departments[0];
  const mine = rows.filter((x) => x.department === d.name);
  const score = (mine.reduce((a, x) => a + { Low: 0, Moderate: 1, High: 2, Critical: 3 }[x.level], 0) / mine.length / 3) * 100;
  assert.ok(Math.abs(score - riskScore(d.tiers)) < 1e-9);
});

test('a month\'s column opens exactly the people it counts', () => {
  const dept = org.at(-1).departments[2].name;
  const byMonth = levelsByMonth(rows, months, dept);
  byMonth.forEach((m, k) => {
    const list = peopleFor(rows, { department: [dept], levels: ['High', 'Critical'], month: k });
    assert.equal(list.length, m.high);
    assert.ok(list.every((x) => x.level === 'High' || x.level === 'Critical'));
  });
});

test('a reason opens the people it applies to', () => {
  const dept = rows[0].department;
  DRIVERS.forEach((dr) => {
    const want = rows.filter((x) => x.department === dept && x.drivers[dr.key]).length;
    assert.equal(peopleFor(rows, { department: dept, driver: dr.key }).length, want);
  });
});

test('a campaign type: the clicks are counted over its campaigns only', () => {
  const list = peopleFor(rows, { campaignType: 'Credential theft', did: 'clicked' }, { types });
  assert.ok(list.length > 0);
  list.forEach((x) => {
    const mine = rows[x.id].records.filter((r) => types[r.campaign] === 'Credential theft');
    assert.equal(x.clicked, mine.reduce((a, r) => a + r.clicked, 0));
    assert.ok(x.clicked > 0);
  });
  // the same as choosing every campaign of that type
  const camps = CAMPAIGNS.filter((c) => c.type === 'Credential theft').map((c) => c.name);
  assert.equal(peopleFor(rows, { campaign: camps, did: 'clicked' }).length, list.length);
});

test('filters take a list of choices', () => {
  const two = [rows[0].department, rows.at(-1).department];
  const list = peopleFor(rows, { department: two, level: ['High', 'Critical'] });
  assert.ok(list.every((x) => two.includes(x.department) && ['High', 'Critical'].includes(x.level)));
  assert.equal(list.length, rows.filter((x) => two.includes(x.department) && ['High', 'Critical'].includes(x.level)).length);
});

test('a training step matches everyone who got at least that far', () => {
  const started = peopleFor(rows, { step: 'Started' });
  const none = peopleFor(rows, { step: 'Not started' });
  assert.ok(peopleFor(rows, { step: 'Passed' }).length < started.length);
  assert.equal(started.length + none.length, rows.length);
});

test('most clicks first; counts and search', () => {
  const list = peopleFor(rows, {});
  for (let i = 1; i < list.length; i += 1) assert.ok(list[i - 1].clicked >= list[i].clicked);
  assert.equal(countsBy(rows, 'level').reduce((a, c) => a + c.count, 0), rows.length);
  assert.ok(countsBy(rows, 'campaign').every((c) => types[c.value]));
  assert.ok(findPeople(rows, rows[3].name.toUpperCase()).some((x) => x.id === 3));
});

test('the Excel file has one sheet with the people', () => {
  const files = unzipSync(peopleBook(rows.slice(0, 3), { title: 'At high risk' }));
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  assert.ok(sheet.includes(rows[0].name.split(' ')[0]));
  assert.ok(sheet.includes('Compromised') && sheet.includes('Risk level'));
});

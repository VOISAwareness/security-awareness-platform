import assert from 'node:assert/strict';
import test from 'node:test';
import { unzipSync, strFromU8 } from 'fflate';

import { LEVELS, STEPS, countsBy, findPeople, peopleBook, peopleFor, samplePeople } from './insightsPeople.js';

const CAMPAIGNS = ['Payroll Update', 'Mailbox Quota', 'VPN Re-authentication', 'Q4 Credential Harvest'];
const rows = samplePeople({ campaigns: CAMPAIGNS, programmes: ['Phishing Basics', 'Password Security'] });

test('the sample is the same every time and well formed', () => {
  assert.deepEqual(samplePeople({ campaigns: CAMPAIGNS }).slice(0, 5).map((x) => x.name), rows.slice(0, 5).map((x) => x.name));
  rows.forEach((x) => {
    assert.ok(x.emails >= 1 && x.emails <= 4);
    assert.ok(x.clicked + x.reported <= x.emails, 'a person cannot click and report more emails than they got');
    assert.ok(x.gave <= x.clicked, 'details are only given after a click');
    assert.ok(LEVELS.includes(x.level));
    assert.ok(STEPS.includes(x.step));
  });
});

test('filters add up: each narrows the one before', () => {
  const dept = rows[0].department;
  const inDept = peopleFor(rows, { department: dept });
  assert.ok(inDept.length > 0 && inDept.every((x) => x.department === dept));
  const clicked = peopleFor(rows, { department: dept, did: 'clicked' });
  assert.ok(clicked.length <= inDept.length && clicked.every((x) => x.clicked > 0));
  const camp = peopleFor(rows, { campaign: CAMPAIGNS[1] });
  assert.ok(camp.every((x) => x.campaigns.includes(CAMPAIGNS[1])));
  const twice = peopleFor(rows, { did: 'twice' });
  assert.ok(twice.every((x) => x.clicked > 1));
});

test('a training step matches everyone who got at least that far', () => {
  const started = peopleFor(rows, { step: 'Started' });
  const passed = peopleFor(rows, { step: 'Passed' });
  const none = peopleFor(rows, { step: 'Not started' });
  assert.ok(passed.length < started.length);
  assert.equal(started.length + none.length, rows.length);
});

test('most clicks first; counts and search', () => {
  const list = peopleFor(rows, {});
  for (let i = 1; i < list.length; i += 1) assert.ok(list[i - 1].clicked >= list[i].clicked);
  const byLevel = countsBy(rows, 'level');
  assert.equal(byLevel.reduce((a, c) => a + c.count, 0), rows.length);
  const byCampaign = countsBy(rows, 'campaign');
  assert.ok(byCampaign.every((c) => CAMPAIGNS.includes(c.value)));
  assert.ok(findPeople(rows, rows[3].name.toUpperCase()).some((x) => x.id === 3));
});

test('the Excel file has one sheet with the people', () => {
  const files = unzipSync(peopleBook(rows.slice(0, 3), { title: 'Started' }));
  const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
  assert.ok(sheet.includes(rows[0].name.split(' ')[0]));
  assert.ok(sheet.includes('Gave details'));
});

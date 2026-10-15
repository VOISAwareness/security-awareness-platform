import assert from 'node:assert/strict';
import test from 'node:test';

import { bigPicture } from './bigPicture.js';
import { DEPARTMENT_COLUMNS, PEOPLE_COLUMNS, departmentsCsv, peopleCsv, reportCsv } from './bigPictureExport.js';
import { campaignReport } from './sampleReports.js';

const DEPTS = ['Finance', 'HR', 'Cyber'];
const CAMPAIGNS = [0, 1, 2].map((k) => ({ id: `C${k}`, name: `Campaign ${k}`, type: 'IT lure', started: `${10 - k} Oct`, total: 500, seed: k + 1 }));
const ITEMS = CAMPAIGNS.map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: (i) => ({ name: `P${i}`, dept: DEPTS[i % 3] }) }) }));
const PEOPLE = Array.from({ length: 30 }, (_, i) => ({ key: `p${i}`, name: `Person ${i}`, email: `p${i}@example.com`, dept: DEPTS[i % 3], points: (i - 5) * 60 }));
const R = bigPicture(ITEMS, PEOPLE);

test('the people list: a header, then everyone, bottom first', () => {
  const lines = peopleCsv(R.people).split('\r\n');
  assert.equal(lines.length, 31);
  assert.equal(lines[0], PEOPLE_COLUMNS.map((c) => c.label).join(','));
  assert.match(lines[1], /^30,Person 0,p0@example.com,Finance,/);
  assert.match(lines[1], /,-300,/);
});

test('the departments table', () => {
  const lines = departmentsCsv(R.departments).split('\r\n');
  assert.equal(lines.length, 4);
  assert.equal(lines[0].split(',').length, DEPARTMENT_COLUMNS.length);
});

test('the whole report: every table, the people only when asked', () => {
  const without = reportCsv(R, { title: 'The organisation' });
  for (const t of ['Summary', 'Who moved', 'What catches each level', 'Departments', 'Which message lands where']) assert.ok(without.includes(t), t);
  assert.ok(!without.includes('Person 0'));
  const withPeople = reportCsv(R, { title: 'The organisation', withPeople: true });
  assert.ok(withPeople.includes('People, bottom of the board first'));
  assert.ok(withPeople.includes('Person 0'));
});

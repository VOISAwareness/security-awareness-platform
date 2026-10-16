import assert from 'node:assert/strict';
import test from 'node:test';

import { bigPicture } from './bigPicture.js';
import { strFromU8, unzipSync } from 'fflate';

import { DEPARTMENT_COLUMNS, PEOPLE_COLUMNS, departmentsBook, findingBook, peopleBook, reportBook } from './bigPictureExport.js';
import { breakdown, findings } from './bigPictureFindings.js';
import { standsOut } from './bigPictureViews.js';
import { campaignReport } from './sampleReports.js';

const DEPTS = ['Finance', 'HR', 'Cyber'];
const CAMPAIGNS = [0, 1, 2].map((k) => ({ id: `C${k}`, name: `Campaign ${k}`, type: 'IT lure', started: `${10 - k} Oct`, total: 500, seed: k + 1 }));
const ITEMS = CAMPAIGNS.map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: (i) => ({ name: `P${i}`, dept: DEPTS[i % 3] }) }) }));
const PEOPLE = Array.from({ length: 30 }, (_, i) => ({ key: `p${i}`, name: `Person ${i}`, email: `p${i}@example.com`, dept: DEPTS[i % 3], points: (i - 5) * 60 }));
const R = bigPicture(ITEMS, PEOPLE);


// A workbook's sheets by name, each as its text and numbers in order.
function read(bytes) {
  const f = Object.fromEntries(Object.entries(unzipSync(bytes)).map(([k, v]) => [k, strFromU8(v)]));
  const names = [...f['xl/workbook.xml'].matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1].replace(/&apos;/g, "'").replace(/&amp;/g, '&'));
  const sheets = Object.fromEntries(names.map((n, i) => {
    const xml = f[`xl/worksheets/sheet${i + 1}.xml`];
    const rows = [...xml.matchAll(/<row r="\d+"[^>]*>(.*?)<\/row>/g)].map((m) => [...m[1].matchAll(/<t xml:space="preserve">(.*?)<\/t>|<v>(.*?)<\/v>/g)].map((c) => (c[1] !== undefined ? c[1] : Number(c[2]))));
    return [n, { xml, rows }];
  }));
  return { names, sheets };
}
const find = (sheet, label) => sheet.rows.find((r) => r[0] === label);

test('the full report: a Summary first, one sheet per topic, People only when asked', () => {
  const without = read(reportBook(R, { title: 'The Big Picture · The organisation', scope: 'The organisation · last 30 days' }));
  assert.deepEqual(without.names, ['Summary', 'What stands out', 'Levels', 'What hooks each level', 'Departments', "How it's worked out"]);
  const withPeople = read(reportBook(R, { title: 'The Big Picture · The organisation', scope: 'The organisation · last 30 days', withPeople: true }));
  assert.deepEqual(withPeople.names, ['Summary', 'What stands out', 'Levels', 'What hooks each level', 'Departments', 'People', "How it's worked out"]);
  assert.ok(!JSON.stringify(without.sheets).includes('Person 0'), 'no names without people');
  assert.ok(JSON.stringify(withPeople.sheets.People.rows).includes('Person 0'));
});

test('the Summary reads top to bottom: the pulse, the period, the forecast, the contents', () => {
  const { sheets } = read(reportBook(R, { title: 'The Big Picture · The organisation', scope: 'The organisation · last 30 days' }));
  const s = sheets.Summary;
  assert.equal(s.rows[0][0], 'The Big Picture · The organisation');
  for (const h of ['Security Pulse · last 30 days', 'The last 30 days', 'If everyone gets one more email', 'What&apos;s in this workbook']) assert.ok(s.rows.some((r) => r[0] === h), h);
  assert.ok(['Improving', 'Steady', 'Declining'].includes(find(s, 'Verdict')[1]));
  assert.equal(find(s, 'People on the board')[1], R.basis.population);
  assert.equal(find(s, 'Took part')[1], R.basis.people);
  assert.equal(find(s, 'Moved up a level')[1], R.moved.climbed);
  assert.ok(find(s, 'Departments'), 'the contents list every sheet');
  assert.ok(!s.xml.includes('ySplit'), 'nothing frozen on the Summary');
});

test('the departments and people sheets hold one row each, with numbers as numbers', () => {
  const { sheets } = read(reportBook(R, { title: 'T', scope: 'S', withPeople: true }));
  const d = sheets.Departments.rows;
  const header = d.findIndex((r) => r[0] === 'Department');
  assert.deepEqual(d[header], DEPARTMENT_COLUMNS.map((c) => c.label));
  assert.equal(d.length - header - 1, R.departments.length);
  const p = sheets.People.rows;
  const ph = p.findIndex((r) => r[0] === 'Rank');
  assert.deepEqual(p[ph], PEOPLE_COLUMNS.map((c) => c.label));
  const first = p[ph + 1];
  assert.equal(first[0], 30, 'rank, a number');
  assert.equal(first[1], 'Person 0');
  assert.ok(first.includes(-300), 'points, a number');
  const so = standsOut(R.people[0]);
  if (so) assert.ok(first.includes(so.text), 'stands out, as the app says it');
});

test('a finding: what it is, by department, and its people only when given', () => {
  const f = findings(R).find((x) => x.link?.show);
  const b = breakdown(R, f);
  const opts = { scope: 'The organisation', chapter: 'Needs attention' };
  const withPeople = read(findingBook(f, b, b.people, opts));
  assert.deepEqual(withPeople.names, ['Finding', 'By department', 'People']);
  assert.equal(withPeople.sheets['By department'].rows.filter((r) => typeof r[1] === 'number').length, b.departments.length);
  const without = read(findingBook(f, b, null, opts));
  assert.deepEqual(without.names, ['Finding', 'By department']);
});

test('the lists on screen: one sheet each', () => {
  const people = read(peopleBook(R.people.slice(0, 5), { scope: 'The organisation', what: 'Selected people' }));
  assert.deepEqual(people.names, ['People']);
  assert.equal(people.sheets.People.rows.filter((r) => typeof r[0] === 'number').length, 5);
  const depts = read(departmentsBook(R.departments, { scope: 'The organisation' }));
  assert.deepEqual(depts.names, ['Departments']);
});

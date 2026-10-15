/**
 * What The Big Picture exports, as CSV columns: the people list, the
 * departments table, and the whole report (the findings, then every table).
 * Pure, so `node --test` can cover it; csv.js turns these into a file.
 */
import { LEVEL_BY_ID, rankName } from './levels.js';
import { GROUPS } from './bigPicture.js';
import { findings } from './bigPictureFindings.js';
import { sectionsCsv, toCsv } from './csv.js';

const levelName = (id) => rankName(LEVEL_BY_ID[id]) || '';
const rate = (v) => (v === null || v === undefined ? '' : Math.round(v * 1000) / 10); // 0.237 -> 23.7
const one = (n) => Math.round(n * 10) / 10;
const moved = (m) => (m === 'up' ? 'Climbed a level' : m === 'down' ? 'Slipped a level' : '');

export const PEOPLE_COLUMNS = Object.freeze([
  { label: 'Rank', value: (x) => x.rank },
  { label: 'Name', value: (x) => x.name },
  { label: 'Email', value: (x) => x.email },
  { label: 'Department', value: (x) => x.dept },
  { label: 'Level now', value: (x) => levelName(x.levelId) },
  { label: 'Level at start', value: (x) => levelName(x.startLevelId) },
  { label: 'Points', value: (x) => x.points },
  { label: 'Points change', value: (x) => x.change },
  { label: 'Campaigns received', value: (x) => x.campaigns },
  { label: 'Reported', value: (x) => x.reported },
  { label: 'Clicked', value: (x) => x.clicked },
  { label: 'Gave details away', value: (x) => x.gave },
  { label: 'Moved', value: (x) => moved(x.moved) },
  { label: 'Below zero', value: (x) => x.belowZero },
  { label: 'Fell below zero', value: (x) => x.fellBelowZero },
  { label: 'One report from a level up', value: (x) => x.nearUp },
  { label: 'One click from a level down', value: (x) => x.nearSlip },
  { label: 'One click from below zero', value: (x) => x.nearZero },
  { label: 'Chance of dropping a level after one more email %', value: (x) => rate(x.pDrop) },
  { label: 'Chance of moving up a level after one more email %', value: (x) => rate(x.pUp) },
]);

export const DEPARTMENT_COLUMNS = Object.freeze([
  { label: 'Department', value: (d) => d.name },
  { label: 'People', value: (d) => d.people },
  { label: 'Took part', value: (d) => d.tookPart },
  { label: 'Average points', value: (d) => d.avgPoints },
  { label: 'Points gained or lost', value: (d) => d.net },
  { label: 'Points per person', value: (d) => d.perPerson },
  { label: 'Climbed a level', value: (d) => d.climbed },
  { label: 'Slipped a level', value: (d) => d.slipped },
  { label: 'Below zero', value: (d) => d.belowZero },
  { label: 'Below zero %', value: (d) => rate(d.belowZeroShare) },
  { label: 'Fell below zero', value: (d) => d.fellBelowZero },
  { label: 'One click from below zero', value: (d) => d.nearZero },
  { label: 'One click from a level down', value: (d) => d.nearSlip },
  { label: 'One report from a level up', value: (d) => d.nearUp },
  { label: 'Report rate %', value: (d) => rate(d.reportRate) },
  { label: 'Click rate %', value: (d) => rate(d.clickRate) },
  { label: 'Gave details away', value: (d) => d.gave },
]);

export const peopleCsv = (people) => toCsv(PEOPLE_COLUMNS, people);
export const departmentsCsv = (departments) => toCsv(DEPARTMENT_COLUMNS, departments);

/** Every table of the picture in one file; the people list only when `withPeople`. */
export function reportCsv(r, { title, withPeople = false, campaign = false }) {
  const pair = [{ label: 'Measure', value: (x) => x[0] }, { label: 'Value', value: (x) => x[1] }];
  const summary = [
    ['Report', title],
    ['Campaigns', r.basis.campaigns],
    ['People', r.basis.population],
    ['Took part', r.basis.people],
    ['Climbed a level', r.moved.climbed],
    ['Slipped a level', r.moved.slipped],
    ['Fell below zero', r.moved.belowZero],
    ['Came back above zero', r.moved.backAbove],
    ['Points earned', r.points.earned],
    ['Points lost', r.points.lost],
    ['One report from a level up', r.edge.nearUp],
    ['One click from a level down', r.edge.nearSlip],
    ['One click from below zero', r.edge.nearZero],
    ['If everyone gets one more email (expected · likely range, 9 times in 10)', ''],
    ['Could drop a level', `${one(r.forecast.down.expected)} · ${r.forecast.down.low}–${r.forecast.down.high} of ${r.forecast.down.within} within reach`],
    ['Could move up a level', `${one(r.forecast.up.expected)} · ${r.forecast.up.low}–${r.forecast.up.high} of ${r.forecast.up.within} within reach`],
    ['Phish Catcher or above', `${r.forecast.strong.now} today · ${one(r.forecast.strong.expected)} expected · ${r.forecast.strong.low}–${r.forecast.strong.high}`],
    ['Average click rate % (C)', rate(r.forecast.method.clickRate)],
    ['Average report rate % (R)', rate(r.forecast.method.reportRate)],
    ['Clicks that gave details away % (G)', rate(r.forecast.method.gaveShare)],
    ['Weight of the average, in emails (K)', r.forecast.method.k],
  ];
  const sections = [
    { title: 'Summary', columns: pair, rows: summary },
    {
      title: 'What stands out',
      columns: [{ label: 'Number', value: (f) => `${f.value}${f.unit ? ` ${f.unit}` : ''}` }, { label: 'Finding', value: (f) => f.headline }, { label: 'In short', value: (f) => f.sub }, { label: 'Detail', value: (f) => f.detail }],
      rows: findings(r, { campaign }),
    },
    {
      title: 'Where everyone stands, by level',
      columns: [{ label: 'Level group', value: (g) => g.label }, { label: 'Now', value: (g) => g.now }, { label: 'At the start', value: (g) => g.before }, { label: 'Change', value: (g) => g.now - g.before }],
      rows: r.standing,
    },
    {
      title: 'Who moved, by the level people started at',
      columns: [
        { label: 'Level group', value: (g) => g.label },
        { label: 'People', value: (g) => g.people },
        { label: 'Climbed a level', value: (g) => g.climbed },
        { label: 'Slipped a level', value: (g) => g.slipped },
        { label: 'Click rate %', value: (g) => rate(g.click) },
        { label: 'Report rate %', value: (g) => rate(g.report) },
      ],
      rows: r.groups,
    },
    {
      title: 'What catches each level: click rate % by lure',
      columns: [{ label: 'Lure', value: (l) => l.type }, ...GROUPS.map((g) => ({ label: g.label, value: (l) => rate(l.cells[g.id]) })), { label: 'All levels', value: (l) => rate(l.click) }],
      rows: r.lures,
    },
    { title: 'Departments', columns: DEPARTMENT_COLUMNS, rows: r.departments },
  ];
  if (withPeople) sections.push({ title: 'People, bottom of the board first', columns: PEOPLE_COLUMNS, rows: r.people });
  return sectionsCsv(sections);
}

/** A finding's department breakdown (breakdown() in bigPictureFindings.js). */
const breakdownColumns = (b) => [
  { label: 'Department', value: (d) => d.name },
  { label: b.kind === 'count' ? 'People in this finding' : b.kind === 'rate' ? 'Report rate %' : 'Points per person', value: (d) => (b.kind === 'rate' ? rate(d.value) : d.value) },
  { label: 'People in the department', value: (d) => d.size },
  ...(b.kind === 'count' ? [{ label: 'Share of the department %', value: (d) => rate(d.share) }] : []),
];

export function breakdownCsv(b) {
  return toCsv(breakdownColumns(b), b.departments);
}

/**
 * One finding in one file: its headline, then by department, then (for
 * admins) its people, `people` being those on screen (a department, a search).
 */
export function findingCsv(f, b, people = null) {
  return sectionsCsv([
    { title: `${f.value}${f.unit ? ` ${f.unit}` : ''} ${f.headline}`, columns: [{ label: 'About this finding', value: (x) => x }], rows: [f.detail || f.sub || ''] },
    { title: 'By department', columns: breakdownColumns(b), rows: b.departments },
    ...(people ? [{ title: 'People', columns: PEOPLE_COLUMNS, rows: people }] : []),
  ]);
}

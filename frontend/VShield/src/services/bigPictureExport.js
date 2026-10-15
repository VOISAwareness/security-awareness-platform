/**
 * What The Big Picture exports, as CSV columns: the people list, the
 * departments table, and the whole report (every table, one after another).
 * Pure, so `node --test` can cover it; csv.js turns these into a file.
 */
import { LEVEL_BY_ID, rankName } from './levels.js';
import { GROUPS } from './bigPicture.js';
import { sectionsCsv, toCsv } from './csv.js';

const levelName = (id) => rankName(LEVEL_BY_ID[id]) || '';
const rate = (v) => (v === null || v === undefined ? '' : Math.round(v * 1000) / 10); // 0.237 -> 23.7
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
]);

export const DEPARTMENT_COLUMNS = Object.freeze([
  { label: 'Department', value: (d) => d.name },
  { label: 'People', value: (d) => d.people },
  { label: 'Took part', value: (d) => d.tookPart },
  { label: 'Average points', value: (d) => d.avgPoints },
  { label: 'Points gained or lost', value: (d) => d.net },
  { label: 'Climbed a level', value: (d) => d.climbed },
  { label: 'Slipped a level', value: (d) => d.slipped },
  { label: 'Below zero', value: (d) => d.belowZero },
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
export function reportCsv(r, { title, withPeople = false }) {
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
    ...(r.outlook ? [['Phish Catcher or above today', r.outlook.strongNow], ['Phish Catcher or above in 30 days at this pace', r.outlook.strongNext]] : []),
  ];
  const sections = [
    { title: 'Summary', columns: pair, rows: summary },
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
    r.messages.styles
      ? {
        title: 'Which message lands where: each team’s most-clicked style',
        columns: [{ label: 'Department', value: (t) => t.name }, { label: 'Most-clicked style', value: (t) => t.best }, { label: 'Click rate %', value: (t) => rate(t.rate) }],
        rows: r.messages.teams,
      }
      : {
        title: `Which message lands where: click rate % on this campaign's ${r.messages.style.toLowerCase()} message`,
        columns: [{ label: 'Department', value: (t) => t.name }, { label: 'Click rate %', value: (t) => rate(t.rate) }],
        rows: r.messages.teams,
      },
  ];
  if (withPeople) sections.push({ title: 'People, bottom of the board first', columns: PEOPLE_COLUMNS, rows: r.people });
  return sectionsCsv(sections);
}

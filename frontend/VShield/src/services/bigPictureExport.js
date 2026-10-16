/**
 * What The Big Picture exports, as Excel workbooks (xlsx.js writes them),
 * laid out for someone with no technical or data background:
 *
 *   reportBook      the full report, one sheet per topic: Summary, What
 *                   stands out, Levels, What hooks each level, Departments,
 *                   People (admins), How it's worked out;
 *   findingBook     one finding: what it is, by department, its people;
 *   peopleBook, departmentsBook   the list on screen.
 *
 * Every sheet opens with a title and a line on what it shows; every table
 * has plain column names (the app's own: Avg Points, Report Rate, Hook Rate)
 * and real numbers people can sort, sum and filter. Pure, so `node --test`
 * can cover it.
 */
import { LEVEL_BY_ID, rankName } from './levels.js';
import { GROUPS } from './bigPicture.js';
import { story } from './bigPictureFindings.js';
import { progress, STEADY } from './bigPictureTrend.js';
import { standsOut } from './bigPictureViews.js';
import { workbook } from './xlsx.js';

const levelName = (id) => rankName(LEVEL_BY_ID[id]) || '';
const VERDICT = { improving: 'Improving', steady: 'Steady', slipping: 'Declining' };
const CHAPTER = { wrong: 'Needs attention', right: 'Going well', next: 'What could happen next' };
const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const share = (n, of) => (of > 0 ? n / of : null);
const finding = (f) => `${f.value}${f.unit ? ` ${f.unit}` : ''}`;

export const PEOPLE_COLUMNS = Object.freeze([
  { label: 'Rank', value: (x) => x.rank, kind: 'int', width: 8 },
  { label: 'Name', value: (x) => x.name, width: 22 },
  { label: 'Email', value: (x) => x.email, width: 30 },
  { label: 'Department', value: (x) => x.dept, width: 26 },
  { label: 'Level now', value: (x) => levelName(x.levelId), width: 22 },
  { label: 'Level at the start', value: (x) => levelName(x.startLevelId), width: 22 },
  { label: 'Points', value: (x) => x.points, kind: 'int', width: 10 },
  { label: 'Change', value: (x) => x.change, kind: 'signed', width: 10 },
  { label: 'Emails received', value: (x) => x.campaigns, kind: 'int', width: 11 },
  { label: 'Reported', value: (x) => x.reported, kind: 'int', width: 10 },
  { label: 'Clicked', value: (x) => x.clicked, kind: 'int', width: 10 },
  { label: 'Gave details away', value: (x) => x.gave, kind: 'int', width: 11 },
  { label: 'Stands out', value: (x) => standsOut(x)?.text || '', width: 26 },
  { label: 'Chance of a level down after one more email', value: (x) => x.pDrop || null, kind: 'pct', width: 16 },
  { label: 'Chance of a level up after one more email', value: (x) => x.pUp || null, kind: 'pct', width: 16 },
]);

export const DEPARTMENT_COLUMNS = Object.freeze([
  { label: 'Department', value: (d) => d.name, width: 28 },
  { label: 'People', value: (d) => d.people, kind: 'int', width: 10 },
  { label: 'Took part', value: (d) => d.tookPart, kind: 'int', width: 10 },
  { label: 'Avg Points', value: (d) => d.avgPoints, kind: 'int', width: 11 },
  { label: 'Points change per person', value: (d) => d.perPerson, kind: 'signed', width: 13 },
  { label: 'Moved up a level', value: (d) => d.climbed, kind: 'int', width: 11 },
  { label: 'Moved down a level', value: (d) => d.slipped, kind: 'int', width: 11 },
  { label: 'Below zero', value: (d) => d.belowZero, kind: 'int', width: 10 },
  { label: 'Below zero %', value: (d) => d.belowZeroShare, kind: 'pct', width: 11 },
  { label: 'Report Rate', value: (d) => d.reportRate, kind: 'pct', width: 11 },
  { label: 'Hook Rate', value: (d) => d.clickRate, kind: 'pct', width: 11 },
  { label: 'Gave details away', value: (d) => d.gave, kind: 'int', width: 11 },
  { label: 'One click from a level down', value: (d) => d.nearSlip, kind: 'int', width: 13 },
  { label: 'One report from a level up', value: (d) => d.nearUp, kind: 'int', width: 13 },
]);

// The Summary's grid: Measure | Value | Share (or a range) | What it means.
// Every table on it keeps these four columns, so they line up.
const GRID = { key: 32, value: 14, third: 14, means: 84 };
const keyCell = (v) => ({ value: v, kind: 'key' });
const valueCell = (v) => (v && typeof v === 'object' ? v : { value: v, kind: typeof v === 'number' ? 'int' : 'text' });

// A table of measures: [name, value, what it means, share?].
const measures = (rows, { third = 'Share' } = {}) => ({
  table: {
    columns: [
      { label: 'Measure', value: (m) => keyCell(m[0]), width: GRID.key },
      { label: 'Value', value: (m) => valueCell(m[1]), width: GRID.value },
      { label: third, value: (m) => (typeof m[3] === 'number' ? { value: m[3], kind: 'pct' } : m[3] ?? null), width: GRID.third },
      { label: 'What it means', value: (m) => m[2] || '', width: GRID.means },
    ],
    rows,
  },
});

const head = (title, note) => [{ title }, { note }, { gap: true }];

/** The full report: one sheet per topic. `scope` names what it covers; people only when `withPeople`. */
export function reportBook(r, { title, scope, withPeople = false, campaign = null, source = 'Sample data' }) {
  const p = progress(r, { campaign: Boolean(campaign) });
  const pulse = campaign ? `Campaign Pulse · since ${campaign.started}` : 'Security Pulse · last 6 months';
  const period = campaign ? 'This campaign' : 'The last 30 days';
  const took = r.basis.people;
  const parts = story(r, { campaign: Boolean(campaign) });
  const fc = r.forecast;
  const byId = Object.fromEntries(r.groups.map((g) => [g.id, g]));

  const sheets = [];
  const contents = [];
  const add = (name, what, blocks, opts = {}) => {
    sheets.push({ name, blocks, ...opts });
    contents.push([name, what, blocks.find((b) => b.table)?.table.rows.length ?? null]);
  };

  add('What stands out', 'The findings on the overview: what needs attention, what is going well, what could happen next', [
    ...head('What stands out', `${scope} · the findings on the overview, by chapter. In the app each one opens to its departments and people.`),
    { table: {
      columns: [
        { label: 'Chapter', value: (x) => CHAPTER[x.chapter], width: 22 },
        { label: 'Number', value: (x) => finding(x.f), width: 14 },
        { label: 'Finding', value: (x) => x.f.headline, width: 46 },
        { label: 'In short', value: (x) => x.f.sub, width: 40 },
        { label: 'Detail', value: (x) => x.f.detail, width: 70 },
      ],
      rows: ['wrong', 'right', 'next'].flatMap((chapter) => parts[chapter].map((f) => ({ chapter, f }))),
      filter: true,
    } },
  ]);

  add('Levels', 'Where everyone stands, by level group, and who moved', [
    ...head('Levels', `${scope} · how many people are in each level group now and at the start, who moved up or down, and how often each group reported or was hooked.`),
    { table: {
      columns: [
        { label: 'Level group', value: (g) => g.label, width: 34 },
        { label: 'People now', value: (g) => g.now, kind: 'int', width: 11 },
        { label: 'Share now', value: (g) => g.shareNow, kind: 'pct', width: 11 },
        { label: 'At the start', value: (g) => g.before, kind: 'int', width: 11 },
        { label: 'Share at the start', value: (g) => g.shareBefore, kind: 'pct', width: 11 },
        { label: 'Change', value: (g) => g.now - g.before, kind: 'signed', width: 10 },
        { label: 'Moved up a level', value: (g) => byId[g.id]?.climbed ?? null, kind: 'int', width: 11 },
        { label: 'Moved down a level', value: (g) => byId[g.id]?.slipped ?? null, kind: 'int', width: 11 },
        { label: 'Report Rate', value: (g) => byId[g.id]?.report ?? null, kind: 'pct', width: 11 },
        { label: 'Hook Rate', value: (g) => byId[g.id]?.click ?? null, kind: 'pct', width: 11 },
      ],
      rows: (() => {
        const now = r.standing.reduce((a, g) => a + g.now, 0);
        const before = r.standing.reduce((a, g) => a + g.before, 0);
        return r.standing.map((g) => ({ ...g, shareNow: share(g.now, now), shareBefore: share(g.before, before) }));
      })(),
    } },
  ]);

  add('What hooks each level', 'The Hook Rate of each kind of lure, by level group', [
    ...head('What hooks each level', `${scope} · the share of emails of each kind that were clicked (the Hook Rate), by the level group people were in. Highest first.`),
    { table: {
      columns: [
        { label: 'Lure', value: (l) => l.type, width: 22 },
        ...GROUPS.map((g) => ({ label: g.brief, value: (l) => l.cells[g.id], kind: 'pct', width: 15 })),
        { label: 'All levels', value: (l) => l.click, kind: 'pct', width: 11 },
      ],
      rows: r.lures,
      filter: true,
    } },
  ]);

  add('Departments', 'One row per department, with its Avg Points, change, Report Rate and Hook Rate', [
    ...head('Departments', `${scope} · one row per department, the least ground gained per person first. Report Rate and Hook Rate are shares of the emails each department received.`),
    { table: { columns: DEPARTMENT_COLUMNS, rows: r.departments, filter: true } },
  ]);

  if (withPeople) {
    add('People', 'Everyone, one row each, bottom of the board first', [
      ...head('People', `${scope} · everyone, bottom of the board first. "Stands out" is the one thing that matters most about each person; the two chance columns are the formula's estimate if each gets one more email.`),
      { table: { columns: PEOPLE_COLUMNS, rows: r.people, filter: true } },
    ]);
  }

  add("How it's worked out", 'What every measure means, and how it is calculated', [
    ...head("How it's worked out", 'Every measure in this workbook, in plain words. No AI: everything is a formula on the points each person earns and loses.'),
    { table: {
      columns: [{ label: 'Term', value: (t) => ({ value: t[0], kind: 'key' }), width: 30 }, { label: 'What it means', value: (t) => t[1], width: 100 }],
      rows: [
        ['Avg Points', 'The average points per person. Reporting a phishing email earns points; clicking one, or giving details away, loses them.'],
        ['Report Points', 'The points earned per person by reporting phishing emails, over the period.'],
        ['Hook Points', 'The points lost per person to clicks and to details given away, over the period.'],
        ['Improving · Steady · Declining', `Avg Points now against the start of the period: up by ${STEADY} or more points per person is Improving, down by ${STEADY} or more is Declining, anything between is Steady.`],
        ['Report Rate', 'The share of emails received that were reported.'],
        ['Hook Rate', 'The share of emails received that were clicked.'],
        ['Level groups', GROUPS.map((g) => g.label).join(' · ')],
        ['Below zero', 'Fewer than 0 points: more lost to clicks than earned by reporting.'],
        ['One click from a level down', 'Close enough to the bottom of their level that one more click would drop them a level.'],
        ['One report from a level up', 'Close enough to the next level that one more report would lift them to it.'],
        ['Chance after one more email', "Each person's own click rate (for a level down) or report rate (for a level up), pulled toward everyone's average when their record is short."],
        ['Likely range', 'If people behave as their record says, the real number lands in this range 9 times out of 10.'],
        ['Source', source],
      ],
    } },
  ]);

  const summary = {
    name: 'Summary',
    freeze: false,
    blocks: [
      ...head(title, `Security awareness report · ${scope} · generated ${today()} · ${source}`),
      { heading: pulse },
      measures([
        ['Verdict', VERDICT[p.word], `Improving when Avg Points rose by ${STEADY} or more per person; Declining when it fell by as much; Steady in between.`],
        ['Avg Points now', Math.round(p.to), 'Average points per person today.'],
        ['Avg Points at the start', Math.round(p.from), campaign ? 'Before this campaign.' : 'Six months ago.'],
        ['Change', { value: Math.round(p.change), kind: 'signed' }, 'Points per person, now against the start.'],
        ['Report Points', { value: Math.round(p.earned), kind: 'signed' }, 'Earned per person by reporting phishing emails.'],
        ['Hook Points', { value: -Math.round(p.lost), kind: 'signed' }, 'Lost per person to clicks and details given away.'],
      ]),
      { gap: true },
      { heading: period },
      measures([
        ...(campaign ? [] : [['Campaigns', r.basis.campaigns, 'Phishing simulations sent in the period.']]),
        ['People on the board', r.basis.population, campaign ? 'Recipients of this campaign.' : 'Everyone ranked on the leaderboard.'],
        ['Took part', took, 'Received at least one simulation in the period.', share(took, r.basis.population)],
        ['Moved up a level', r.moved.climbed, 'Share of those who took part.', share(r.moved.climbed, took)],
        ['Moved down a level', r.moved.slipped, 'Share of those who took part.', share(r.moved.slipped, took)],
        ['Fell below zero', r.moved.belowZero, 'Share of those who took part.', share(r.moved.belowZero, took)],
        ['Came back above zero', r.moved.backAbove, 'Share of those who took part.', share(r.moved.backAbove, took)],
        ['Points earned', r.points.earned, 'By reporting, everyone together.'],
        ['Points lost', r.points.lost, 'To clicks and details given away, everyone together.'],
      ]),
      { gap: true },
      { heading: 'If everyone gets one more email' },
      measures([
        ['Could drop a level', { value: fc.down.expected, kind: 'dec' }, `Expected, of the ${fc.down.within} people one click (or a click with details) from the bottom of their level.`, `${fc.down.low} to ${fc.down.high}`],
        ['Could move up a level', { value: fc.up.expected, kind: 'dec' }, `Expected, of the ${fc.up.within} people one report from the next level.`, `${fc.up.low} to ${fc.up.high}`],
        ['Phish Catcher or above', { value: fc.strong.expected, kind: 'dec' }, `Expected; ${fc.strong.now} today.`, `${fc.strong.low} to ${fc.strong.high}`],
      ], { third: 'Likely range' }),
      { note: 'Likely range: if people behave as their record says, the real number lands in it 9 times out of 10.' },
      { gap: true },
      { heading: "What's in this workbook" },
      { table: { columns: [{ label: 'Sheet', value: (c) => keyCell(c[0]), width: GRID.key }, { label: 'Rows', value: (c) => c[2], kind: 'int', width: GRID.value }, { label: 'What it shows', value: (c) => c[1], span: 2 }], rows: contents } },
    ],
  };
  return workbook({ title, sheets: [summary, ...sheets] });
}

/** A finding's department column, by what it counts. */
const breakdownColumns = (b) => [
  { label: 'Department', value: (d) => d.name, width: 28 },
  ...(b.kind === 'count'
    ? [{ label: 'People in this finding', value: (d) => d.value, kind: 'int', width: 13 }, { label: 'Share of the department', value: (d) => d.share, kind: 'pct', width: 13 }]
    : [{ label: b.kind === 'rate' ? 'Report Rate' : 'Points change per person', value: (d) => d.value, kind: b.kind === 'rate' ? 'pct' : 'signed', width: 14 }]),
  { label: 'People in the department', value: (d) => d.size, kind: 'int', width: 13 },
];

/** One finding: what it is, by department, and (for admins) its people, those on screen. */
export function findingBook(f, b, people = null, { scope, chapter, dept = null }) {
  const name = finding(f);
  const sheets = [
    {
      name: 'Finding',
      freeze: false,
      blocks: [
        ...head(f.unit ? `${f.headline} (${name})` : `${name} ${f.headline}`, `${scope} · ${chapter} · generated ${today()}`),
        measures([
          ['Chapter', chapter],
          ['Finding', f.unit ? `${f.headline}: ${name}` : `${name} ${f.headline}`],
          ['In short', f.sub],
          ['Detail', f.detail],
          ...(people ? [['People in this file', people.length, dept ? `In ${dept}.` : 'Everyone in this finding.']] : []),
          ['Departments', b.departments.length],
        ]),
      ],
    },
    { name: 'By department', blocks: [...head('By department', `${name} ${f.headline} · each department, highest first.`), { table: { columns: breakdownColumns(b), rows: b.departments, filter: true } }] },
    ...(people ? [{ name: 'People', blocks: [...head('People', `${dept ? `${dept} · ` : ''}${people.length} ${people.length === 1 ? 'person' : 'people'} in this finding.`), { table: { columns: PEOPLE_COLUMNS, rows: people, filter: true } }] }] : []),
  ];
  return workbook({ title: `${name} ${f.headline}`, sheets });
}

/** The people on screen, in one sheet. */
export function peopleBook(people, { scope, what = 'Everyone' }) {
  return workbook({ title: `People · ${scope}`, sheets: [{ name: 'People', blocks: [...head(`People · ${scope}`, `${what} · ${people.length} ${people.length === 1 ? 'person' : 'people'} · generated ${today()}`), { table: { columns: PEOPLE_COLUMNS, rows: people, filter: true } }] }] });
}

/** The departments on screen, in one sheet. */
export function departmentsBook(departments, { scope, what = 'All departments' }) {
  return workbook({ title: `Departments · ${scope}`, sheets: [{ name: 'Departments', blocks: [...head(`Departments · ${scope}`, `${what} · ${departments.length} · generated ${today()}`), { table: { columns: DEPARTMENT_COLUMNS, rows: departments, filter: true } }] }] });
}

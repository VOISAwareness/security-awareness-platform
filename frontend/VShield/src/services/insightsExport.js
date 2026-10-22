/**
 * What Insights exports: the full report as an Excel workbook (xlsx.js
 * writes it), and a short summary to paste. Laid out as The Big Picture's
 * report is: every sheet opens with a title and a line on what it shows,
 * every table has plain column names and real numbers people can sort, sum
 * and filter. Pure, so `node --test` can cover it.
 */
import { workbook } from './xlsx.js';

const head = (title, note) => [{ title }, { note }, { gap: true }];

// The programme's measures, each with how it is worked out; `kind` formats it.
const MEASURES = [
  ['Campaigns', 'campaigns', 'int', 'Campaigns started in the period'],
  ['Emails delivered', 'delivered', 'int', 'Emails that reached an inbox'],
  ['Hook Rate', 'hooked', 'pct', 'Clicked, of the emails delivered'],
  ['Report Rate', 'reportRate', 'pct', 'Reported, of the emails delivered'],
  ['Reports per click', 'perClick', 'dec', 'Emails reported for every email clicked'],
  ['Gave details', 'gaveOfClicks', 'pct', 'Of those who clicked, how many went on to enter details'],
  ['First report (minutes)', 'firstReport', 'dec', 'Minutes from the send to the first report, in the middle campaign'],
  ['Half the reports in (minutes)', 'halfReported', 'dec', 'Minutes until half the reports were in, in the middle campaign'],
  ['Reported before a click', 'beatClick', 'int', 'Campaigns whose first report came before anyone clicked'],
  ['Learning moments', 'learned', 'pct', 'Of those who clicked, finished the training that followed'],
];

/**
 * The full report. `m` is insights() output, `list` standsOut()'s,
 * `training` the training figures ({ funnel: [{ name, value }], programmes }).
 */
export function insightsBook(m, list, training, { title = 'Insights', source = 'Sample data' } = {}) {
  const days = m.basis.days;
  const scope = `The programme · last ${days} days · ${m.basis.campaigns} campaigns`;
  const cell = (s, key, kind) => (s && s[key] !== null && s[key] !== undefined ? { value: s[key], kind } : '—');
  const sheets = [
    { name: 'Summary', blocks: [
      ...head(title, `${scope} · ${source}. Programme health: ${m.now.health?.word ?? '—'} (Protected: 2 or more reports for every click; Holding: at least 1; Exposed: fewer reports than clicks).`),
      { table: {
        columns: [
          { label: 'Measure', value: (x) => x[0], width: 30 },
          { label: `Last ${days} days`, value: (x) => cell(m.now, x[1], x[2]), width: 14 },
          { label: `The ${days} days before`, value: (x) => cell(m.before, x[1], x[2]), width: 16 },
          { label: 'How it is worked out', value: (x) => x[3], width: 64 },
        ],
        rows: MEASURES,
      } },
    ] },
    { name: 'What stands out', blocks: [
      ...head('What stands out', `${scope} · each opens its part of the page.`),
      { table: {
        columns: [{ label: 'Number', value: (f) => f.chip, width: 16 }, { label: 'Finding', value: (f) => f.title, width: 60 }, { label: 'In short', value: (f) => f.sub, width: 50 }],
        rows: list,
      } },
    ] },
    { name: 'Lures', blocks: [
      ...head('The lures', `${scope} · each kind of lure, the most convincing first.`),
      { table: {
        columns: [
          { label: 'Lure', value: (l) => l.type, width: 22 },
          { label: 'Campaigns', value: (l) => l.campaigns, kind: 'int', width: 11 },
          { label: 'Delivered', value: (l) => l.delivered, kind: 'int', width: 11 },
          { label: 'Hook Rate', value: (l) => l.hooked, kind: 'pct', width: 11 },
          { label: 'Gave details, of clicks', value: (l) => l.gaveOfClicks, kind: 'pct', width: 14 },
          { label: 'Report Rate', value: (l) => l.reportRate, kind: 'pct', width: 11 },
          { label: 'Reports per click', value: (l) => l.perClick, kind: 'dec', width: 12 },
          { label: 'Learning moments', value: (l) => l.learned, kind: 'pct', width: 12 },
          { label: 'Health', value: (l) => l.health?.word ?? '', width: 11 },
        ],
        rows: m.lures,
        filter: true,
      } },
    ] },
    { name: 'Campaigns', blocks: [
      ...head('Campaign by campaign', `${scope} · newest first: how fast each was spotted, and how it went.`),
      { table: {
        columns: [
          { label: 'Campaign', value: (c) => c.name, width: 36 },
          { label: 'Lure', value: (c) => c.type, width: 18 },
          { label: 'Started', value: (c) => c.started, width: 10 },
          { label: 'Delivered', value: (c) => c.delivered, kind: 'int', width: 11 },
          { label: 'First click (min)', value: (c) => c.firstClick, kind: 'int', width: 12 },
          { label: 'First report (min)', value: (c) => c.firstReport, kind: 'int', width: 12 },
          { label: 'Half reported (min)', value: (c) => c.medianReport, kind: 'int', width: 12 },
          { label: 'Reported first', value: (c) => (c.beatClick ? 'Yes' : 'No'), width: 11 },
          { label: 'Hook Rate', value: (c) => c.hooked, kind: 'pct', width: 11 },
          { label: 'Reports per click', value: (c) => c.perClick, kind: 'dec', width: 12 },
          { label: 'Learning moments', value: (c) => c.learned, kind: 'pct', width: 12 },
          { label: 'Health', value: (c) => c.health?.word ?? '', width: 11 },
        ],
        rows: m.campaigns,
        filter: true,
      } },
    ] },
    { name: 'Fortnight by fortnight', blocks: [
      ...head('Fortnight by fortnight', 'Reports for every click, each fortnight of the last 26 weeks, the newest last.'),
      { table: {
        columns: [
          { label: 'Fortnight to', value: (w) => new Date(w.to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }), width: 12 },
          { label: 'Campaigns', value: (w) => w.campaigns, kind: 'int', width: 11 },
          { label: 'Reports per click', value: (w) => (w.perClick === null ? '—' : { value: w.perClick, kind: 'dec' }), width: 14 },
          { label: `In the last ${days} days`, value: (w) => (w.inPeriod ? 'Yes' : ''), width: 16 },
        ],
        rows: m.trend,
      } },
    ] },
  ];
  if (training) {
    const first = training.funnel[0]?.value || 0;
    sheets.push({ name: 'Training', blocks: [
      ...head('The training', 'All assigned training, from the start of the programme.'),
      { table: {
        columns: [{ label: 'Step', value: (x) => x.name, width: 18 }, { label: 'People', value: (x) => x.value, kind: 'int', width: 11 }, { label: 'Of assigned', value: (x) => (first ? x.value / first : null), kind: 'pct', width: 12 }],
        rows: training.funnel,
      } },
      { gap: true },
      { heading: 'Programmes' },
      { table: {
        columns: [
          { label: 'Programme', value: (x) => x.program, width: 34 },
          { label: 'Completion', value: (x) => x.completion / 100, kind: 'pct', width: 12 },
          { label: 'Pass rate', value: (x) => x.pass / 100, kind: 'pct', width: 11 },
          { label: 'Average score', value: (x) => x.score, kind: 'int', width: 12 },
          { label: 'Status', value: (x) => x.status, width: 12 },
        ],
        rows: training.programmes,
      } },
    ] });
  }
  return workbook({ title, sheets });
}

/** The picture as plain text, for "Copy a summary". */
export function insightsSummary(m, list, title = 'Insights') {
  const n = m.now;
  const per = n.perClick === null ? '—' : n.perClick.toFixed(1);
  const pc = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);
  return [
    `${title} · last ${m.basis.days} days`,
    `${n.campaigns} campaigns, ${n.delivered.toLocaleString('en-US')} emails delivered. Programme health: ${(n.health?.word ?? '—').toLowerCase()}, ${per} reports for every click.`,
    `Hook Rate ${pc(n.hooked)}, Report Rate ${pc(n.reportRate)}, first report after ${n.firstReport ?? '—'} min, learning moments ${pc(n.learned)}.`,
    '',
    'What stands out:',
    ...list.map((f) => `- ${f.title}: ${f.sub} (${f.chip}).`),
  ].join('\n');
}

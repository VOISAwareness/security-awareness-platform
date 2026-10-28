/**
 * What Insights exports: the full report as an Excel workbook (xlsx.js
 * writes it), and a short summary to paste. Laid out as The Big Picture's
 * report is: every sheet opens with a title and a line on what it shows,
 * every table has plain column names and real numbers people can sort, sum
 * and filter. Pure, so `node --test` can cover it.
 */
import { GLOSSARY, HEALTH_RULE, TYPE_WORD, healthWord } from './glossary.js';
import { workbook } from './xlsx.js';

const head = (title, note) => [{ title }, { note }, { gap: true }];

// The programme's measures, each with how it is worked out (the glossary's
// words where it has them); `kind` formats it.
const MEASURES = [
  ['Campaigns', 'campaigns', 'int', 'Campaigns started in the period'],
  ['Emails delivered', 'delivered', 'int', 'Emails that reached an inbox'],
  [GLOSSARY.hookRate.name, 'hooked', 'pct', GLOSSARY.hookRate.how],
  [GLOSSARY.reportRate.name, 'reportRate', 'pct', GLOSSARY.reportRate.how],
  [GLOSSARY.perClick.name, 'perClick', 'dec', GLOSSARY.perClick.how],
  ['Of those who clicked, gave details away', 'gaveOfClicks', 'pct', 'Of those who clicked, how many went on to enter details on the practice page (not the share of emails delivered)'],
  ['First report (minutes)', 'firstReport', 'dec', 'Minutes from the send to the first report, in the middle campaign'],
  ['Half the reports in (minutes)', 'halfReported', 'dec', 'Minutes until half the reports were in, in the middle campaign'],
  ['Reported before a click', 'beatClick', 'int', 'Campaigns whose first report came before anyone clicked'],
  ['Learning moments', 'learned', 'pct', 'Of those who clicked, finished the training that followed'],
];

/**
 * The full report. `m` is insights() output, `list` standsOut()'s (what changed),
 * `p` peopleInsights() output (or null), `training` the training programmes
 * ({ programmes }) or null.
 */
export function insightsBook(m, list, training, { title = 'Insights', source = 'Sample data', p = null } = {}) {
  const days = m.basis.days;
  const scope = `The programme · last ${days} days · ${m.basis.campaigns} campaigns`;
  const cell = (s, key, kind) => (s && s[key] !== null && s[key] !== undefined ? { value: s[key], kind } : '—');
  const sheets = [
    { name: 'Summary', blocks: [
      ...head(title, `${scope} · ${source}. Programme health: ${m.now.health ? healthWord(m.now.health.word) : '—'} (${HEALTH_RULE}).`),
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
    { name: 'What changed', blocks: [
      ...head('What changed', `${scope} · each measure before and after: the Risk Score, people and training at the start of the period against now; the campaigns against the ${days} days before.`),
      { table: {
        columns: [{ label: 'Change', value: (f) => f.chip, width: 16 }, { label: 'Measure', value: (f) => f.title, width: 30 }, { label: 'Before → after', value: (f) => f.sub, width: 50 }],
        rows: list,
      } },
    ] },
    { name: 'Campaign types', blocks: [
      ...head('The campaign types', `${scope} · each campaign type, the most convincing first.`),
      { table: {
        columns: [
          { label: TYPE_WORD, value: (l) => l.type, width: 22 },
          { label: 'Campaigns', value: (l) => l.campaigns, kind: 'int', width: 11 },
          { label: 'Delivered', value: (l) => l.delivered, kind: 'int', width: 11 },
          { label: 'Hook Rate', value: (l) => l.hooked, kind: 'pct', width: 11 },
          { label: 'Of those who clicked, gave details away', value: (l) => l.gaveOfClicks, kind: 'pct', width: 18 },
          { label: 'Report Rate', value: (l) => l.reportRate, kind: 'pct', width: 11 },
          { label: GLOSSARY.perClick.name, value: (l) => l.perClick, kind: 'dec', width: 12 },
          { label: 'Learning moments', value: (l) => l.learned, kind: 'pct', width: 12 },
          { label: 'Health', value: (l) => (l.health ? healthWord(l.health.word) : ''), width: 13 },
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
          { label: TYPE_WORD, value: (c) => c.type, width: 18 },
          { label: 'Started', value: (c) => c.started, width: 10 },
          { label: 'Delivered', value: (c) => c.delivered, kind: 'int', width: 11 },
          { label: 'First click (min)', value: (c) => c.firstClick, kind: 'int', width: 12 },
          { label: 'First report (min)', value: (c) => c.firstReport, kind: 'int', width: 12 },
          { label: 'Half reported (min)', value: (c) => c.medianReport, kind: 'int', width: 12 },
          { label: 'Reported first', value: (c) => (c.beatClick ? 'Yes' : 'No'), width: 11 },
          { label: 'Hook Rate', value: (c) => c.hooked, kind: 'pct', width: 11 },
          { label: GLOSSARY.perClick.name, value: (c) => c.perClick, kind: 'dec', width: 12 },
          { label: 'Learning moments', value: (c) => c.learned, kind: 'pct', width: 12 },
          { label: 'Health', value: (c) => (c.health ? healthWord(c.health.word) : ''), width: 13 },
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
          { label: GLOSSARY.perClick.name, value: (w) => (w.perClick === null ? '—' : { value: w.perClick, kind: 'dec' }), width: 14 },
          { label: `In the last ${days} days`, value: (w) => (w.inPeriod ? 'Yes' : ''), width: 16 },
        ],
        rows: m.trend,
      } },
    ] },
  ];
  sheets.push({ name: 'Month by month', blocks: [
    ...head('Month by month', 'Opened, clicked and reported, thirty days at a time over the last six, the newest last.'),
    { table: {
      columns: [
        { label: 'Thirty days to', value: (x) => new Date(x.to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }), width: 14 },
        { label: 'Campaigns', value: (x) => x.campaigns, kind: 'int', width: 11 },
        { label: 'Open Rate', value: (x) => cell(x, 'openRate', 'pct'), width: 11 },
        { label: 'Hook Rate', value: (x) => cell(x, 'hooked', 'pct'), width: 11 },
        { label: 'Report Rate', value: (x) => cell(x, 'reportRate', 'pct'), width: 11 },
      ],
      rows: m.months,
    } },
    { gap: true },
    { heading: 'Motivators' },
    { table: {
      columns: [
        { label: 'Motivator', value: (x) => x.motivator, width: 14 },
        { label: 'Campaigns', value: (x) => x.campaigns, kind: 'int', width: 11 },
        { label: 'Hook Rate', value: (x) => x.hooked, kind: 'pct', width: 11 },
        { label: 'Report Rate', value: (x) => x.reportRate, kind: 'pct', width: 11 },
      ],
      rows: m.motivators,
    } },
  ] });
  if (p) {
    const tierName = { low: 'Low', moderate: 'Moderate', high: 'High', critical: 'Critical' };
    sheets.push({ name: 'People and risk', blocks: [
      ...head('People and risk', `${scope} · each person's risk level from their phishing record (low: reported and never clicked; moderate: clicked once or never reported; high: clicked more than once; critical: gave details away). The ${GLOSSARY.riskScore.name} is everyone's level on 0 to 100, averaged.`),
      { table: {
        columns: [
          { label: 'Risk level', value: (t) => tierName[t], width: 14 },
          { label: 'People now', value: (t) => p.now.tiers[t], kind: 'int', width: 12 },
          { label: 'Share now', value: (t) => p.now.tiers[t] / p.now.people, kind: 'pct', width: 11 },
          { label: 'At the start', value: (t) => (p.before ? p.before.tiers[t] : '—'), kind: 'int', width: 12 },
        ],
        rows: p.tiers,
      } },
      { gap: true },
      { heading: 'What drives the risk' },
      { table: {
        columns: [{ label: 'Driver', value: (x) => x[0], width: 28 }, { label: 'People', value: (x) => p.now.drivers[x[1]], kind: 'int', width: 11 }, { label: 'At the start', value: (x) => (p.before ? p.before.drivers[x[1]] : '—'), kind: 'int', width: 12 }],
        rows: [['Repeat clickers', 'repeatClickers'], ['Never reported', 'neverReported'], ['Overdue training', 'overdueTraining'], ['Failed the quiz again', 'quizFailures']],
      } },
      { gap: true },
      { heading: `${GLOSSARY.riskScore.name}, thirty days at a time` },
      { table: {
        columns: [
          { label: 'Thirty days to', value: (x) => new Date(x.to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }), width: 14 },
          { label: GLOSSARY.riskScore.name, value: (x) => x.score, kind: 'dec', width: 11 },
          { label: GLOSSARY.highRisk.name, value: (x) => x.highRisk, kind: 'int', width: 14 },
        ],
        rows: p.trend,
      } },
    ] });
    sheets.push({ name: 'Departments', blocks: [
      ...head('Departments', `${scope} · the riskiest first: risk, clicks and reports in the period's campaigns, and training.`),
      { table: {
        columns: [
          { label: 'Department', value: (d) => d.name, width: 28 },
          { label: 'People', value: (d) => d.people, kind: 'int', width: 10 },
          { label: GLOSSARY.riskScore.name, value: (d) => d.score, kind: 'dec', width: 11 },
          { label: 'At the start', value: (d) => (d.scoreBefore === null ? '—' : { value: d.scoreBefore, kind: 'dec' }), width: 12 },
          { label: GLOSSARY.highRisk.name, value: (d) => d.highRisk, kind: 'int', width: 14 },
          { label: 'Hook Rate', value: (d) => cell(m.departments.find((x) => x.name === d.name), 'clickRate', 'pct'), width: 11 },
          { label: 'Report Rate', value: (d) => cell(m.departments.find((x) => x.name === d.name), 'reportRate', 'pct'), width: 11 },
          { label: 'Training completed', value: (d) => cell(d.training, 'completion', 'pct'), width: 14 },
          { label: 'Quiz score', value: (d) => cell(d.training, 'quizScore', 'dec'), width: 11 },
          { label: 'Badges', value: (d) => d.training.badges, kind: 'int', width: 10 },
          { label: 'Points', value: (d) => d.training.points, kind: 'int', width: 11 },
        ],
        rows: p.departments,
        filter: true,
      } },
    ] });
  }
  if (training || p) {
    const t = p?.now.training;
    sheets.push({ name: 'Training', blocks: [
      ...head('The training', `${scope} · training assigned and taken in the period.`),
      ...(t ? [{ table: {
        columns: [{ label: 'Step', value: (x) => x[0], width: 18 }, { label: 'People', value: (x) => x[1], kind: 'int', width: 11 }, { label: 'Of assigned', value: (x) => (t.assigned ? x[1] / t.assigned : null), kind: 'pct', width: 12 }],
        rows: [['Assigned', t.assigned], ['Started', t.started], ['Completed', t.completed], ['Passed', t.passed]],
      } }, { gap: true }] : []),
      ...(training ? [{ heading: 'Programmes' },
      { table: {
        columns: [
          { label: 'Programme', value: (x) => x.program, width: 34 },
          { label: 'Completion', value: (x) => x.completion / 100, kind: 'pct', width: 12 },
          { label: 'Pass rate', value: (x) => x.pass / 100, kind: 'pct', width: 11 },
          { label: 'Average score', value: (x) => x.score, kind: 'int', width: 12 },
          { label: 'Status', value: (x) => x.status, width: 12 },
        ],
        rows: training.programmes,
      } }] : []),
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
    `${n.campaigns} campaigns, ${n.delivered.toLocaleString('en-US')} emails delivered. Programme health: ${n.health ? healthWord(n.health.word).toLowerCase() : '—'}, ${GLOSSARY.perClick.name} ${per}×.`,
    `Hook Rate ${pc(n.hooked)}, Report Rate ${pc(n.reportRate)}, first report after ${n.firstReport ?? '—'} min, learning moments ${pc(n.learned)}.`,
    '',
    'What changed:',
    ...list.map((f) => `- ${f.title}: ${f.sub} (${f.chip}).`),
  ].join('\n');
}

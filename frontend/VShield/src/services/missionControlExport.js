/**
 * What Mission Control exports: the full report as an Excel workbook
 * (xlsx.js writes it), and a short summary to paste. Laid out as The Big
 * Picture's report is: every sheet opens with a title and a line on what it
 * shows, every table has plain column names and real numbers people can
 * sort, sum and filter. Pure, so `node --test` can cover it.
 */
import { workbook } from './xlsx.js';

const head = (title, note) => [{ title }, { note }, { gap: true }];
const finding = (f) => `${f.value}${f.unit ? ` ${f.unit}` : ''}`;
const CHAPTER = { lures: 'The lures', response: 'The response', learning: 'The learning' };

/**
 * The full report. `m` is missionControl() output, `s` missionStory()'s,
 * `training` the training figures ({ funnel: [{ name, value }], programmes }).
 */
export function missionBook(m, s, training, { title = 'Mission Control', source = 'Sample data' } = {}) {
  const p = m.pulse;
  const scope = `The programme · last ${m.basis.days} days · ${m.basis.campaigns} campaigns`;
  const sheets = [
    { name: 'Summary', blocks: [
      ...head(title, `${scope} · ${source}.`),
      { table: {
        columns: [{ label: 'Measure', value: (x) => x[0], width: 34 }, { label: 'Value', value: (x) => x[1], width: 16 }, { label: 'What it is', value: (x) => x[2], width: 70 }],
        rows: [
          ['Programme health', p.health?.word ?? '—', 'Protected: 2 or more reports for every click; Holding: at least 1; Exposed: fewer reports than clicks'],
          ['Reports per click', { value: p.perClick, kind: 'dec' }, 'Emails reported for every email clicked'],
          ['Campaigns', { value: p.campaigns, kind: 'int' }, 'Campaigns started in the period'],
          ['Emails sent', { value: p.sent, kind: 'int' }, 'Across those campaigns'],
          ['Delivered', { value: p.deliveryRate, kind: 'pct' }, `${p.delivered.toLocaleString('en-US')} emails reached an inbox`],
          ['First report (minutes)', { value: p.firstReport, kind: 'int' }, 'Minutes from the send to the first report, in the middle campaign'],
          ['Half reported (minutes)', { value: p.halfReported, kind: 'int' }, 'Minutes until half the reports were in, in the middle campaign'],
          ['Reported before a click', { value: p.beatClick, kind: 'int' }, 'Campaigns whose first report came before anyone clicked'],
          ['Learning moments', { value: p.learned, kind: 'pct' }, 'Of those who clicked, finished the training that followed'],
        ],
      } },
    ] },
    { name: 'What stands out', blocks: [
      ...head('What stands out', `${scope} · the findings on the overview, by chapter.`),
      { table: {
        columns: [
          { label: 'Chapter', value: (x) => CHAPTER[x.chapter], width: 18 },
          { label: 'Number', value: (x) => finding(x.f), width: 12 },
          { label: 'Finding', value: (x) => x.f.headline, width: 52 },
          { label: 'In short', value: (x) => x.f.sub, width: 40 },
        ],
        rows: ['lures', 'response', 'learning'].flatMap((chapter) => s[chapter].map((f) => ({ chapter, f }))),
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
          { label: 'Health', value: (c) => c.health?.word ?? '', width: 11 },
        ],
        rows: m.response,
        filter: true,
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
export function missionSummary(m, s, title = 'Mission Control') {
  const p = m.pulse;
  const per = p.perClick === null ? '—' : p.perClick.toFixed(1);
  return [
    `${title} · last ${m.basis.days} days`,
    `${p.campaigns} campaigns, ${p.delivered.toLocaleString('en-US')} emails delivered. Programme health: ${(p.health?.word ?? '—').toLowerCase()}, ${per} reports for every click.`,
    '',
    ...['lures', 'response', 'learning'].flatMap((c) => [`${CHAPTER[c]}:`, ...s[c].map((f) => `- ${finding(f)} ${f.headline} (${f.sub}).`)]),
  ].join('\n');
}

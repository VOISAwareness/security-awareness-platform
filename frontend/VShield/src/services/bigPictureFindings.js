/**
 * The Big Picture's story: what the leaderboard shows, told in three parts.
 *
 *   wrong - needs attention: below zero, gave details away, the team that
 *           lost the most ground, slipped, never reported, the lure that
 *           still catches strong people;
 *   right - going well: the team that gained the most ground, people who
 *           reached Phish Catcher or above, the best-reporting team, people
 *           back above zero;
 *   next  - what could happen next: who is one click from a level down or
 *           below zero, one report from a level up, and where the board is
 *           heading at this pace.
 *
 * Each part keeps its three strongest findings. A finding is { id, tone,
 * value, unit, headline, detail, link }: `value` leads the line, `link`
 * ({ show, dept }) opens the people (or department) behind it, or is null.
 * It reports; it never says what to do.
 */
import { PEOPLE_FILTERS } from './bigPicture.js';

const num = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;
const pc = (v) => `${Math.round((v || 0) * 100)}%`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pick = (id) => PEOPLE_FILTERS.find((f) => f.id === id).test;
const are = (n) => (n === 1 ? 'is' : 'are');
const GROUP_PEOPLE = {
  top: 'Security Defenders or Cyber Guardians',
  strong: 'Phish Catchers or Security Champions',
  learning: 'Aware Users or Safe Handlers',
  low: 'New Joiners or below zero',
};
// "Business lure" -> "business lures"; "Credential theft" -> "credential theft emails"
const lureName = (type) => (/ lure$/i.test(type) ? `${type.toLowerCase()}s` : `${type.toLowerCase()} emails`).replace(/^(it|hr) /, (m) => m.toUpperCase());

/** Where a list of people sits: "2 in CARE and 1 in HR", "all in CARE", "3 in CARE, 2 in HR and 4 more departments". */
export function whereThey(list, shown = 2) {
  const by = {};
  list.forEach((x) => { by[x.dept] = (by[x.dept] || 0) + 1; });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!top.length) return '';
  if (top.length === 1) return `all in ${top[0][0]}`;
  const parts = top.slice(0, shown).map(([d, n]) => `${n} in ${d}`);
  const rest = top.length - shown;
  return rest > 0 ? `${parts.join(', ')} and ${rest} more department${rest === 1 ? '' : 's'}` : parts.join(' and ');
}

const mostIn = (list) => {
  const by = {};
  list.forEach((x) => { by[x.dept] = (by[x.dept] || 0) + 1; });
  const [d, n] = Object.entries(by).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || [];
  return d ? `most in ${d} (${n})` : '';
};

const clean = (f) => ({ id: f.id, tone: f.tone, value: f.value, unit: f.unit || '', headline: f.headline, detail: f.detail, link: f.link ?? null });
const top3 = (list) => list.sort((a, b) => b.weight - a.weight).slice(0, 3).map(clean);

export function story(r, { campaign = false } = {}) {
  const when = campaign ? 'in this campaign' : 'in the last 30 days';
  const P = r.people;
  const wrong = [];
  const right = [];
  const next = [];

  // needs attention
  const below = P.filter(pick('belowZero'));
  if (below.length) {
    const fell = P.filter(pick('fellBelowZero')).length;
    wrong.push({ id: 'belowZero', tone: 'bad', weight: 100, value: num(below.length), headline: `${below.length === 1 ? 'person is' : 'people are'} below zero`, detail: `${cap(whereThey(below))}${fell ? ` · ${fell} fell there ${when}` : ''}`, link: { show: 'belowZero' } });
  }
  const gave = P.filter(pick('gave'));
  if (gave.length) wrong.push({ id: 'gave', tone: 'bad', weight: 95, value: num(gave.length), headline: `gave their details away ${when}`, detail: cap(whereThey(gave)), link: { show: 'gave' } });
  const worst = r.departments[0];
  if (worst && worst.net < 0) {
    const clicked = P.filter((x) => x.dept === worst.name && x.clicked > 0).length;
    wrong.push({ id: 'worstTeam', tone: 'bad', weight: 90, value: signed(worst.net), unit: 'pts', headline: `${worst.name} lost the most ground`, detail: `${clicked} of ${worst.people} people clicked at least once · ${pc(worst.reportRate)} of their emails reported`, link: { dept: worst.name } });
  }
  const slipped = P.filter(pick('slipped'));
  if (slipped.length) {
    const by = {};
    slipped.forEach((x) => { by[x.group] = (by[x.group] || 0) + 1; });
    const [g, n] = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    wrong.push({ id: 'slipped', tone: 'bad', weight: 70, value: num(slipped.length), headline: `slipped a level ${when}`, detail: `${n === slipped.length ? 'All' : `${n}`} of them were ${GROUP_PEOPLE[g]} · ${mostIn(slipped)}`, link: { show: 'slipped' } });
  }
  const took = P.filter((x) => x.campaigns > 0);
  const silent = P.filter(pick('neverReported'));
  if (silent.length) wrong.push({ id: 'silent', tone: 'bad', weight: 60, value: num(silent.length), headline: 'got emails and never reported one', detail: `${pc(silent.length / Math.max(1, took.length))} of everyone who got one · ${mostIn(silent)}`, link: { show: 'neverReported' } });
  const sticky = [...r.lures].filter((l) => l.cells.strong !== null).sort((a, b) => b.cells.strong - a.cells.strong)[0];
  if (sticky && sticky.cells.strong > 0) {
    wrong.push({ id: 'lure', tone: 'bad', weight: 50, value: pc(sticky.cells.strong), headline: `of Phish Catchers and Champions clicked ${lureName(sticky.type)}`, detail: `${campaign ? 'This campaign’s lure' : 'More than any other lure'} · ${pc(sticky.cells.low)} of New Joiners and below did`, link: null });
  }

  // going well
  const best = r.departments.at(-1);
  if (best && best.net > 0) right.push({ id: 'bestTeam', tone: 'good', weight: 90, value: signed(best.net), unit: 'pts', headline: `${best.name} gained the most ground`, detail: `${best.climbed} climbed a level · ${pc(best.reportRate)} of their emails reported`, link: { dept: best.name } });
  const reached = P.filter(pick('reachedStrong'));
  if (reached.length) right.push({ id: 'reachedStrong', tone: 'good', weight: 80, value: num(reached.length), headline: `reached Phish Catcher or above ${when}`, detail: cap(whereThey(reached)), link: { show: 'reachedStrong' } });
  const reporters = [...r.departments].filter((d) => d.reportRate !== null && d.tookPart >= 2).sort((a, b) => b.reportRate - a.reportRate)[0];
  if (reporters && reporters.reportRate > 0) right.push({ id: 'bestReporters', tone: 'good', weight: 70, value: pc(reporters.reportRate), headline: `of ${reporters.name}’s emails were reported`, detail: `The highest report rate of any team · ${reporters.tookPart} people took part`, link: { dept: reporters.name } });
  const back = P.filter(pick('backAbove'));
  if (back.length) right.push({ id: 'backAbove', tone: 'good', weight: 60, value: num(back.length), headline: `came back above zero ${when}`, detail: cap(whereThey(back)), link: { show: 'backAbove' } });
  const climbed = P.filter(pick('climbed'));
  if (climbed.length) right.push({ id: 'climbed', tone: 'good', weight: 50, value: num(climbed.length), headline: `climbed a level ${when}`, detail: cap(mostIn(climbed)), link: { show: 'climbed' } });

  // what could happen next
  const nearZero = P.filter(pick('nearZero'));
  const nearSlip = P.filter(pick('nearSlip'));
  if (campaign) {
    if (nearZero.length) next.push({ id: 'nearZero', tone: 'watch', weight: 90, value: num(nearZero.length), headline: `${are(nearZero.length)} one click from going below zero`, detail: cap(whereThey(nearZero)), link: { show: 'nearZero' } });
    if (nearSlip.length) next.push({ id: 'nearSlip', tone: 'watch', weight: 85, value: num(nearSlip.length), headline: `${are(nearSlip.length)} one click from a level down`, detail: cap(whereThey(nearSlip)), link: { show: 'nearSlip' } });
  } else {
    const oneClick = P.filter(pick('oneClick'));
    if (oneClick.length) next.push({ id: 'oneClick', tone: 'watch', weight: 90, value: num(oneClick.length), headline: `${are(oneClick.length)} one click from a level down or below zero`, detail: cap(whereThey(oneClick)), link: { show: 'oneClick' } });
  }
  const nearUp = P.filter(pick('nearUp'));
  if (nearUp.length) next.push({ id: 'nearUp', tone: 'good', weight: 80, value: num(nearUp.length), headline: `${are(nearUp.length)} one report from a level up`, detail: cap(whereThey(nearUp)), link: { show: 'nearUp' } });
  if (r.outlook) {
    const d = r.outlook.strongNext - r.outlook.strongNow;
    next.push({ id: 'outlook', tone: d >= 0 ? 'good' : 'watch', weight: 70, value: num(r.outlook.strongNext), headline: 'could be Phish Catchers or above in 30 days', detail: `At this pace · ${num(r.outlook.strongNow)} today (${d >= 0 ? '+' : '−'}${num(Math.abs(d))})`, link: null });
  }

  return { wrong: top3(wrong), right: top3(right), next: top3(next) };
}

/** The story as one list, in reading order, for exports and the summary. */
export function findings(r, opts) {
  const s = story(r, opts);
  return [...s.wrong, ...s.right, ...s.next];
}

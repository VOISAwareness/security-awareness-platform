/**
 * The Big Picture's story: what the leaderboard shows, told in three parts.
 *
 *   wrong - needs attention: below zero, gave details away, the team that
 *           lost the most ground, slipped, never reported, the lure that
 *           still catches strong people;
 *   right - going well: the team that gained the most ground, people who
 *           reached Phish Catcher or above, the best-reporting team, people
 *           back above zero, people who climbed;
 *   next  - what could happen next: who is one click from a level down or
 *           below zero, one report from a level up, and where the board is
 *           heading at this pace.
 *
 * Built to read at any size, ten people or thirty thousand: each finding
 * leads with one number, a share of people (or points per person for a
 * team), with the count and where it sits in a quiet second line. Teams are
 * compared per person and only when they have enough people to compare.
 *
 * A finding is { id, tone, value, unit, headline, sub, detail, count, link }:
 * `sub` is the short line under it, `detail` the full one (the drill-down
 * and exports), `link` ({ show } or { dept }) what it opens, or null.
 * It reports; it never says what to do.
 */
import { PEOPLE_FILTERS } from './bigPicture.js';

const MIN_TEAM = 5; // fewer people than this and a team's average says little

const num = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;
const pc = (v) => `${Math.round((v || 0) * 100)}%`;
const pick = (id) => PEOPLE_FILTERS.find((f) => f.id === id).test;
const GROUP_PEOPLE = {
  top: 'Security Defenders or Cyber Guardians',
  strong: 'Phish Catchers or Security Champions',
  learning: 'Aware Users or Safe Handlers',
  low: 'New Joiners or below zero',
};
// "Business lure" -> "business lures"; "Credential theft" -> "credential theft emails"
const lureName = (type) => (/ lure$/i.test(type) ? `${type.toLowerCase()}s` : `${type.toLowerCase()} emails`).replace(/^(it|hr) /, (m) => m.toUpperCase());

/** A share as people read it: "0%", "<1%", "3.8%", "42%". */
export function share(n, of) {
  if (!of || !n) return '0%';
  const v = (n / of) * 100;
  if (v < 1) return '<1%';
  if (v < 10) return `${(Math.round(v * 10) / 10).toString()}%`;
  return `${Math.round(v)}%`;
}

/** A count as people read it: "940", "4,213", "12.4k", "30k". */
export function count(n) {
  if (n < 10000) return num(n);
  const k = n / 1000;
  return `${k < 100 ? Math.round(k * 10) / 10 : Math.round(k)}k`;
}

const people = (n) => `${count(n)} ${n === 1 ? 'person' : 'people'}`;

/** Where a list of people sits: "2 in CARE and 1 in HR", "all in CARE", "3 in CARE, 2 in HR and 4 more departments". */
export function whereThey(list, shown = 2) {
  const by = {};
  list.forEach((x) => { by[x.dept] = (by[x.dept] || 0) + 1; });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!top.length) return '';
  if (top.length === 1) return `all in ${top[0][0]}`;
  const parts = top.slice(0, shown).map(([d, n]) => `${count(n)} in ${d}`);
  const rest = top.length - shown;
  return rest > 0 ? `${parts.join(', ')} and ${rest} more department${rest === 1 ? '' : 's'}` : parts.join(' and ');
}

// The department with the most of a list, by count.
const mostIn = (list) => {
  const by = {};
  list.forEach((x) => { by[x.dept] = (by[x.dept] || 0) + 1; });
  return Object.entries(by).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || '';
};

// A finding about a set of people, as a share of `of`.
const about = (id, tone, weight, list, of, headline, extra = '') => ({
  id, tone, weight, count: list.length,
  value: share(list.length, of),
  headline,
  sub: `${people(list.length)}${list.length && mostIn(list) && list.length > 1 ? ` · most in ${mostIn(list)}` : list.length === 1 ? ` · in ${list[0].dept}` : ''}`,
  detail: `${people(list.length)} · ${whereThey(list)}${extra}`,
  link: { show: id },
});

const clean = (f) => ({ id: f.id, tone: f.tone, value: f.value, unit: f.unit || '', headline: f.headline, sub: f.sub, detail: f.detail, count: f.count ?? null, link: f.link ?? null });
const top3 = (list) => list.filter(Boolean).sort((a, b) => b.weight - a.weight).slice(0, 3).map(clean);

export function story(r, { campaign = false } = {}) {
  const P = r.people;
  const all = P.length;
  const took = P.filter((x) => x.campaigns > 0).length;
  const teams = r.departments.filter((d) => d.people >= Math.min(MIN_TEAM, Math.max(...r.departments.map((x) => x.people), 1)));
  const wrong = [];
  const right = [];
  const next = [];

  // needs attention
  const below = P.filter(pick('belowZero'));
  if (below.length) {
    const fell = P.filter(pick('fellBelowZero')).length;
    wrong.push(about('belowZero', 'bad', 100, below, all, 'are below zero', fell ? ` · ${count(fell)} fell there ${campaign ? 'in this campaign' : 'in the last 30 days'}` : ''));
  }
  const gave = P.filter(pick('gave'));
  if (gave.length) wrong.push(about('gave', 'bad', 95, gave, took, 'gave their details away'));
  const worst = teams[0];
  if (worst && worst.perPerson < 0) {
    wrong.push({ id: 'worstTeam', tone: 'bad', weight: 90, value: signed(worst.perPerson), unit: 'pts each', headline: `${worst.name} lost the most ground`, sub: `${people(worst.people)} · ${pc(worst.reportRate)} of emails reported`, detail: `${signed(worst.net)} points across ${people(worst.people)} · ${pc(worst.clickRate)} of emails clicked, ${pc(worst.reportRate)} reported`, link: { dept: worst.name } });
  }
  const slipped = P.filter(pick('slipped'));
  if (slipped.length) {
    const by = {};
    slipped.forEach((x) => { by[x.group] = (by[x.group] || 0) + 1; });
    const [g] = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    wrong.push(about('slipped', 'bad', 70, slipped, took, 'slipped a level', ` · most were ${GROUP_PEOPLE[g]}`));
  }
  const silent = P.filter(pick('neverReported'));
  if (silent.length) wrong.push({ ...about('neverReported', 'bad', 60, silent, took, 'never reported an email'), link: { show: 'neverReported' } });
  const sticky = [...r.lures].filter((l) => l.cells.strong !== null).sort((a, b) => b.cells.strong - a.cells.strong)[0];
  if (sticky && sticky.cells.strong > 0) {
    wrong.push({ id: 'lure', tone: 'bad', weight: 50, value: pc(sticky.cells.strong), headline: `of Phish Catchers clicked ${lureName(sticky.type)}`, sub: campaign ? 'This campaign’s lure' : 'More than any other lure', detail: `${pc(sticky.cells.low)} of New Joiners and below did`, link: null });
  }

  // going well
  const best = teams.at(-1);
  if (best && best.perPerson > 0) right.push({ id: 'bestTeam', tone: 'good', weight: 90, value: signed(best.perPerson), unit: 'pts each', headline: `${best.name} gained the most ground`, sub: `${people(best.people)} · ${pc(best.reportRate)} of emails reported`, detail: `${signed(best.net)} points across ${people(best.people)} · ${count(best.climbed)} climbed a level`, link: { dept: best.name } });
  const reached = P.filter(pick('reachedStrong'));
  if (reached.length) right.push(about('reachedStrong', 'good', 80, reached, all, 'reached Phish Catcher or above'));
  const reporters = [...teams].filter((d) => d.reportRate !== null && d.tookPart >= 2).sort((a, b) => b.reportRate - a.reportRate)[0];
  if (reporters && reporters.reportRate > 0) right.push({ id: 'bestReporters', tone: 'good', weight: 70, value: pc(reporters.reportRate), headline: `of ${reporters.name}’s emails were reported`, sub: 'The highest of any team', detail: `The highest report rate of any team · ${people(reporters.tookPart)} took part`, link: { dept: reporters.name } });
  const back = P.filter(pick('backAbove'));
  if (back.length) right.push(about('backAbove', 'good', 60, back, all, 'came back above zero'));
  const climbed = P.filter(pick('climbed'));
  if (climbed.length) right.push(about('climbed', 'good', 50, climbed, took, 'climbed a level'));

  // what could happen next
  if (campaign) {
    const nearZero = P.filter(pick('nearZero'));
    const nearSlip = P.filter(pick('nearSlip'));
    if (nearZero.length) next.push(about('nearZero', 'watch', 90, nearZero, all, 'are one click from below zero'));
    if (nearSlip.length) next.push(about('nearSlip', 'watch', 85, nearSlip, all, 'are one click from a level down'));
  } else {
    const oneClick = P.filter(pick('oneClick'));
    if (oneClick.length) next.push(about('oneClick', 'watch', 90, oneClick, all, 'are one click from a level down'));
  }
  const nearUp = P.filter(pick('nearUp'));
  if (nearUp.length) next.push(about('nearUp', 'good', 80, nearUp, all, 'are one report from a level up'));
  if (r.outlook && all) {
    const d = r.outlook.strongNext - r.outlook.strongNow;
    next.push({ id: 'outlook', tone: d >= 0 ? 'good' : 'watch', weight: 70, value: share(r.outlook.strongNext, all), headline: 'could be Phish Catchers or above in 30 days', sub: `${share(r.outlook.strongNow, all)} today, at this pace`, detail: `${people(r.outlook.strongNext)} at this pace · ${people(r.outlook.strongNow)} today`, link: null });
  }

  return { wrong: top3(wrong), right: top3(right), next: top3(next) };
}

/** The story as one list, in reading order, for exports and the summary. */
export function findings(r, opts) {
  const s = story(r, opts);
  return [...s.wrong, ...s.right, ...s.next];
}

/**
 * The detail behind a finding: who is in it (`people`, bottom of the board
 * first) and how it splits by department. For a finding about people, each
 * department's count, its size and the share, highest share first; for a
 * finding about a team, every department's points per person (or report
 * rate), that team marked. `kind` says which: 'count', 'points' or 'rate'.
 */
export function breakdown(r, f) {
  const size = Object.fromEntries(r.departments.map((d) => [d.name, d.people]));
  if (f.link?.dept) {
    const team = f.link.dept;
    const kind = f.id === 'bestReporters' ? 'rate' : 'points';
    const value = (d) => (kind === 'rate' ? d.reportRate ?? 0 : d.perPerson);
    const departments = r.departments
      .map((d) => ({ name: d.name, value: value(d), size: d.people, mark: d.name === team }))
      .sort((a, b) => (f.id === 'worstTeam' ? a.value - b.value : b.value - a.value) || a.name.localeCompare(b.name));
    return { kind, people: r.people.filter((x) => x.dept === team), departments };
  }
  const test = f.link?.show ? PEOPLE_FILTERS.find((x) => x.id === f.link.show)?.test : null;
  const list = test ? r.people.filter(test) : [];
  const by = {};
  list.forEach((x) => { by[x.dept] = (by[x.dept] || 0) + 1; });
  const departments = Object.entries(by)
    .map(([name, value]) => ({ name, value, size: size[name] || value, share: value / (size[name] || value), mark: false }))
    .sort((a, b) => b.share - a.share || b.value - a.value || a.name.localeCompare(b.name));
  return { kind: 'count', people: list, departments };
}

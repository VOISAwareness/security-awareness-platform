/**
 * The Big Picture's story: what the leaderboard shows, told in three parts.
 *
 *   wrong - needs attention: below zero, gave details away, the team that
 *           lost the most ground, slipped, never reported, the lure that
 *           still catches strong people;
 *   right - going well: the team that gained the most ground, people who
 *           reached Phish Catcher or above, the best-reporting team, people
 *           back above zero, people who climbed;
 *   next  - what could happen next, if everyone gets one more email: how
 *           many could drop a level, how many could move up, and how many
 *           would be Phish Catcher or above, each worked out by formula
 *           from every person's record (bigPictureForecast.js).
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
    wrong.push(about('belowZero', 'bad', 100, below, all, 'are below zero', fell ? ` · ${count(fell)} fell there ${campaign ? 'in this campaign' : `in the last ${r.basis.days} days`}` : ''));
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

  // what could happen next: if everyone gets one more email (bigPictureForecast.js)
  const fc = r.forecast;
  // an expected number: one decimal when small, whole and grouped when large
  const one = (n) => (n >= 100 ? num(n) : (Math.round(n * 10) / 10).toString());
  // a range whose ends never round to the same thing
  const range = (x) => (count(x.low) === count(x.high) && x.low !== x.high ? `${num(x.low)}–${num(x.high)}` : `${count(x.low)}–${count(x.high)}`);
  const shareRange = (lo, hi, of) => {
    if (share(lo, of) !== share(hi, of) || lo === hi) return `${share(lo, of)}–${share(hi, of)}`;
    const fine = (n) => `${(Math.round((n / of) * 1000) / 10).toFixed(1)}%`;
    return `${fine(lo)}–${fine(hi)}`;
  };
  if (fc.down.within) {
    next.push({ id: 'mayDrop', tone: 'watch', weight: 90, count: fc.down.within, value: share(fc.down.expected, all), headline: 'could drop a level after one more email', sub: `About ${count(Math.round(fc.down.expected))} people, likely ${range(fc.down)}`, detail: `Expected ${one(fc.down.expected)} of the ${people(fc.down.within)} within reach of a click, from each one’s own click rate · likely ${range(fc.down)} (9 times in 10)`, link: { show: 'mayDrop' } });
  }
  if (fc.up.within) {
    next.push({ id: 'mayClimb', tone: 'good', weight: 80, count: fc.up.within, value: share(fc.up.expected, all), headline: 'could move up a level after one more email', sub: `About ${count(Math.round(fc.up.expected))} people, likely ${range(fc.up)}`, detail: `Expected ${one(fc.up.expected)} of the ${people(fc.up.within)} within one report, from each one’s own report rate · likely ${range(fc.up)} (9 times in 10)`, link: { show: 'mayClimb' } });
  }
  if (all) {
    const st = fc.strong;
    next.push({ id: 'strongNext', tone: st.expected >= st.now ? 'good' : 'watch', weight: 70, value: share(st.expected, all), headline: 'could be Phish Catcher or above after one more email', sub: `${share(st.now, all)} today · likely ${shareRange(st.low, st.high, all)}`, detail: `${people(st.now)} today; expected ${one(st.expected)} after one more email · likely ${range(st)} (9 times in 10)`, link: null });
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
  // what each department did with its emails, for its health
  const record = (name) => {
    const d = r.departments.find((x) => x.name === name);
    return d ? { reported: d.reported, clicked: d.clicked, emails: d.emails } : { reported: 0, clicked: 0, emails: 0 };
  };
  if (f.link?.dept) {
    const team = f.link.dept;
    const kind = f.id === 'bestReporters' ? 'rate' : 'points';
    const value = (d) => (kind === 'rate' ? d.reportRate ?? 0 : d.perPerson);
    const departments = r.departments
      .map((d) => ({ name: d.name, value: value(d), size: d.people, mark: d.name === team, ...record(d.name) }))
      .sort((a, b) => (f.id === 'worstTeam' ? a.value - b.value : b.value - a.value) || a.name.localeCompare(b.name));
    return { kind, people: r.people.filter((x) => x.dept === team), departments };
  }
  const test = f.link?.show ? PEOPLE_FILTERS.find((x) => x.id === f.link.show)?.test : null;
  const list = test ? r.people.filter(test) : [];
  // the most likely first
  if (f.link?.show === 'mayDrop') list.sort((a, b) => b.pDrop - a.pDrop || a.points - b.points);
  if (f.link?.show === 'mayClimb') list.sort((a, b) => b.pUp - a.pUp || b.points - a.points);
  const by = {};
  list.forEach((x) => { by[x.dept] = (by[x.dept] || 0) + 1; });
  const departments = Object.entries(by)
    .map(([name, value]) => ({ name, value, size: size[name] || value, share: value / (size[name] || value), mark: false, ...record(name) }))
    .sort((a, b) => b.value - a.value || b.share - a.share || a.name.localeCompare(b.name));
  return { kind: 'count', people: list, departments };
}

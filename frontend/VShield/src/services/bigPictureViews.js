/**
 * What each Big Picture list shows, as pure functions, so the screen and the
 * one Export menu always agree on "what you are looking at".
 *
 *   peopleShown(r, view)      - People: filter, department, level, search, sort
 *   departmentsShown(r, view) - Departments: search and sort
 *   findingPeople(b, view)    - a finding's people: department and search
 *   verdict(r)                - which way the board moved, in a word
 */
import { PEOPLE_FILTERS } from './bigPicture.js';

const compare = (sort, tie) => (a, b) => {
  const x = a[sort.key];
  const y = b[sort.key];
  const d = typeof x === 'string' ? x.localeCompare(String(y)) : (x ?? 0) - (y ?? 0);
  return (sort.dir === 'asc' ? d : -d) || tie(a, b);
};

const matches = (q) => {
  const s = (q || '').trim().toLowerCase();
  return s ? (x) => x.name.toLowerCase().includes(s) || (x.email || '').toLowerCase().includes(s) : null;
};

/** `view` is { show, dept, level, lure, q, sort }; `lure` keeps those who clicked that campaign type. Equal values keep board order, bottom first when the lowest points lead. */
export function peopleShown(r, view) {
  const filter = PEOPLE_FILTERS.find((f) => f.id === view.show) || PEOPLE_FILTERS[0];
  let list = r.people.filter(filter.test);
  if (view.dept && view.dept !== 'all') list = list.filter((x) => x.dept === view.dept);
  if (view.lure) list = list.filter((x) => (x.clickedTypes || []).includes(view.lure));
  if (view.level && view.level !== 'all') list = list.filter((x) => x.groupNow === view.level);
  const q = matches(view.q);
  if (q) list = list.filter(q);
  const sort = view.sort || { key: 'points', dir: 'asc' };
  const byBoard = sort.key === 'points' && sort.dir === 'asc' ? (a, b) => b.rank - a.rank : (a, b) => a.rank - b.rank;
  return [...list].sort(compare(sort, byBoard));
}

/** Whether a People view narrows anything (else it shows everyone). */
export const peopleFiltered = (view) => (view.show && view.show !== 'all') || (view.dept && view.dept !== 'all') || (view.level && view.level !== 'all') || Boolean(view.lure) || Boolean((view.q || '').trim());

/** `view` is { q, sort }. */
export function departmentsShown(r, view) {
  const s = (view.q || '').trim().toLowerCase();
  const list = s ? r.departments.filter((d) => d.name.toLowerCase().includes(s)) : r.departments;
  return [...list].sort(compare(view.sort || { key: 'perPerson', dir: 'asc' }, (a, b) => a.name.localeCompare(b.name)));
}

/** A finding's people (`b` from breakdown()), narrowed to `view.dept` and `view.q`. */
export function findingPeople(b, view) {
  let list = view.dept ? b.people.filter((x) => x.dept === view.dept) : b.people;
  const q = matches(view.q);
  if (q) list = list.filter(q);
  return list;
}

// What stands out about a person: the first that applies, and whether it is bad news.
// Short names in two families, zero and levels, so they read alike in a
// column, each with what it means in full (the lists' tooltip).
const FLAGS = [
  [(x) => x.fellBelowZero, 'Fell below zero', true, 'Went below zero in the period shown'],
  [(x) => x.belowZero, 'Below zero', true, 'Their points are below zero'],
  [(x) => x.nearZero, 'Near zero', true, 'One more click takes them below zero'],
  [(x) => x.nearSlip, '1 click to drop', true, 'One more click takes them down a level'],
  [(x) => x.moved === 'down', 'Slipped a level', true, 'Went down a level in the period shown'],
  [(x) => x.gave > 0, 'Gave details away', true, 'Gave their details away on a phishing page'],
  [(x) => x.campaigns > 0 && x.reported === 0, 'Never reported', true, 'Got phishing emails and reported none'],
  [(x) => x.backAbove, 'Back above zero', false, 'Came back above zero in the period shown'],
  [(x) => x.moved === 'up', 'Climbed a level', false, 'Went up a level in the period shown'],
  [(x) => x.nearUp, '1 report to climb', false, 'One more report takes them up a level'],
];

/** What stands out about a person, as the lists and the export say it: { text, bad, hint }, or null. */
export function standsOut(x) {
  const f = FLAGS.find(([test]) => test(x));
  return f ? { text: f[1], bad: f[2], hint: f[3] } : null;
}

/**
 * How a group holds up against phishing, from what it did with the emails
 * it got: 'Protected' when its reports are at least double its clicks,
 * 'Holding' when they at least match them, 'Exposed' when clicks outnumber
 * reports. With its Report Rate and Hook Rate; null when it got no emails.
 */
export function health({ reported = 0, clicked = 0, emails = 0 } = {}) {
  if (!emails) return null;
  const word = reported > 0 && reported >= 2 * clicked ? 'Protected' : reported >= clicked ? 'Holding' : 'Exposed';
  return { word, reportRate: reported / emails, clickRate: clicked / emails };
}

/** Many groups (departments) as one: their emails, reports and clicks added up, for health(). */
export function recordOf(groups) {
  const add = (k) => groups.reduce((a, g) => a + (g[k] || 0), 0);
  return { reported: add('reported'), clicked: add('clicked'), emails: add('emails') };
}

/**
 * Which way the board moved, in a word, from the share of people who took
 * part that moved up a level against the share that moved down:
 * 'improving', 'steady' or 'slipping', with both shares.
 */
export function verdict(r) {
  const took = Math.max(1, r.basis.people);
  const up = r.moved.climbed / took;
  const down = r.moved.slipped / took;
  let word = 'steady';
  if (up > down * 1.2 && up - down >= 0.01) word = 'improving';
  else if (down > up * 1.2 && down - up >= 0.01) word = 'slipping';
  return { word, up, down };
}

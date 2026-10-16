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

/** `view` is { show, dept, level, q, sort }. Equal values keep board order, bottom first when the lowest points lead. */
export function peopleShown(r, view) {
  const filter = PEOPLE_FILTERS.find((f) => f.id === view.show) || PEOPLE_FILTERS[0];
  let list = r.people.filter(filter.test);
  if (view.dept && view.dept !== 'all') list = list.filter((x) => x.dept === view.dept);
  if (view.level && view.level !== 'all') list = list.filter((x) => x.groupNow === view.level);
  const q = matches(view.q);
  if (q) list = list.filter(q);
  const sort = view.sort || { key: 'points', dir: 'asc' };
  const byBoard = sort.key === 'points' && sort.dir === 'asc' ? (a, b) => b.rank - a.rank : (a, b) => a.rank - b.rank;
  return [...list].sort(compare(sort, byBoard));
}

/** Whether a People view narrows anything (else it shows everyone). */
export const peopleFiltered = (view) => (view.show && view.show !== 'all') || (view.dept && view.dept !== 'all') || (view.level && view.level !== 'all') || Boolean((view.q || '').trim());

/** `view` is { q, sort }. */
export function departmentsShown(r, view) {
  const s = (view.q || '').trim().toLowerCase();
  const list = s ? r.departments.filter((d) => d.name.toLowerCase().includes(s)) : r.departments;
  return [...list].sort(compare(view.sort || { key: 'perPerson', dir: 'asc' }, (a, b) => a.name.localeCompare(b.name)));
}

/** A finding's people (`b` from breakdown()), narrowed to `view.dept` and `view.q`. */
export function findingPeople(b, view, team = false) {
  let list = view.dept && !team ? b.people.filter((x) => x.dept === view.dept) : b.people;
  const q = matches(view.q);
  if (q) list = list.filter(q);
  return list;
}

// What stands out about a person: the first that applies, and whether it is bad news.
const FLAGS = [
  [(x) => x.fellBelowZero, 'Fell below zero', true],
  [(x) => x.belowZero, 'Below zero', true],
  [(x) => x.nearZero, '1 click from below zero', true],
  [(x) => x.nearSlip, '1 click from a level down', true],
  [(x) => x.moved === 'down', 'Slipped a level', true],
  [(x) => x.gave > 0, 'Gave details away', true],
  [(x) => x.campaigns > 0 && x.reported === 0, 'Never reported', true],
  [(x) => x.backAbove, 'Back above zero', false],
  [(x) => x.moved === 'up', 'Climbed a level', false],
  [(x) => x.nearUp, '1 report from a level up', false],
];

/** What stands out about a person, as the lists and the export say it: { text, bad }, or null. */
export function standsOut(x) {
  const f = FLAGS.find(([test]) => test(x));
  return f ? { text: f[1], bad: f[2] } : null;
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

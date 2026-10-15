/**
 * What stands out in The Big Picture: the few facts worth a leader's time,
 * each one line with its number, ranked, and linked to the people behind it.
 * It reports; it never says what to do.
 *
 * A finding is { id, tone, value, unit, headline, detail, link }: `tone` is
 * 'bad', 'watch' or 'good'; `value` the number that leads the line; `link`
 * ({ show, dept }) the people (or department) behind it, or null.
 * Concerns come first, then up to two pieces of good news.
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

export function findings(r, { campaign = false, max = 6 } = {}) {
  const when = campaign ? 'in this campaign' : 'in the last 30 days';
  const P = r.people;
  const all = [];

  const below = P.filter(pick('belowZero'));
  if (below.length) {
    const fell = P.filter(pick('fellBelowZero')).length;
    all.push({ id: 'belowZero', tone: 'bad', weight: 100, value: num(below.length), headline: `${below.length === 1 ? 'person is' : 'people are'} below zero`, detail: `${cap(whereThey(below))}${fell ? ` · ${fell} fell there ${when}` : ''}`, link: { show: 'belowZero' } });
  }

  const gave = P.filter(pick('gave'));
  if (gave.length) all.push({ id: 'gave', tone: 'bad', weight: 95, value: num(gave.length), headline: `gave their details away ${when}`, detail: cap(whereThey(gave)), link: { show: 'gave' } });

  const worst = r.departments[0];
  if (worst && worst.net < 0) {
    const clicked = P.filter((x) => x.dept === worst.name && x.clicked > 0).length;
    all.push({ id: 'worstTeam', tone: 'bad', weight: 90, value: signed(worst.net), unit: 'pts', headline: `${worst.name} lost the most ground`, detail: `${clicked} of ${worst.people} people clicked at least once · ${pc(worst.reportRate)} of their emails reported`, link: { dept: worst.name } });
  }

  const oneClick = P.filter(pick('oneClick'));
  if (oneClick.length) all.push({ id: 'oneClick', tone: 'watch', weight: 85, value: num(oneClick.length), headline: `${are(oneClick.length)} one click from a level down or below zero`, detail: cap(whereThey(oneClick)), link: { show: 'oneClick' } });

  const slipped = P.filter(pick('slipped'));
  if (slipped.length) {
    const by = {};
    slipped.forEach((x) => { by[x.group] = (by[x.group] || 0) + 1; });
    const [g, n] = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    all.push({ id: 'slipped', tone: 'watch', weight: 70, value: num(slipped.length), headline: `slipped a level ${when}`, detail: `${n === slipped.length ? 'All' : `${n}`} of them were ${GROUP_PEOPLE[g]} · ${mostIn(slipped)}`, link: { show: 'slipped' } });
  }

  const took = P.filter((x) => x.campaigns > 0);
  const silent = P.filter(pick('neverReported'));
  if (silent.length) all.push({ id: 'silent', tone: 'watch', weight: 60, value: num(silent.length), headline: 'got emails and never reported one', detail: `${pc(silent.length / Math.max(1, took.length))} of everyone who got one · ${mostIn(silent)}`, link: { show: 'neverReported' } });

  const sticky = [...r.lures].filter((l) => l.cells.strong !== null).sort((a, b) => b.cells.strong - a.cells.strong)[0];
  if (sticky && sticky.cells.strong > 0) {
    all.push({ id: 'lure', tone: 'watch', weight: 50, value: pc(sticky.cells.strong), headline: `of Phish Catchers and Champions clicked ${lureName(sticky.type)}`, detail: `${campaign ? 'This campaign’s lure' : 'More than any other lure'} · ${pc(sticky.cells.low)} of New Joiners and below did`, link: null });
  }

  const best = r.departments.at(-1);
  if (best && best.net > 0) all.push({ id: 'bestTeam', tone: 'good', weight: 35, value: signed(best.net), unit: 'pts', headline: `${best.name} gained the most ground`, detail: `${best.climbed} climbed a level · ${pc(best.reportRate)} of their emails reported`, link: { dept: best.name } });

  const nearUp = P.filter(pick('nearUp'));
  if (nearUp.length) all.push({ id: 'nearUp', tone: 'good', weight: 30, value: num(nearUp.length), headline: `${are(nearUp.length)} one report from a level up`, detail: cap(whereThey(nearUp)), link: { show: 'nearUp' } });

  const concerns = all.filter((f) => f.tone !== 'good').sort((a, b) => b.weight - a.weight);
  const good = all.filter((f) => f.tone === 'good').sort((a, b) => b.weight - a.weight);
  const keep = Math.min(concerns.length, max - Math.min(2, good.length));
  return [...concerns.slice(0, keep), ...good.slice(0, max - keep)]
    .map((f) => ({ id: f.id, tone: f.tone, value: f.value, unit: f.unit || '', headline: f.headline, detail: f.detail, link: f.link }));
}

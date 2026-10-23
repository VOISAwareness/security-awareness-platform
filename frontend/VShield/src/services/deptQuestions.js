/**
 * The Departments tab asks four questions, one at a time:
 *
 *   risk    - Who is riskiest?   each department's Risk Score, riskiest first;
 *   change  - Who is changing?   its Risk Score now against the start of the
 *                                period, the most improved first;
 *   reports - Reports vs clicks  its Report Rate against its Hook Rate;
 *   types   - What fools them?   its Hook Rate for each campaign type.
 *
 * deptRows() joins Insights' two sources into one row per department:
 * peopleInsights() (the Risk Score, now and at the start of the period, and
 * people by level) and insights() (emails, clicks and reports). deptSays()
 * gives three plain sentences saying what a question's chart shows. It
 * reports; it never says what to do. Pure, so `node --test` can cover it.
 */
import { health } from './bigPictureViews.js';
import { healthWord } from './glossary.js';
import { lureName } from './insights.js';

export const DEPT_QUESTIONS = Object.freeze([
  { id: 'risk', label: 'Who is riskiest?' },
  { id: 'change', label: 'Who is changing?' },
  { id: 'reports', label: 'Reports vs clicks' },
  { id: 'types', label: 'What fools them?' },
]);

// a change this small is no change
const STEADY = 0.05;
const one = (v) => v.toFixed(1);
const pc = (v) => `${Math.round(v * 100)}%`;
const byName = (a, b) => a.name.localeCompare(b.name);

/** One row per department, from peopleInsights() `p` and insights() `m`. */
export function deptRows(m, p) {
  const camp = Object.fromEntries((m.departments || []).map((d) => [d.name, d]));
  return p.departments.map((d) => {
    const c = camp[d.name];
    const emails = c?.recipients ?? 0;
    return {
      name: d.name,
      people: d.people,
      score: d.score,
      before: Number.isFinite(d.scoreBefore) ? d.scoreBefore : null,
      change: Number.isFinite(d.scoreBefore) ? d.score - d.scoreBefore : null,
      tiers: d.tiers,
      highShare: d.people ? d.highRisk / d.people : null,
      emails,
      clicked: c?.clicked ?? 0,
      reported: c?.reported ?? 0,
      hooked: emails ? c.clicked / emails : null,
      reportRate: emails ? c.reported / emails : null,
      perClick: c?.clicked ? c.reported / c.clicked : null,
      health: health({ reported: c?.reported ?? 0, clicked: c?.clicked ?? 0, emails }),
    };
  });
}

/** The rows in a question's order: riskiest first, or the most improved first. */
export function deptOrder(rows, q) {
  const list = [...rows];
  if (q === 'change') return list.sort((a, b) => (a.change ?? Infinity) - (b.change ?? Infinity) || byName(a, b));
  return list.sort((a, b) => b.score - a.score || byName(a, b));
}

const say = (tone, strong, text) => ({ tone, strong, text });

/**
 * Three sentences for a question's chart, each { tone, strong, text }: the
 * words to stress, then the rest. `company` is the company's Risk Score,
 * `days` the period, `lures` insights()' lures and `cells` each
 * department's Hook Rate by campaign type ({ [name]: { [type]: row } }).
 */
export function deptSays(q, rows, { company, days, lures = [], cells = {} } = {}) {
  if (!rows.length) return [];
  if (q === 'risk') {
    const list = deptOrder(rows, 'risk');
    const top = list[0]; const low = list.at(-1);
    const above = list.filter((r) => r.score > company).length;
    return [
      say('bad', top.name, ` is the riskiest, at ${one(top.score)}: ${one(top.score - company)} above the company.`),
      say('watch', `${above} of ${list.length}`, ` departments are above the company's ${one(company)}.`),
      say('good', low.name, ` is the safest, at ${one(low.score)}.`),
    ];
  }
  if (q === 'change') {
    const moved = rows.filter((r) => r.change !== null);
    const safer = moved.filter((r) => r.change <= -STEADY);
    const riskier = moved.filter((r) => r.change >= STEADY);
    const steady = moved.length - safer.length - riskier.length;
    const list = deptOrder(moved, 'change');
    const best = list[0]; const worst = list.at(-1);
    const moveWord = (r) => (r.change < 0 ? `down ${one(-r.change)}` : `up ${one(r.change)}`);
    // the first line counts both ways; the other two name the ends, and
    // when everyone moved one way, how far the last of them moved
    const [more, fewer, moreWord, fewerWord] = safer.length >= riskier.length ? [safer, riskier, 'safer', 'riskier'] : [riskier, safer, 'riskier', 'safer'];
    const rest = [fewer.length && `${fewer.length} got ${fewerWord}`, steady && `${steady} held steady`].filter(Boolean).join(', ');
    const first = say(
      fewer.length ? 'watch' : moreWord === 'safer' ? 'good' : 'bad',
      more.length === moved.length ? `All ${moved.length}` : `${more.length} of ${moved.length}`,
      ` departments got ${moreWord} over the last ${days} days${rest ? `; ${rest}` : ''}.`,
    );
    return [
      first,
      safer.length ? say('good', best.name, ` improved the most: ${moveWord(best)}.`) : say('bad', best.name, ` slipped the least: ${moveWord(best)}.`),
      riskier.length ? say('bad', worst.name, ` slipped the most: ${moveWord(worst)}.`) : say('good', worst.name, ` improved the least: ${moveWord(worst)}.`),
    ];
  }
  if (q === 'reports') {
    const tested = rows.filter((r) => r.health);
    const count = (word) => tested.filter((r) => r.health.word === word).length;
    const ranked = tested.filter((r) => r.perClick !== null).sort((a, b) => b.perClick - a.perClick || byName(a, b));
    const lines = [
      say('good', `${count('Protected')} of ${tested.length}`, ` departments ${count('Protected') === 1 ? 'is' : 'are'} ${healthWord('Protected')}: 2 or more reports for every click.`),
      count('Exposed')
        ? say('bad', `${count('Exposed')}`, ` ${count('Exposed') === 1 ? 'is' : 'are'} ${healthWord('Exposed')}: fewer reports than clicks.`)
        : say('good', 'No department', ` is ${healthWord('Exposed')}.`),
    ];
    if (ranked.length) lines.push(say('watch', ranked[0].name, ` reports the most for every click: ${ranked[0].perClick.toFixed(1)}×.`));
    return lines;
  }
  // types: what fools them
  const hot = Object.values(cells).flatMap((byType) => Object.values(byType)).filter((c) => c.recipients > 0)
    .sort((a, b) => b.hooked - a.hooked || a.name.localeCompare(b.name) || a.type.localeCompare(b.type))[0];
  const lines = [];
  if (lures[0]) lines.push(say('bad', lureName(lures[0].type), ` fooled the most people: ${pc(lures[0].hooked ?? 0)} clicked.`));
  if (hot) lines.push(say('bad', hot.name, ` on ${lureName(hot.type)} had the highest Hook Rate: ${pc(hot.hooked)}.`));
  if (lures.length > 1) lines.push(say('good', lureName(lures.at(-1).type), ` fooled the fewest: ${pc(lures.at(-1).hooked ?? 0)} clicked.`));
  return lines;
}

/**
 * The Departments tab shows four charts, one at a time:
 *
 *   ranking  - Ranking      each department's Risk Score, riskiest first;
 *   movement - Movement     its Risk Score at the start of the period and
 *                           now, the most improved first;
 *   reporting- Reporting    its Report Rate against its Hook Rate;
 *   spots    - Weak spots   its Hook Rate for each campaign type.
 *
 * deptRows() joins Insights' two sources into one row per department:
 * peopleInsights() (the Risk Score, now, at the start of the period and
 * month by month, and people by level) and insights() (emails, clicks and
 * reports). It shows what happened and says nothing about it. Pure, so
 * `node --test` can cover it.
 */
import { health } from './bigPictureViews.js';

export const DEPT_CHARTS = Object.freeze([
  { id: 'ranking', label: 'Ranking' },
  { id: 'movement', label: 'Movement' },
  { id: 'reporting', label: 'Reporting' },
  { id: 'spots', label: 'Weak spots' },
]);

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
      trend: d.trend || [],
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

/** The rows in a chart's order: the most improved first for Movement, else the riskiest first. */
export function deptOrder(rows, chart) {
  const list = [...rows];
  if (chart === 'movement') return list.sort((a, b) => (a.change ?? Infinity) - (b.change ?? Infinity) || byName(a, b));
  return list.sort((a, b) => b.score - a.score || byName(a, b));
}

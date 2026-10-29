/**
 * Insights' Summary: the programme's report page. Leadership reads it first,
 * then opens the detail behind any part of it. Pure functions on insights()
 * output `m`, peopleInsights() output `p` and deptRows() rows, so
 * `node --test` can cover them. They count and pick; they never judge or
 * advise.
 *
 *   scorecard  - the measures the report tracks beyond the band's four: each
 *                now, in the period before, its better direction and its
 *                last six thirty-day values;
 *   riskLevels - people at each risk level now and at the period's start,
 *                and how many moved down or up a level;
 *   deptHealth - how many departments are Protected, Holding, Not protected
 *                (and how many had no emails in the period);
 *   riskiest   - the departments with the highest Risk Score, and the
 *                campaign types clicked most.
 */

const rate = (n, of) => (of > 0 ? n / of : null);
const of = (s, f) => (s ? f(s) ?? null : null);
const gave = (s) => rate(s.compromised, s.delivered);
const beat = (s) => rate(s.beatClick, s.campaigns);

/**
 * The report's table. `kind` says how a value reads ('count', 'pct' a
 * fraction, 'min' minutes, 'pts' a score of 100); `better` is 'up', 'down'
 * or null for a measure that is neither. `trend` is thirty days at a time
 * over six months, the newest last; `heads` when each of them ends.
 */
export function scorecard(m, p) {
  const n = m.now;
  const b = m.before;
  const months = m.months;
  const steps = p.trend.slice(-6);
  const row = (id, group, label, term, kind, better, now, before, trend, ends) => ({ id, group, label, term, kind, better, now: now ?? null, before: before ?? null, trend: trend.map((v) => v ?? null), heads: ends });
  const mEnds = months.map((s) => s.to);
  const pEnds = steps.map((s) => s.to);
  return [
    row('campaigns', 'Reach', 'Campaigns sent', null, 'count', null, n.campaigns, of(b, (s) => s.campaigns), months.map((s) => s.campaigns), mEnds),
    row('delivered', 'Reach', 'Emails delivered', null, 'count', null, n.delivered, of(b, (s) => s.delivered), months.map((s) => s.delivered), mEnds),
    row('openRate', 'Reach', 'Open Rate', 'openRate', 'pct', null, n.openRate, of(b, (s) => s.openRate), months.map((s) => s.openRate), mEnds),
    row('gaveDetails', 'Exposure', 'Gave details away', 'gaveDetails', 'pct', 'down', gave(n), of(b, gave), months.map(gave), mEnds),
    row('repeatClickers', 'Exposure', 'Repeat clickers', null, 'count', 'down', p.now.drivers?.repeatClickers, p.before?.drivers?.repeatClickers, steps.map((s) => s.repeatClickers), pEnds),
    row('firstReport', 'Detection', 'Time to first report', null, 'min', 'down', n.firstReport, of(b, (s) => s.firstReport), months.map((s) => s.firstReport), mEnds),
    row('halfReported', 'Detection', 'Time to half the reports', null, 'min', 'down', n.halfReported, of(b, (s) => s.halfReported), months.map((s) => s.halfReported), mEnds),
    row('beatClick', 'Detection', 'Reported before any click', null, 'pct', 'up', beat(n), of(b, beat), months.map(beat), mEnds),
    row('completion', 'Training', 'Training completed', null, 'pct', 'up', p.now.training?.completion, p.before?.training?.completion, steps.map((s) => s.completion), pEnds),
    row('quizScore', 'Training', 'Average quiz score', null, 'pts', 'up', p.now.training?.quizScore, p.before?.training?.quizScore, steps.map((s) => s.quizScore), pEnds),
  ];
}

/** People at each risk level now, and at the start of the period; who moved down a level and who moved up. */
export function riskLevels(p) {
  const was = p.before?.tiers ?? null;
  return {
    people: p.now.people,
    levels: ['low', 'moderate', 'high', 'critical'].map((key) => ({ key, now: p.now.tiers[key], before: was ? was[key] : null, share: rate(p.now.tiers[key], p.now.people) })),
    lower: p.now.improved ?? null,
    higher: p.now.slipped ?? null,
  };
}

/** How many departments are at each health over the period. */
export function deptHealth(rows) {
  const count = (word) => rows.filter((r) => r.health?.word === word).length;
  return { Protected: count('Protected'), Holding: count('Holding'), Exposed: count('Exposed'), none: rows.filter((r) => !r.health).length };
}

/** The `n` departments with the highest Risk Score, and the `n` campaign types with the highest Hook Rate (`lures`: m.lures). */
export function riskiest(rows, lures, n = 3) {
  return {
    departments: [...rows].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, n),
    lures: lures.filter((l) => Number.isFinite(l.hooked)).sort((a, b) => b.hooked - a.hooked || a.type.localeCompare(b.type)).slice(0, n),
  };
}

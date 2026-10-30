/**
 * Insights' Departments tab: every department against the programme's six
 * targets (insightsTargets.js), and one department's own page.
 *
 * deptTargets() joins Insights' two sources into one row per department:
 * peopleInsights() (the Risk Score, people at high risk and training
 * completed, now and over the period before) and insights() (emails, clicks,
 * reports and details given away, in the period and the one before). The
 * rows come with the most measures off target first.
 *
 * deptPage() is one department over the year: its Risk Score and its clicks
 * against its reports thirty days at a time, what it clicks by kind of lure
 * against the whole company, and how its trained people click against those
 * not yet trained. Both count; neither judges. Pure, so `node --test` can
 * cover them.
 */
import { health } from './bigPictureViews.js';
import { TARGETS, standing } from './insightsTargets.js';

/** The six measures a department is held to, in the band's order. */
export const DEPT_MEASURES = Object.freeze(['riskScore', 'highRiskShare', 'hookRate', 'reportRate', 'gaveDetails', 'trainingCompletion']);

const rate = (n, of) => (of > 0 ? n / of : null);
const byName = (list) => Object.fromEntries((list || []).map((d) => [d.name, d]));
const count = (now, st, targets) => DEPT_MEASURES.filter((k) => standing(now[k], targets[k]) === st).length;

/** One row per department: { name, people, now, before, off, atRisk, health }, the most off target first, against `targets` (the defaults unless an admin set others). */
export function deptTargets(m, p, targets = TARGETS) {
  const camp = byName(m.departments);
  const was = byName(m.deptBefore);
  return p.departments.map((d) => {
    const c = camp[d.name];
    const b = was[d.name];
    const now = {
      riskScore: d.score,
      highRiskShare: rate(d.highRisk, d.people),
      hookRate: rate(c?.clicked, c?.recipients),
      reportRate: rate(c?.reported, c?.recipients),
      gaveDetails: rate(c?.compromised, c?.recipients),
      trainingCompletion: d.training?.completion ?? null,
    };
    const before = {
      riskScore: Number.isFinite(d.scoreBefore) ? d.scoreBefore : null,
      highRiskShare: d.tiersBefore ? rate(d.tiersBefore.high + d.tiersBefore.critical, d.people) : null,
      hookRate: rate(b?.clicked, b?.recipients),
      reportRate: rate(b?.reported, b?.recipients),
      gaveDetails: rate(b?.compromised, b?.recipients),
      trainingCompletion: d.completionBefore ?? null,
    };
    return {
      name: d.name,
      people: d.people,
      highRisk: d.highRisk,
      now,
      before,
      off: count(now, 'off', targets),
      atRisk: count(now, 'risk', targets),
      health: health({ reported: c?.reported ?? 0, clicked: c?.clicked ?? 0, emails: c?.recipients ?? 0 }),
    };
  }).sort((a, b) => b.off - a.off || b.atRisk - a.atRisk || b.now.riskScore - a.now.riskScore || a.name.localeCompare(b.name));
}

/**
 * One department's page, or null if there is no such department.
 * `risk`: its Risk Score over the last twelve steps. `months`: its clicks and
 * reports, of its emails, from the first step with an email to it. `lures`:
 * its click rate on each kind of lure, the most clicked first, with the
 * company's. `training`: the click rates of its people not yet trained and
 * trained.
 */
export function deptPage(m, p, name) {
  const d = p.departments.find((x) => x.name === name);
  if (!d) return null;
  const n = Math.min(12, d.trend.length, p.trend.length);
  const steps = m.year.map((s) => ({ to: s.to, d: (s.departments || []).find((x) => x.name === name) }));
  const first = steps.findIndex((s) => s.d?.recipients > 0);
  const company = byName(m.lures.map((l) => ({ name: l.type, hooked: l.hooked })));
  return {
    risk: d.trend.slice(-n).map((score, i) => ({ to: p.trend[p.trend.length - n + i].to, score })),
    months: first < 0 ? [] : steps.slice(first).map(({ to, d: x }) => ({ to, hooked: rate(x?.clicked, x?.recipients), reportRate: rate(x?.reported, x?.recipients) })),
    lures: (m.deptLures[name] || []).map((l) => ({ type: l.type, hooked: l.hooked, company: company[l.type]?.hooked ?? null })),
    training: { untrained: d.cohorts?.untrainedRate ?? null, trained: d.cohorts?.trainedRate ?? null },
  };
}

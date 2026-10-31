/**
 * Insights' scope: whose figures a page shows. The whole company, or one
 * department. A department's scope cuts each campaign report down to that
 * department's part, in the same shape as a whole report, before anything
 * is worked out, so every calculation (insights(), the profiles, the
 * charts) runs unchanged on it and a page opened inside a department is
 * that department's without a case of its own. Campaigns that did not go
 * to the department drop out.
 *
 * It asks the reports API for one thing: each report's `departments` rows
 * carry the same counts and times as the report itself (sent, delivered,
 * opened, clicked, compromised, reported, trained, complained, timing).
 * docs/insights-data.md has the whole of it. Pure, so `node --test` can
 * cover it.
 */

const rate = (n, of) => (of > 0 ? n / of : 0);
const NO_TIMES = { firstReport: null, medianReport: null, firstClick: null };

/** A department's part of a campaign report, shaped as a report; null if the campaign did not go to it. */
export function sliceOf(report, department) {
  const d = (report.departments || []).find((x) => x.name === department);
  if (!d) return null;
  const delivered = d.delivered ?? d.recipients ?? 0;
  const counts = {
    sent: d.sent ?? delivered,
    delivered,
    opened: d.opened ?? 0,
    clicked: d.clicked ?? 0,
    compromised: d.compromised ?? 0,
    reported: d.reported ?? 0,
    trained: d.trained ?? 0,
    complained: d.complained ?? 0,
  };
  return {
    id: report.id,
    name: report.name,
    started: report.started,
    ...counts,
    rates: {
      open: rate(counts.opened, delivered),
      click: rate(counts.clicked, delivered),
      compromise: rate(counts.compromised, delivered),
      report: rate(counts.reported, delivered),
      trainedAfterClick: rate(counts.trained, counts.clicked),
    },
    resilience: counts.clicked ? counts.reported / counts.clicked : null,
    timing: { ...NO_TIMES, ...(d.timing || {}) },
    departments: [d],
  };
}

/** The { campaign, report } items as `scope` sees them: all of them for the company, each department's part for a department. */
export function scopeItems(items, scope) {
  if (!scope?.department) return items;
  return items.flatMap((x) => {
    const report = sliceOf(x.report, scope.department);
    return report ? [{ campaign: x.campaign, report }] : [];
  });
}

import { Card } from './InsightsCharts';
import { RowsGrid } from './InsightsBits';
import { GroupBars, Trend } from './InsightsTrends';
import { trends } from '../../services/insightsSummary';
import { TARGETS, targetText } from '../../services/insightsTargets';
import { day, mins, pc1 } from './insightsUi';

// Insights' Summary: the report leadership reads first, under the band's
// six measures and their targets. Five charts: the Risk Score against its
// target zone, clicks against reports, details given away and the time to
// the first report, thirty days at a time; and what training does to clicks.
// Columns are green up to their target and red for the part over it, as the
// band's bars are. It reports; it never says what to make of it. Rows page
// on a short window, so nothing scrolls. A department's page (InsightsDepartments.jsx)
// draws its own Risk Score, clicks against reports and training the same way.

const pct0 = (v) => `${Math.round(v * 100)}%`;
const minutes = (v) => `${Math.round(v)}m`;
const head = (s) => `30 days to ${day(s.to)}`;
const steps = (hi, by) => Array.from({ length: Math.floor(hi / by) + 1 }, (_, k) => k * by);

/** The Risk Score, thirty days at a time: green while on target, amber above it. `points`: [{ to, score }]. */
export function RiskTrend({ points, ink }) {
  const R = TARGETS.riskScore;
  const score = points.map((s) => s.score);
  const lo = Math.floor(Math.min(...score, R.target) / 2) * 2 - 2;
  const hi = Math.ceil(Math.max(...score, R.target) / 2) * 2 + 2;
  return (
    <Trend
      points={points}
      label={`Risk Score, 30 days at a time: from ${score[0]?.toFixed(1)} to ${score.at(-1)?.toFixed(1)}; the target is ${targetText(R)}`}
      lo={lo}
      hi={hi}
      ticks={steps(hi, 2).filter((v) => v >= lo)}
      tickText={(v) => v}
      zones={[{ from: lo, to: R.target, color: ink.good }, { from: R.target, to: hi, color: ink.caution }]}
      targets={[{ v: R.target, color: ink.good, label: '' }]}
      lines={[{ key: 'score', dots: true, split: { at: R.target, below: ink.good, above: ink.caution } }]}
      peak={{ key: 'score', color: ink.caution, text: (v) => `Peak ${v.toFixed(1)}` }}
      tag={{ key: 'score', text: (v) => v.toFixed(1) }}
      side={[{ v: hi - 0.6, text: 'MODERATE', color: ink.caution, caps: true }, { v: lo + 1.6, text: 'LOW', color: ink.good, caps: true, sub: `target ${targetText(R)}` }]}
      right={86}
      tip={(s) => ({ head: head(s), rows: [{ label: 'Risk Score', value: s.score.toFixed(1), color: s.score <= R.target ? ink.good : ink.caution }] })}
    />
  );
}

/** Reports against clicks, of the emails delivered, thirty days at a time. `points`: [{ to, reportRate, hooked }]. */
export function ClickedReported({ points, ink }) {
  const H = TARGETS.hookRate; const P = TARGETS.reportRate;
  return (
    <Trend
      points={points}
      label={`Reported and clicked, of emails delivered, 30 days at a time: reported ${pc1(points.at(-1)?.reportRate)}, clicked ${pc1(points.at(-1)?.hooked)} in the latest`}
      lo={0}
      hi={0.6}
      ticks={[0, 0.2, 0.4, 0.6]}
      tickText={pct0}
      targets={[{ v: P.target, color: ink.good, label: `Report target ${targetText(P, '%')}` }, { v: H.target, color: ink.bad, label: `Click target ${targetText(H, '%')}`, below: true }]}
      between={{ top: 'reportRate', under: 'hooked', lead: ink.good, trail: ink.bad }}
      lines={[{ key: 'reportRate', color: ink.good, end: true, name: 'Reported', text: pc1 }, { key: 'hooked', color: ink.bad, end: true, name: 'Clicked', text: pc1, dy: 6 }]}
      tip={(s) => ({ head: head(s), rows: [{ label: 'Reported', value: pc1(s.reportRate), color: ink.good }, { label: 'Clicked', value: pc1(s.hooked), color: ink.bad }] })}
    />
  );
}

/** The click rates of people not yet trained and people trained. `training`: { untrained, trained }; `here` names whose. */
export function TrainingBars({ training, ink, here = '' }) {
  const gap = training.untrained !== null && training.trained !== null ? (training.untrained - training.trained) * 100 : null;
  return (
    <GroupBars
      rows={[{ label: 'Not yet trained', value: training.untrained, color: ink.bad }, { label: 'Trained', value: training.trained, color: ink.good }]}
      max={Math.max(0.25, training.untrained || 0, training.trained || 0)}
      text={pc1}
      gap={gap !== null && <>Trained people{here} click <strong className="vs-rank" style={{ fontWeight: 900 }}>{Math.abs(gap).toFixed(1)} pts</strong> {gap > 0 ? 'less' : 'more'}.</>}
    />
  );
}

export function SummaryView({ ctx }) {
  const { m, p, ink, reduce } = ctx;
  const t = trends(m, p);
  const G = TARGETS.gaveDetails; const F = TARGETS.firstReport;
  const gaveHi = Math.max(G.atRisk * 2, ...t.months.map((s) => s.gave || 0)) * 1.15;
  const firstHi = Math.max(F.target + 5, ...t.months.map((s) => s.firstReport || 0)) * 1.15;
  const over = (v, T) => (v > T.target ? ink.bad : ink.good);
  return (
    <RowsGrid data-ins-summary minRow={230}>
      <Card i={0} reduce={reduce} title="Risk Score" sub="Green while on target, amber while at Moderate risk" style={{ gridColumn: 'span 6' }} data-ins-trend="risk">
        <RiskTrend points={t.risk} ink={ink} />
      </Card>

      <Card i={1} reduce={reduce} title="Clicked vs reported" sub="Share of emails delivered · green where reporting leads, red where clicking leads" style={{ gridColumn: 'span 6' }} data-ins-trend="culture">
        <ClickedReported points={t.months} ink={ink} />
      </Card>

      <Card i={2} reduce={reduce} title="Gave details away" sub={`Share of emails with details entered · green up to the ${pct0(G.target)} target, red above`} style={{ gridColumn: 'span 4' }} data-ins-trend="gave">
        <Trend
          points={t.months}
          label={`Gave details away, of emails delivered, 30 days at a time: ${pc1(t.months.at(-1)?.gave)} in the latest; the target is ${targetText(G, '%')}`}
          lo={0}
          hi={gaveHi}
          ticks={steps(gaveHi, gaveHi > 0.08 ? 0.05 : 0.02)}
          tickText={pct0}
          columns={{ key: 'gave', split: { at: G.target, below: ink.good, above: ink.bad }, text: pc1 }}
          right={12}
          tip={(s) => ({ head: head(s), rows: [{ label: 'Gave details away', value: pc1(s.gave), color: over(s.gave, G) }] })}
        />
      </Card>

      <Card i={3} reduce={reduce} title="Time to first report" sub={`Median minutes to the first report · green up to the ${F.target} min target, red above`} style={{ gridColumn: 'span 4' }} data-ins-trend="first">
        <Trend
          points={t.months}
          label={`Median minutes to the first report, 30 days at a time: ${mins(t.months.at(-1)?.firstReport)} in the latest; the target is ${targetText(F, 'min')}`}
          lo={0}
          hi={firstHi}
          ticks={steps(firstHi, 10)}
          tickText={minutes}
          columns={{ key: 'firstReport', split: { at: F.target, below: ink.good, above: ink.bad }, text: minutes }}
          right={12}
          tip={(s) => ({ head: head(s), rows: [{ label: 'First report', value: mins(s.firstReport), color: over(s.firstReport, F) }] })}
        />
      </Card>

      <Card i={4} reduce={reduce} title="Training effectiveness" sub="Click rate of people not yet trained against people trained" style={{ gridColumn: 'span 4' }} data-ins-trend="training">
        <TrainingBars training={t.training} ink={ink} />
      </Card>
    </RowsGrid>
  );
}

import { Card } from './InsightsCharts';
import { RowsGrid } from './InsightsBits';
import { GroupBars, Trend } from './InsightsTrends';
import { trends } from '../../services/insightsSummary';
import { TARGETS, standing, targetText } from '../../services/insightsTargets';
import { day, mins, pc1 } from './insightsUi';

// Insights' Summary: the report leadership reads first, under the band's
// four measures and their targets. Five charts: the Risk Score against its
// target zone, clicks against reports, details given away and the time to
// the first report, thirty days at a time; and what training does to clicks.
// It reports; it never says what to make of it. Rows page on a short window,
// so nothing scrolls.

const pct0 = (v) => `${Math.round(v * 100)}%`;
const minutes = (v) => `${Math.round(v)}m`;

export function SummaryView({ ctx }) {
  const { m, p, ink, reduce } = ctx;
  const t = trends(m, p);
  const tone = { on: ink.good, risk: ink.caution, off: ink.bad };
  const R = TARGETS.riskScore; const H = TARGETS.hookRate; const P = TARGETS.reportRate; const G = TARGETS.gaveDetails; const F = TARGETS.firstReport;
  const head = (s) => `30 days to ${day(s.to)}`;
  const score = t.risk.map((s) => s.score);
  const scoreLo = Math.floor(Math.min(...score, R.target) / 2) * 2 - 2;
  const scoreHi = Math.ceil(Math.max(...score, R.target) / 2) * 2 + 2;
  const gaveHi = Math.max(G.atRisk * 2, ...t.months.map((s) => s.gave || 0)) * 1.15;
  const firstHi = Math.max(F.target + 5, ...t.months.map((s) => s.firstReport || 0)) * 1.15;
  const steps = (hi, by) => Array.from({ length: Math.floor(hi / by) + 1 }, (_, k) => k * by);
  const gap = t.training.untrained !== null && t.training.trained !== null ? (t.training.untrained - t.training.trained) * 100 : null;
  return (
    <RowsGrid data-ins-summary minRow={230}>
      <Card i={0} reduce={reduce} title="Risk Score" sub="Green while on target, amber while at Moderate risk" style={{ gridColumn: 'span 6' }} data-ins-trend="risk">
        <Trend
          points={t.risk}
          label={`Risk Score, 30 days at a time: from ${score[0]?.toFixed(1)} to ${score.at(-1)?.toFixed(1)}; the target is ${targetText(R)}`}
          lo={scoreLo}
          hi={scoreHi}
          ticks={steps(scoreHi, 2).filter((v) => v >= scoreLo)}
          tickText={(v) => v}
          zones={[{ from: scoreLo, to: R.target, color: ink.good }, { from: R.target, to: scoreHi, color: ink.caution }]}
          targets={[{ v: R.target, color: ink.good, label: '' }]}
          lines={[{ key: 'score', dots: true, split: { at: R.target, below: ink.good, above: ink.caution } }]}
          peak={{ key: 'score', color: ink.caution, text: (v) => `Peak ${v.toFixed(1)}` }}
          tag={{ key: 'score', text: (v) => v.toFixed(1) }}
          side={[{ v: scoreHi - 0.6, text: 'MODERATE', color: ink.caution, caps: true }, { v: scoreLo + 1.6, text: 'LOW', color: ink.good, caps: true, sub: `target ${targetText(R)}` }]}
          right={86}
          tip={(s) => ({ head: head(s), rows: [{ label: 'Risk Score', value: s.score.toFixed(1), color: s.score <= R.target ? ink.good : ink.caution }] })}
        />
      </Card>

      <Card i={1} reduce={reduce} title="Clicked vs reported" sub="Share of emails delivered · green where reporting leads, red where clicking leads" style={{ gridColumn: 'span 6' }} data-ins-trend="culture">
        <Trend
          points={t.months}
          label={`Reported and clicked, of emails delivered, 30 days at a time: reported ${pc1(t.months.at(-1)?.reportRate)}, clicked ${pc1(t.months.at(-1)?.hooked)} in the latest`}
          lo={0}
          hi={0.6}
          ticks={[0, 0.2, 0.4, 0.6]}
          tickText={pct0}
          targets={[{ v: P.target, color: ink.good, label: `Report target ${targetText(P, '%')}` }, { v: H.target, color: ink.bad, label: `Click target ${targetText(H, '%')}`, below: true }]}
          between={{ top: 'reportRate', under: 'hooked', lead: ink.good, trail: ink.bad }}
          lines={[{ key: 'reportRate', color: ink.good, end: true, name: 'Reported', text: pc1 }, { key: 'hooked', color: ink.bad, end: true, name: 'Clicked', text: pc1, dy: 6 }]}
          tip={(s) => ({ head: head(s), rows: [{ label: 'Reported', value: pc1(s.reportRate), color: ink.good }, { label: 'Clicked', value: pc1(s.hooked), color: ink.bad }] })}
        />
      </Card>

      <Card i={2} reduce={reduce} title="Gave details away" sub="Share of emails where details were entered on the practice page" style={{ gridColumn: 'span 4' }} data-ins-trend="gave">
        <Trend
          points={t.months}
          label={`Gave details away, of emails delivered, 30 days at a time: ${pc1(t.months.at(-1)?.gave)} in the latest; the target is ${targetText(G, '%')}`}
          lo={0}
          hi={gaveHi}
          ticks={steps(gaveHi, gaveHi > 0.08 ? 0.05 : 0.02)}
          tickText={pct0}
          zones={[{ from: G.target, to: G.atRisk, color: ink.caution }]}
          targets={[{ v: G.target, color: ink.good, label: '' }]}
          columns={{ key: 'gave', colorOf: (v) => tone[standing(v, G)], text: pc1 }}
          side={[{ v: (G.target + G.atRisk) / 2, text: 'At risk', color: ink.caution }, { v: G.target - (gaveHi * 0.04), text: 'Target', color: ink.good, sub: targetText(G, '%') }]}
          right={56}
          tip={(s) => ({ head: head(s), rows: [{ label: 'Gave details away', value: pc1(s.gave), color: tone[standing(s.gave, G)] }] })}
        />
      </Card>

      <Card i={3} reduce={reduce} title="Time to first report" sub="Median minutes from sending to the first report" style={{ gridColumn: 'span 4' }} data-ins-trend="first">
        <Trend
          points={t.months}
          label={`Median minutes to the first report, 30 days at a time: ${mins(t.months.at(-1)?.firstReport)} in the latest; the target is ${targetText(F, 'min')}`}
          lo={0}
          hi={firstHi}
          ticks={steps(firstHi, 10)}
          tickText={minutes}
          zones={[{ from: 0, to: F.target, color: ink.good }]}
          targets={[{ v: F.target, color: ink.good, label: `Target ${targetText(F, 'min')}` }]}
          lines={[{ key: 'firstReport', color: ink.measure, end: true, name: 'median', text: mins }]}
          step
          tip={(s) => ({ head: head(s), rows: [{ label: 'First report', value: mins(s.firstReport), color: ink.measure }] })}
        />
      </Card>

      <Card i={4} reduce={reduce} title="Training effectiveness" sub="Click rate of people not yet trained against people trained" style={{ gridColumn: 'span 4' }} data-ins-trend="training">
        <GroupBars
          rows={[{ label: 'Not yet trained', value: t.training.untrained, color: ink.bad }, { label: 'Trained', value: t.training.trained, color: ink.good }]}
          max={Math.max(0.25, t.training.untrained || 0, t.training.trained || 0)}
          text={pc1}
          gap={gap !== null && (gap > 0
            ? <>Trained people click <strong className="vs-rank" style={{ fontWeight: 900 }}>{gap.toFixed(1)} pts</strong> less.</>
            : <>Trained people click <strong className="vs-rank" style={{ fontWeight: 900 }}>{Math.abs(gap).toFixed(1)} pts</strong> more.</>)}
        />
      </Card>
    </RowsGrid>
  );
}

import { Card } from './InsightsCharts';
import { FitList, RowsGrid } from './InsightsBits';
import { ClickedReported, RiskTrend, TrainingBars } from './InsightsSummary';
import { deptPage } from '../../services/deptTargets';
import { standing, targetText } from '../../services/insightsTargets';
import { GLOSSARY, TYPE_WORD } from '../../services/glossary';
import { alpha, eyebrow, num, pc, pc1, small, TYPE } from './insightsUi';

// Insights' Departments tab: every department against the programme's six
// targets, the most measures off target first (services/deptTargets.js);
// each cell tinted by where it stands. A row opens the department: the
// corner tile and the band turn to it (Insights.jsx) and, under them, its
// page: its Risk Score and its clicks against its reports thirty days at a
// time, what it falls for, and what training does to its clicks. They show
// what happened; they never say what to make of it.

const COLS = [
  { key: 'riskScore', name: GLOSSARY.riskScore.name, text: (v) => v.toFixed(1), unit: '' },
  { key: 'highRiskShare', name: GLOSSARY.highRisk.name, text: pc1, unit: '%' },
  { key: 'hookRate', name: GLOSSARY.hookRate.name, text: pc1, unit: '%' },
  { key: 'reportRate', name: GLOSSARY.reportRate.name, text: pc1, unit: '%' },
  { key: 'gaveDetails', name: GLOSSARY.gaveDetails.name, text: pc1, unit: '%' },
  { key: 'trainingCompletion', name: GLOSSARY.trainingCompletion.name, text: pc, unit: '%' },
];
const GRID = 'minmax(0,1.5fr) repeat(6, minmax(0,1fr)) 72px';
const ROW_H = 26;
const STANDING = [['on', 'On track'], ['risk', 'At risk'], ['off', 'Off track']];
const swatch = (bg) => <span aria-hidden style={{ flexShrink: 0, width: 20, height: 11, borderRadius: 4, background: bg }} />;

export function DepartmentsView({ ctx }) {
  const { depts, ink, open, reduce, targets } = ctx;
  const tone = { on: ink.good, risk: ink.caution, off: ink.bad };
  const legend = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 14, ...small }}>
      {STANDING.map(([k, word]) => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{swatch(alpha(tone[k], 0.16))}{word}</span>)}
    </span>
  );
  return (
    <Card i={0} reduce={reduce} title="Departments against targets" sub="Each measure against its target · most measures off target first" action={legend} style={{ flex: 1 }} data-ins-depts>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
        <div aria-hidden style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: GRID, columnGap: 8, alignItems: 'end', padding: '0 10px 6px', borderBottom: '1px solid var(--hair-strong)' }}>
          <span style={eyebrow}>Department</span>
          {COLS.map((c) => (
            <span key={c.key} style={{ minWidth: 0, textAlign: 'center' }}>
              <span style={{ ...eyebrow, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ fontSize: TYPE.small, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>Target {targetText(targets[c.key], c.unit)}</span>
            </span>
          ))}
          <span style={{ ...eyebrow, textAlign: 'center' }}>People</span>
        </div>
        <FitList
          items={depts}
          rowH={ROW_H}
          what="departments"
          render={(d, k) => (
            <button
              key={d.name}
              type="button"
              className="ins-row ins-in-x"
              data-ins-dept-row={d.name}
              onClick={() => open('department', d.name)}
              aria-label={`${d.name}: ${COLS.map((c) => `${c.name} ${Number.isFinite(d.now[c.key]) ? c.text(d.now[c.key]) : 'no figure'}`).join(', ')}; ${num(d.people)} people. Open it`}
              style={{ '--d': `${k * 0.015}s`, flexShrink: 0, display: 'grid', gridTemplateColumns: GRID, columnGap: 8, alignItems: 'center', height: ROW_H, padding: '0 10px', border: 'none', borderBottom: '1px solid var(--row-hair)', borderRadius: 6, background: 'transparent', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
            >
              <span style={{ fontSize: TYPE.strong, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
              {COLS.map((c) => {
                const v = d.now[c.key];
                const st = standing(v, targets[c.key]);
                return (
                  <span key={c.key} style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ minWidth: 62, height: 19, padding: '0 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', borderRadius: 6, background: st ? alpha(tone[st], 0.14) : 'transparent', fontSize: TYPE.strong, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{Number.isFinite(v) ? c.text(v) : '—'}</span>
                  </span>
                );
              })}
              <span style={{ textAlign: 'center', fontSize: TYPE.strong, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{num(d.people)}</span>
            </button>
          )}
        />
      </div>
    </Card>
  );
}

// What a department falls for: one bar per campaign type, green up to the
// Hook Rate's target and red for the part over it, its click rate and the
// company's beside it. A row opens the campaign type.
const LURE_GRID = 'minmax(0,150px) minmax(0,1fr) 92px';
function FallFor({ lures, ink, open, hook }) {
  const t = hook.target;
  const max = Math.max(0.2, ...lures.map((l) => l.hooked || 0)) * 1.08;
  const w = (v) => `${(Math.max(0, v) / max) * 100}%`;
  return (
    <FitList
      items={lures}
      rowH={40}
      what="campaign types"
      style={{ justifyContent: 'center', marginTop: 6 }}
      render={(l, k) => (
        <button
          key={l.type}
          type="button"
          className="ins-row ins-in-x"
          onClick={() => open('lure', l.type)}
          aria-label={`${l.type}: ${pc1(l.hooked)} clicked here, ${pc1(l.company)} across the company; the target is ${targetText(hook, '%')}. Open it`}
          style={{ '--d': `${k * 0.03}s`, flexShrink: 0, height: 40, display: 'grid', gridTemplateColumns: LURE_GRID, columnGap: 12, alignItems: 'center', padding: '0 6px', border: 'none', borderRadius: 8, background: 'transparent', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}
        >
          <span style={{ fontSize: TYPE.strong, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.type}</span>
          <span aria-hidden style={{ position: 'relative', height: 14, borderRadius: 6, background: 'var(--track)', overflow: 'hidden', display: 'flex' }}>
            <span className="ins-grow-x" style={{ '--d': `${k * 0.03}s`, display: 'flex', width: '100%', transformOrigin: 'left' }}>
              <span style={{ width: w(Math.min(l.hooked, t)), background: ink.good }} />
              {l.hooked > t && <span style={{ width: w(l.hooked - t), marginLeft: 2, borderRadius: '0 6px 6px 0', background: ink.bad }} />}
            </span>
          </span>
          <span style={{ textAlign: 'right', lineHeight: 1.2 }}>
            <span className="vs-rank" style={{ display: 'block', fontSize: TYPE.figure, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{pc1(l.hooked)}</span>
            <span style={{ ...small, fontWeight: 700, whiteSpace: 'nowrap' }}>company {pc1(l.company)}</span>
          </span>
        </button>
      )}
    />
  );
}

/** One department's page, under the band and the corner tile that show it. */
export function DepartmentView({ ctx, name }) {
  const { m, p, ink, reduce, open, targets } = ctx;
  const d = deptPage(m, p, name);
  if (!d) return null;
  const legend = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 12, ...small }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{swatch(ink.good)}Within the target</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{swatch(ink.bad)}Above the target</span>
    </span>
  );
  return (
    <RowsGrid data-ins-dept={name} minRow={230}>
      <Card i={0} reduce={reduce} title="Risk Score" sub="Green while on target, amber while at Moderate risk" style={{ gridColumn: 'span 6' }} data-ins-trend="risk">
        <RiskTrend points={d.risk} ink={ink} targets={targets} />
      </Card>
      <Card i={1} reduce={reduce} title="Clicked vs reported" sub="Share of this department’s emails · green where reporting leads, red where clicking leads" style={{ gridColumn: 'span 6' }} data-ins-trend="culture">
        <ClickedReported points={d.months} ink={ink} targets={targets} />
      </Card>
      <Card i={2} reduce={reduce} title="What they fall for" sub={`Click rate by ${TYPE_WORD.toLowerCase()} · green up to the ${pc(targets.hookRate.target)} target, red above`} action={legend} style={{ gridColumn: 'span 6' }} data-ins-dept-lures>
        <FallFor lures={d.lures} ink={ink} open={open} hook={targets.hookRate} />
      </Card>
      <Card i={3} reduce={reduce} title="Training effectiveness" sub="Click rate of people not yet trained against people trained, in this department" style={{ gridColumn: 'span 6' }} data-ins-trend="training">
        <TrainingBars training={d.training} ink={ink} here=" here" />
      </Card>
    </RowsGrid>
  );
}

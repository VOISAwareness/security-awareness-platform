import { useMemo, useState } from 'react';

import { Card } from './InsightsCharts';
import { FitList } from './InsightsBits';
import { Trend } from './InsightsTrends';
import { useSize } from './useSize';
import { trends } from '../../services/insightsSummary';
import { DRIVERS, levelsByMonth } from '../../services/insightsPeople';
import { targetText } from '../../services/insightsTargets';
import { alpha, day, mins, num, pc, pc1, small, TYPE } from './insightsUi';

// Insights' four tabs, under the corner tile and the six measures:
//   Summary      the company over time against its targets
//   Departments  every department against every target; a row opens the
//                department's own charts (the second and last level)
//   Campaigns    each campaign type and each campaign
//   Training     who drops out, what training does to clicks, by
//                department and by programme
// Every bar, row and figure opens the people behind it (`ctx.people`), the
// third level. Green is within a target, red past it; nothing else is
// coloured but the risk levels. They report; they never advise.

const minutes = (v) => `${Math.round(v)}m`;
// a department's own charts: thirty days at a time
const head = (s) => `30 days to ${day(s.to)}`;
const steps = (hi, by) => Array.from({ length: Math.floor(hi / by) + 1 }, (_, k) => k * by);
const within = (v, T) => (T.better === 'down' ? v <= T.target : v >= T.target);
const grid = (cols, rows) => ({ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: cols, gridTemplateRows: rows, gap: 12 });
const card = { background: 'var(--plate)', borderRadius: 10, padding: '12px 16px 10px' };
// a clickable mark shows its count on hover (useHoverTip in Insights.jsx)
const tip = (text) => ({ 'data-tip': text });
const pressable = (onClick) => ({ role: 'button', tabIndex: 0, onClick, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }, style: { cursor: 'pointer' } });

// Click rates side by side, as columns on a 0% scale: one per group of
// people (trained, not trained; or by kind of training). The taller the
// column, the more that group clicked. Each column: its rate on top, its
// name and its people under it.
export function ClickRateColumns({ groups, ink, note, label }) {
  const shown = groups.filter((g) => Number.isFinite(g.rate));
  if (!shown.length) return <span style={small}>No figures yet.</span>;
  const most = Math.max(...shown.map((g) => g.rate));
  const top = Math.max(0.05, Math.ceil((most * 1.15) / 0.05) * 0.05);
  const ticks = steps(top, top > 0.2 ? 0.1 : 0.05);
  return (
    <div role="img" aria-label={label ?? shown.map((g) => `${g.name}: ${pc1(g.rate)} clicked`).join('; ')} style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '34px minmax(0,1fr)', gridTemplateRows: 'minmax(0,1fr) auto auto', columnGap: 6 }}>
      <div aria-hidden style={{ position: 'relative' }}>
        {ticks.map((t) => <span key={t} style={{ position: 'absolute', right: 0, bottom: `${(t / top) * 100}%`, transform: 'translateY(50%)', ...small, fontSize: TYPE.label }}>{pc(t)}</span>)}
      </div>
      <div style={{ position: 'relative', borderLeft: '1px solid var(--hair-strong)', borderBottom: '1px solid var(--hair-strong)' }}>
        {ticks.filter((t) => t > 0).map((t) => <span key={t} aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: `${(t / top) * 100}%`, borderTop: '1px dashed var(--hair)' }} />)}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 4%' }}>
          {shown.map((g, k) => (
            <div key={g.name} data-ins-click-col={g.key} style={{ width: `${Math.min(28, 70 / shown.length)}%`, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: TYPE.strong, fontWeight: 800, color: 'var(--text)' }}>{pc1(g.rate)}</span>
              <span className="ins-rise" style={{ '--d': `${k * 0.06}s`, width: '100%', height: `${(g.rate / top) * 100}%`, minHeight: 3, background: g.color, borderRadius: '6px 6px 0 0' }} />
            </div>
          ))}
        </div>
      </div>
      <span />
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '5px 4% 0' }}>
        {shown.map((g) => (
          <span key={g.name} style={{ width: `${Math.min(34, 90 / shown.length)}%`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', lineHeight: 1.2 }}>
            <span style={{ fontSize: TYPE.body, fontWeight: 700, color: 'var(--text)' }}>{g.name}</span>
            {Number.isFinite(g.people) && <span style={{ ...small, fontSize: TYPE.label }}>{num(g.people)} people</span>}
          </span>
        ))}
      </div>
      {note && <span style={{ gridColumn: '1 / -1', paddingTop: 6, fontSize: TYPE.body, fontWeight: 700, color: ink.good }}>{note}</span>}
    </div>
  );
}

// how many times more often one group clicks than another, in words
const timesMore = (more, less) => (Number.isFinite(more) && Number.isFinite(less) && less > 0 ? more / less : null);

// --------------------------------------------------------------- Summary

export function SummaryPage({ ctx }) {
  const { m, p, ink, reduce, targets: T } = ctx;
  const t = trends(m, p);
  const R = T.riskScore; const H = T.hookRate; const P = T.reportRate; const G = T.gaveDetails; const F = T.firstReport;
  const scores = t.risk.map((s) => s.score).filter(Number.isFinite);
  const lo = Math.max(0, Math.floor(Math.min(...scores, R.target) / 2) * 2 - 4);
  const hi = Math.ceil(Math.max(...scores, R.target) / 2) * 2 + 2;
  const gaveHi = Math.max(G.target * 3, ...t.months.map((s) => s.gave || 0)) * 1.2;
  const avgHi = Math.max(F.target + 10, ...t.months.map((s) => s.avgReport || 0)) * 1.15;
  const last = t.months.at(-1);
  const c = p.now.cohorts;
  const x = timesMore(c?.untrainedRate, c?.trainedRate);
  return (
    <div data-ins-summary style={grid('repeat(6, minmax(0,1fr))', 'minmax(0,1.1fr) minmax(0,1fr)')}>
      <Card i={0} reduce={reduce} title="Risk score" style={{ ...card, gridColumn: 'span 3' }} data-ins-trend="risk">
        <Trend
          points={t.risk}
          label={`Risk Score by month: ${t.risk.map((s) => `${s.range} ${Number.isFinite(s.score) ? s.score.toFixed(1) : 'no figure'}`).join(', ')}; the target is ${targetText(R)}`}
          lo={lo}
          hi={hi}
          ticks={steps(hi, 2).filter((v) => v >= lo)}
          tickText={(v) => v}
          zones={[{ from: lo, to: R.target, color: ink.good }]}
          targets={[{ v: R.target, color: ink.good, label: `Target ${targetText(R)}`, below: true }]}
          columns={{ key: 'score', split: { at: R.target, below: ink.good, above: ink.bad }, text: (v) => v.toFixed(1) }}
          right={10}
          tip={(s) => ({ head: s.range, rows: [{ label: 'Risk Score', value: s.score.toFixed(1), color: s.score <= R.target ? ink.good : ink.bad }] })}
        />
      </Card>
      <Card i={1} reduce={reduce} title="Clicked vs reported" style={{ ...card, gridColumn: 'span 3' }} data-ins-trend="culture">
        <Trend
          points={t.months}
          label={`Reported ${pc1(last?.reportRate)} and clicked ${pc1(last?.hooked)} of emails delivered in ${last?.range}`}
          lo={-0.05}
          hi={0.62}
          ticks={[0, 0.2, 0.4, 0.6]}
          tickText={pc}
          zones={[{ from: P.target, to: 0.62, color: ink.good }]}
          targets={[{ v: P.target, color: ink.good, label: `Report target ${targetText(P, '%')}`, below: true }, { v: H.target, color: ink.bad, label: `Click target ${targetText(H, '%')}`, below: true }]}
          lines={[{ key: 'reportRate', color: ink.good, end: true, name: 'Reported', text: pc1 }, { key: 'hooked', color: ink.bad, end: true, name: 'Clicked', text: pc1, dy: 6 }]}
          right={52}
          tip={(s) => ({ head: s.range, rows: [{ label: 'Reported', value: pc1(s.reportRate), color: ink.good }, { label: 'Clicked', value: pc1(s.hooked), color: ink.bad }] })}
        />
      </Card>
      <Card i={2} reduce={reduce} title="Compromise rate" style={{ ...card, gridColumn: 'span 2' }} data-ins-trend="gave">
        <Trend
          points={t.months}
          label={`Compromise rate: ${pc1(last?.gave)} in ${last?.range}; the target is ${targetText(G, '%')}`}
          lo={0}
          hi={gaveHi}
          ticks={steps(gaveHi, gaveHi > 0.08 ? 0.05 : 0.02)}
          tickText={pc}
          zones={[{ from: 0, to: G.target, color: ink.good }]}
          columns={{ key: 'gave', split: { at: G.target, below: ink.good, above: ink.bad }, text: pc1 }}
          right={10}
          tip={(s) => ({ head: s.range, rows: [{ label: 'Compromise rate', value: pc1(s.gave), color: s.gave <= G.target ? ink.good : ink.bad }] })}
        />
      </Card>
      <Card i={3} reduce={reduce} title="Avg time for reporting" style={{ ...card, gridColumn: 'span 2' }} data-ins-trend="report-time">
        <Trend
          points={t.months}
          label={`Average minutes from sending to a report: ${mins(last?.avgReport)} in ${last?.range}; the target is ${targetText(F, 'min')}`}
          lo={0}
          hi={avgHi}
          ticks={steps(avgHi, avgHi > 120 ? 30 : 15)}
          tickText={minutes}
          columns={{ key: 'avgReport', colorOf: (v) => (v <= F.target ? ink.good : ink.bad), text: minutes }}
          right={10}
          tip={(s) => ({ head: s.range, rows: [{ label: 'Avg time for reporting', value: mins(s.avgReport), color: s.avgReport <= F.target ? ink.good : ink.bad }] })}
        />
      </Card>
      <Card i={4} reduce={reduce} title="Training effectiveness" style={{ ...card, gridColumn: 'span 2' }} data-ins-trend="training">
        <ClickRateColumns
          ink={ink}
          groups={[
            { key: 'trained', name: 'Completed training', people: c?.trained, rate: c?.trainedRate, color: ink.good },
            { key: 'untrained', name: 'No training', people: c?.untrained, rate: c?.untrainedRate, color: ink.bad },
          ]}
          note={liftNote(x)}
        />
      </Card>
    </div>
  );
}

// ----------------------------------------------------------- Departments

// lower is better first (risk score, high risk, hook rate, compromise
// rate), then higher is better (report rate, trained rate); Open rate,
// neither, has no target
const DEPT_COLS = [
  { key: 'riskScore', name: 'Risk score', text: (v) => v.toFixed(1), unit: '' },
  { key: 'highRiskShare', name: 'High risk', text: pc1, unit: '%' },
  { key: 'openRate', name: 'Open rate', text: pc1, unit: '%', noTarget: true },
  { key: 'hookRate', name: 'Hook rate', text: pc1, unit: '%' },
  { key: 'gaveDetails', name: 'Compromise rate', text: pc1, unit: '%' },
  { key: 'reportRate', name: 'Report rate', text: pc1, unit: '%' },
  { key: 'trainingCompletion', name: 'Trained rate', text: pc, unit: '%' },
];
const DEPT_GRID = 'minmax(0,1.6fr) repeat(7, minmax(0,1fr)) 64px 14px';
const ARROW_GREY = '#64748B';

// against the period before: ▲ or ▼, green when it moved towards the target
// and red when away (grey for a measure with no target), or "–" when it did
// not change as shown; nothing when there is no figure to compare with
function Trendlet({ now, before, T, ink, text }) {
  const box = { display: 'inline-block', width: 12, marginLeft: 4, textAlign: 'center', fontSize: TYPE.label };
  if (!Number.isFinite(now) || !Number.isFinite(before)) return <span style={box} />;
  if (text(now) === text(before)) return <span data-ins-move="same" title="No change" style={{ ...box, fontSize: TYPE.strong, fontWeight: 800, color: ARROW_GREY }}>–</span>;
  const up = now > before;
  const better = T ? (T.better === 'down' ? !up : up) : null;
  return <span data-ins-move={better === null ? 'moved' : better ? 'better' : 'worse'} title={`${up ? 'Up' : 'Down'} on the period before${better === null ? '' : better ? ', better' : ', worse'}`} style={{ ...box, color: better === null ? ARROW_GREY : better ? ink.good : ink.bad }}>{up ? '▲' : '▼'}</span>;
}

// what the arrows compare with, over the table
function MoveLegend({ m, ink }) {
  const DAY = 86400000;
  const day1 = (t) => day(t + DAY);
  const before = `${day1(m.basis.from - m.basis.days * DAY)} – ${day(m.basis.from)}`;
  const item = (glyph, color, words) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}><span aria-hidden style={{ fontWeight: 800, color }}>{glyph}</span>{words}</span>;
  return (
    <span data-ins-move-legend style={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: '4px 12px', ...small, fontWeight: 600 }}>
      <span style={{ whiteSpace: 'nowrap' }}><strong style={{ color: 'var(--text)' }}>▲ ▼</strong> compared with the previous {m.basis.days} days ({before})</span>
      {item('▲▼', ink.good, 'better')}
      {item('▲▼', ink.bad, 'worse')}
      {item('–', ARROW_GREY, 'no change')}
    </span>
  );
}

export function DepartmentsPage({ ctx }) {
  const { m, depts, ink, reduce, targets: T, openDept } = ctx;
  return (
    <Card i={0} reduce={reduce} title="Departments against targets" action={<MoveLegend m={m} ink={ink} />} style={{ ...card, flex: 1 }} data-ins-depts>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 6 }}>
        <div aria-hidden style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: DEPT_GRID, columnGap: 8, alignItems: 'end', padding: '0 8px 6px', borderBottom: '1px solid var(--hair-strong)' }}>
          <span style={{ fontSize: TYPE.label, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)' }}>Department</span>
          {DEPT_COLS.map((c) => (
            <span key={c.key} style={{ textAlign: 'center', lineHeight: 1.3 }}>
              <span style={{ display: 'block', fontSize: TYPE.label, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ fontSize: TYPE.small, fontWeight: 700, color: c.noTarget ? 'var(--muted)' : 'var(--text)' }}>{c.noTarget ? 'No target' : targetText(T[c.key], c.unit)}</span>
            </span>
          ))}
          <span style={{ textAlign: 'right', fontSize: TYPE.label, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)' }}>People</span>
          <span />
        </div>
        <FitList
          items={depts}
          rowH={30}
          what="departments"
          render={(d, k) => (
            <button key={d.name} type="button" className="ins-row" data-ins-dept-row={d.name} onClick={() => openDept(d.name)} aria-label={`${d.name}: ${DEPT_COLS.map((c) => `${c.name} ${Number.isFinite(d.now[c.key]) ? c.text(d.now[c.key]) : 'no figure'}`).join(', ')}. Open it`} style={{ '--d': `${k * 0.012}s`, flexShrink: 0, display: 'grid', gridTemplateColumns: DEPT_GRID, columnGap: 8, alignItems: 'center', height: 30, padding: '0 8px', border: 'none', borderBottom: '1px solid var(--row-hair)', background: 'transparent', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ fontSize: TYPE.strong, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
              {DEPT_COLS.map((c) => {
                const v = d.now[c.key];
                const ok = Number.isFinite(v) && !c.noTarget && within(v, T[c.key]);
                return (
                  <span key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: TYPE.strong, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: !Number.isFinite(v) || c.noTarget ? 'var(--text)' : ok ? ink.good : ink.bad }}>
                    {Number.isFinite(v) ? c.text(v) : '—'}
                    <Trendlet now={v} before={d.before?.[c.key]} T={c.noTarget ? null : T[c.key]} ink={ink} text={c.text} />
                  </span>
                );
              })}
              <span style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{num(d.people)}</span>
              <span aria-hidden style={{ color: 'var(--muted)', fontWeight: 700 }}>›</span>
            </button>
          )}
        />
      </div>
    </Card>
  );
}

// The department's risk levels: a row each, its bar now and a thin grey
// one for 30 days before on one scale, the count now and its change, green
// when it moved the safe way (more Low, fewer of the rest) and red when not.
// A row opens its people now; the grey bar, its people 30 days before.
const TIERS = [['low', 'Low'], ['moderate', 'Moderate'], ['high', 'High'], ['critical', 'Critical']];
function LevelRows({ tiers, before, ink, onLevel }) {
  const col = { low: ink.good, moderate: ink.caution, high: ink.bad, critical: ink.severe };
  const max = Math.max(1, ...TIERS.map(([k]) => Math.max(tiers[k] || 0, before?.[k] || 0)));
  const chip = (k) => {
    if (!before) return null;
    const d = (tiers[k] || 0) - (before[k] || 0);
    const good = d === 0 ? null : (k === 'low') === (d > 0);
    const c = good === null ? 'var(--muted)' : good ? ink.good : ink.bad;
    return <span style={{ minWidth: 34, textAlign: 'center', padding: '1px 6px', borderRadius: 999, fontSize: TYPE.label, fontWeight: 800, color: c, background: good === null ? 'var(--track)' : alpha(c, 0.12) }}>{d > 0 ? '+' : ''}{num(d)}</span>;
  };
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
        {TIERS.map(([k, word]) => (
          <div key={k} data-ins-level={`now:${word}`} {...pressable(() => onLevel(word, 'now'))} {...tip(`${num(tiers[k])} people`)} style={{ display: 'grid', gridTemplateColumns: '84px minmax(0,1fr) 92px', alignItems: 'center', columnGap: 10, cursor: 'pointer' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: TYPE.strong, fontWeight: 700 }}><span aria-hidden style={{ width: 9, height: 9, borderRadius: 3, background: col[k] }} />{word}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ height: 12, width: `${((tiers[k] || 0) / max) * 100}%`, minWidth: 3, background: col[k], borderRadius: '0 5px 5px 0' }} />
              {before && <span data-ins-level={`before:${word}`} onClick={(e) => { e.stopPropagation(); onLevel(word, 'before'); }} data-tip={`${num(before[k])} people, 30 days ago`} style={{ height: 5, width: `${((before[k] || 0) / max) * 100}%`, minWidth: 3, background: 'var(--tick)', borderRadius: '0 3px 3px 0' }} />}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              <strong style={{ fontSize: TYPE.figure, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{num(tiers[k])}</strong>
              {chip(k)}
            </span>
          </div>
        ))}
      </div>
      {before && (
        <span style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 14, paddingTop: 6, borderTop: '1px solid var(--hair)', ...small, fontWeight: 700 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span aria-hidden style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--muted)' }} />Now</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span aria-hidden style={{ width: 9, height: 4, borderRadius: 2, background: 'var(--tick)' }} />30 days ago</span>
        </span>
      )}
    </div>
  );
}

// The reasons people are at risk, four equal tiles in a 2 × 2 grid, each in
// its own colour: how many people, the reason, their share of the
// department. A person can have more than one. A tile opens its people.
const DRIVER_COLOR = { neverReported: '#4F46E5', repeatClicker: '#D04052', overdue: '#C2690B', quizFailedTwice: '#7C3AED' };
function DriverTiles({ drivers, people: total, onOpen }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gridTemplateRows: 'repeat(2, minmax(0,1fr))', gap: 10, marginTop: 6 }}>
      {drivers.map((dr) => (
        <div key={dr.key} data-ins-driver={dr.key} {...pressable(() => onOpen(dr))} {...tip(dr.rule)} style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, padding: '8px 14px', borderRadius: 10, background: DRIVER_COLOR[dr.key], color: '#FFFFFF', cursor: 'pointer' }}>
          <strong style={{ fontSize: TYPE.heading, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{num(dr.count)}</strong>
          <span style={{ fontSize: TYPE.body, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dr.label}</span>
          <span style={{ fontSize: TYPE.small, fontWeight: 500, opacity: 0.85 }}>{pc1(total ? dr.count / total : null)} of people</span>
        </div>
      ))}
    </div>
  );
}

// a bar per row on one 0–100% scale, green within the target and red past it
function RateRows({ rows, T, ink, onRow }) {
  const max = Math.max(0.2, ...rows.map((r) => r.v || 0)) * 1.15;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
      {rows.map((r) => (
        <div key={r.name} data-ins-lure={r.name} {...pressable(() => onRow(r))} {...tip(r.tip)} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr) 56px', alignItems: 'center', columnGap: 10, cursor: 'pointer' }}>
          <span style={{ fontSize: TYPE.strong, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
          <span style={{ height: 10, borderRadius: 5, background: 'var(--track)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${((r.v || 0) / max) * 100}%`, background: within(r.v, T) ? ink.good : ink.bad, borderRadius: 5, transformOrigin: 'left' }} /></span>
          <span style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 800 }}>{pc1(r.v)}</span>
        </div>
      ))}
    </div>
  );
}

const monthName = (to) => new Date(to).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
const TIER_KEY = { Low: 'low', Moderate: 'moderate', High: 'high', Critical: 'critical' };
const asTiers = (c) => Object.fromEntries(Object.entries(TIER_KEY).map(([w, k]) => [k, c[w]]));

/**
 * One department's own charts, the second level, all counted from the
 * people table (services/insightsPeople.js), so each figure opens exactly
 * the people it counts: a month's column its people at high risk that
 * month, a level its people at that level, a reason the people it applies
 * to, a campaign type those who clicked one.
 */
export function DepartmentPage({ ctx, name }) {
  const { table, ink, reduce, targets: T, people } = ctx;
  const byMonth = useMemo(() => levelsByMonth(table.rows, table.months, name), [table, name]);
  const mine = useMemo(() => table.rows.filter((x) => x.department === name), [table, name]);
  const lures = useMemo(() => {
    const by = {};
    mine.forEach((x) => {
      const seen = {};
      x.records.forEach((r) => { (seen[r.type] ||= { got: 1, clicked: 0 }).clicked ||= r.clicked; });
      Object.entries(seen).forEach(([type, v]) => { const t = (by[type] ||= { type, got: 0, clicked: 0 }); t.got += 1; t.clicked += v.clicked; });
    });
    return Object.values(by).map((t) => ({ ...t, v: t.got ? t.clicked / t.got : null })).sort((a, b) => b.v - a.v).slice(0, 6);
  }, [mine]);
  const now = byMonth.at(-1);
  if (!now?.people) return null;
  const last = byMonth.length - 1;
  const limit = T.highRiskShare.target * now.people;
  const hi = Math.max(limit, ...byMonth.map((s) => s.high)) * 1.2;
  const drivers = DRIVERS.map((dr) => ({ ...dr, count: mine.filter((x) => x.drivers[dr.key]).length }));
  const at = { department: name };
  return (
    <div data-ins-dept={name} style={grid('minmax(0,1fr) minmax(0,1fr)', 'minmax(0,1fr) minmax(0,1fr)')}>
      <Card i={0} reduce={reduce} title="People at high risk" style={card}>
        <Trend
          points={byMonth}
          label={`People at high risk in ${name}, 30 days at a time: ${num(now.high)} now`}
          lo={0}
          hi={hi}
          ticks={steps(hi, hi > 300 ? 100 : 50)}
          tickText={(v) => num(v)}
          zones={[{ from: 0, to: limit, color: ink.good }]}
          columns={{ key: 'high', colorOf: (v) => (v <= limit ? ink.good : ink.bad), text: num }}
          right={10}
          tip={(s) => ({ head: head(s), rows: [{ label: 'At high risk', value: num(s.high), color: s.high <= limit ? ink.good : ink.bad }] })}
          onPick={(k) => people(`At high risk in ${monthName(byMonth[k].to)}`, { ...at, levels: ['High', 'Critical'], month: k, monthLabel: monthName(byMonth[k].to) })}
        />
      </Card>
      <Card i={1} reduce={reduce} title="Risk levels" style={card}>
        <LevelRows tiers={asTiers(now)} before={last > 0 ? asTiers(byMonth[last - 1]) : null} ink={ink} onLevel={(level, when) => (when === 'before'
          ? people(`${level} risk, 30 days ago`, { ...at, level, month: last - 1, monthLabel: monthName(byMonth[last - 1].to) })
          : people(`${level} risk`, { ...at, level }))} />
      </Card>
      <Card i={2} reduce={reduce} title="Risk drivers" style={card} data-ins-drivers>
        <DriverTiles drivers={drivers} people={now.people} onOpen={(dr) => people(dr.label, { ...at, driver: dr.key })} />
      </Card>
      <Card i={3} reduce={reduce} title="Hook rate, by campaign type" style={card}>
        <RateRows rows={lures.map((l) => ({ name: l.type, v: l.v, tip: `${num(l.clicked)} of ${num(l.got)} people` }))} T={T.hookRate} ink={ink} onRow={(r) => people(`${r.name} emails · who clicked`, { ...at, campaignType: r.name, did: 'clicked' })} />
      </Card>
    </div>
  );
}

// ------------------------------------------------------------- Campaigns

const CAMP_GRID = 'minmax(0,2fr) 64px 60px 70px 70px 76px 84px';
const SORTS = [
  { id: 'newest', label: 'Newest', by: (a, b) => +new Date(b.started) - +new Date(a.started) },
  { id: 'clicked', label: 'Most clicked', by: (a, b) => (b.hooked ?? 0) - (a.hooked ?? 0) },
  { id: 'reported', label: 'Most reported', by: (a, b) => (b.reportRate ?? 0) - (a.reportRate ?? 0) },
];

export function CampaignsPage({ ctx }) {
  const { m, ink, reduce, people } = ctx;
  const [sort, setSort] = useState('newest');
  const rows = [...m.campaigns].sort(SORTS.find((s) => s.id === sort).by);
  const max = Math.max(0.3, ...m.lures.map((l) => Math.max(l.hooked || 0, l.reportRate || 0))) * 1.1;
  const head = { fontSize: TYPE.label, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)' };
  const seg = (
    <span role="tablist" aria-label="Sort campaigns" style={{ display: 'inline-flex', padding: 2, borderRadius: 9, background: 'var(--plate)', border: '1px solid var(--hair)' }}>
      {SORTS.map((s) => <button key={s.id} type="button" role="tab" aria-selected={sort === s.id} onClick={() => setSort(s.id)} style={{ height: 24, padding: '0 10px', borderRadius: 7, border: 'none', background: sort === s.id ? 'var(--base)' : 'transparent', boxShadow: sort === s.id ? '0 1px 3px rgba(15,23,42,0.12)' : 'none', color: sort === s.id ? 'var(--brand)' : 'var(--muted)', fontSize: TYPE.body, fontWeight: 700, cursor: 'pointer' }}>{s.label}</button>)}
    </span>
  );
  return (
    <div style={grid('minmax(0,0.85fr) minmax(0,2fr)', 'minmax(0,1fr)')}>
      <Card i={0} reduce={reduce} title="By campaign type" style={card} data-ins-lures>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', marginTop: 6 }}>
          {m.lures.map((l) => (
            <div key={l.type} {...pressable(() => people(`Clicked a ${l.type} email`, { campaignType: l.type, did: 'clicked' }))} {...tip(`${num(l.clicked)} clicks`)} style={{ display: 'grid', rowGap: 3, cursor: 'pointer' }}>
              <span style={{ fontSize: TYPE.strong, fontWeight: 700 }}>{l.type}</span>
              {[[l.hooked, ink.bad], [l.reportRate, ink.good]].map(([v, col], k) => (
                <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'block', height: 11, width: `${((v || 0) / max) * 100}%`, background: col, borderRadius: '0 5px 5px 0', transformOrigin: 'left' }} />
                  <span style={{ fontSize: TYPE.body, fontWeight: 800, color: 'var(--text)' }}>{pc1(v)}</span>
                </span>
              ))}
            </div>
          ))}
          <span style={{ display: 'flex', gap: 14, ...small, fontWeight: 700 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: ink.bad }} />Hook rate</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: ink.good }} />Report rate</span>
          </span>
        </div>
      </Card>
      <Card i={1} reduce={reduce} title="Campaigns" action={seg} style={card} data-ins-campaigns>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 6 }}>
          <div aria-hidden style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: CAMP_GRID, columnGap: 8, padding: '0 8px 6px', borderBottom: '1px solid var(--hair-strong)' }}>
            <span style={head}>Campaign</span><span style={head}>Started</span><span style={{ ...head, textAlign: 'right' }}>Emails</span><span style={{ ...head, textAlign: 'right' }}>Open rate</span><span style={{ ...head, textAlign: 'right' }}>Hook rate</span><span style={{ ...head, textAlign: 'right' }}>Report rate</span><span style={{ ...head, textAlign: 'right' }}>Compromise rate</span>
          </div>
          <FitList
            key={sort}
            items={rows}
            rowH={32}
            what="campaigns"
            render={(c, k) => (
              <button key={c.id} type="button" className="ins-row" data-ins-campaign-row={c.id} onClick={() => people(c.name, { campaign: c.name })} {...tip(`${num(c.delivered)} people`)} style={{ '--d': `${k * 0.012}s`, flexShrink: 0, display: 'grid', gridTemplateColumns: CAMP_GRID, columnGap: 8, alignItems: 'center', height: 32, padding: '0 8px', border: 'none', borderBottom: '1px solid var(--row-hair)', background: 'transparent', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                <span style={{ fontSize: TYPE.strong, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                <span style={{ ...small, fontSize: TYPE.body }}>{day(+new Date(c.started))}</span>
                <span style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 800 }}>{num(c.delivered)}</span>
                <span style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 700 }}>{pc1(c.openRate)}</span>
                <span style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 800, color: ink.bad }}>{pc1(c.hooked)}</span>
                <span style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 800, color: ink.good }}>{pc1(c.reportRate)}</span>
                <span style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 700 }}>{pc1(c.delivered ? c.compromised / c.delivered : null)}</span>
              </button>
            )}
          />
        </div>
      </Card>
    </div>
  );
}

// how many times as likely the untrained are to click, in words either way
// (real data can show trained people clicking more: training follows a click)
function liftNote(x) {
  if (!Number.isFinite(x) || x <= 0) return null;
  if (Math.abs(x - 1) < 0.05) return 'Trained and untrained people click about as often';
  return x > 1 ? `Trained people click ${x.toFixed(1)}× less` : `Trained people click ${(1 / x).toFixed(1)}× more`;
}

// -------------------------------------------------------------- Training

// people from all, through trained or not, to clicked or not; drawn at the
// card's own size so its words stay on the type scale
function Sankey({ cohorts, ink, onOpen }) {
  const [box, { w, h }] = useSize();
  const tr = cohorts.trained; const nt = cohorts.untrained;
  const trc = Math.round(tr * (cohorts.trainedRate || 0)); const ntc = Math.round(nt * (cohorts.untrainedRate || 0));
  const all = tr + nt; const clicked = trc + ntc;
  const W = Math.max(320, w); const H = Math.max(140, h);
  const top = 6; const bw = 12; const g = 10;
  const sc = (H - top * 2 - g) / all;
  const x0 = 64; const x2 = W - 104; const x1 = Math.round(x0 + (x2 - x0) * 0.6);
  const yN = top + tr * sc + g;
  const yNC = top + clicked * sc + g;
  const band = (xa, ya, xb, yb, hh, c, key, onClick, title) => (
    <path key={key} d={`M${xa + bw},${ya} C${(xa + xb) / 2},${ya} ${(xa + xb) / 2},${yb} ${xb},${yb} V${yb + hh} C${(xa + xb) / 2},${yb + hh} ${(xa + xb) / 2},${ya + hh} ${xa + bw},${ya + hh} Z`} fill={c} onClick={onClick} data-tip={title} style={{ cursor: onClick ? 'pointer' : 'default' }} />
  );
  const node = (x, y, hh, c) => <rect x={x} y={y} width={bw} height={Math.max(2, hh)} rx={3} fill={c} />;
  const label = (x, y, a, sub, anchor) => (
    <g style={{ pointerEvents: 'none' }}>
      <text x={x} y={y - 2} textAnchor={anchor} style={{ fontSize: TYPE.strong, fontWeight: 700, fill: 'var(--text)', stroke: 'var(--card)', strokeWidth: 3, paintOrder: 'stroke', strokeLinejoin: 'round' }}>{a}</text>
      <text x={x} y={y + 12} textAnchor={anchor} style={{ fontSize: TYPE.small, fontWeight: 700, fill: 'var(--muted)', stroke: 'var(--card)', strokeWidth: 3, paintOrder: 'stroke', strokeLinejoin: 'round' }}>{sub}</text>
    </g>
  );
  return (
    <div ref={box} style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative' }}>
      {w > 0 && h > 0 && (
        <svg width={W} height={H} role="img" aria-label={`${num(tr)} trained people, ${pc1(cohorts.trainedRate)} clicked; ${num(nt)} not yet trained, ${pc1(cohorts.untrainedRate)} clicked`} style={{ position: 'absolute', inset: 0, display: 'block' }}>
          {band(x0, top, x1, top, tr * sc, alpha('#64748B', 0.14), 'a')}
          {band(x0, top + tr * sc, x1, yN, nt * sc, alpha('#64748B', 0.14), 'b')}
          {band(x1, top, x2, top, trc * sc, alpha(ink.bad, 0.35), 'c', () => onOpen('Trained, and clicked', { step: 'Passed', did: 'clicked' }), `${num(trc)} people`)}
          {band(x1, top + trc * sc, x2, yNC, (tr - trc) * sc, alpha(ink.good, 0.2), 'd', () => onOpen('Trained, and did not click', { step: 'Passed' }), `${num(tr - trc)} people`)}
          {band(x1, yN, x2, top + trc * sc, ntc * sc, alpha(ink.bad, 0.5), 'e', () => onOpen('Not yet trained, and clicked', { step: 'Not started', did: 'clicked' }), `${num(ntc)} people`)}
          {band(x1, yN + ntc * sc, x2, yNC + (tr - trc) * sc, (nt - ntc) * sc, alpha(ink.good, 0.3), 'f', () => onOpen('Not yet trained', { step: 'Not started' }), `${num(nt - ntc)} people`)}
          {node(x0, top, all * sc + g, '#334155')}
          {node(x1, top, tr * sc, '#475569')}
          {node(x1, yN, nt * sc, '#94A3B8')}
          {node(x2, top, clicked * sc, ink.bad)}
          {node(x2, yNC, (all - clicked) * sc, ink.good)}
          {label(x0 - 8, top + (all * sc) / 2, 'People', num(all), 'end')}
          {label(x1 - 8, top + (tr * sc) / 2, 'Trained', `${num(tr)} · ${pc1(cohorts.trainedRate)} clicked`, 'end')}
          {label(x1 - 8, yN + (nt * sc) / 2, 'Not trained', `${num(nt)} · ${pc1(cohorts.untrainedRate)} clicked`, 'end')}
          {label(x2 + bw + 8, top + (clicked * sc) / 2 + 4, 'Clicked', num(clicked), 'start')}
          {label(x2 + bw + 8, yNC + ((all - clicked) * sc) / 2, 'Did not click', num(all - clicked), 'start')}
        </svg>
      )}
    </div>
  );
}

// a name, its trained rate as a bar and a figure, then a column for each of `cols`
const trainGrid = (n) => `minmax(0,1.6fr) minmax(0,1fr) 40px${' 74px'.repeat(n)}`;
function TrainRows({ items, cols, what, ink, onRow }) {
  const head = { fontSize: TYPE.label, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)' };
  const grid = trainGrid(cols.length - 1);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 6 }}>
      <div aria-hidden style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: grid, columnGap: 8, padding: '0 8px 6px', borderBottom: '1px solid var(--hair-strong)' }}>
        <span style={head}>{cols[0]}</span><span style={head}>Trained rate</span><span />
        {cols.slice(1).map((c) => <span key={c} style={{ ...head, textAlign: 'right', whiteSpace: 'nowrap' }}>{c}</span>)}
      </div>
      <FitList
        items={items}
        rowH={28}
        what={what}
        render={(x, k) => (
          <button key={x.name} type="button" className="ins-row" onClick={() => onRow(x)} {...tip(x.tip)} style={{ '--d': `${k * 0.012}s`, flexShrink: 0, display: 'grid', gridTemplateColumns: grid, columnGap: 8, alignItems: 'center', height: 28, padding: '0 8px', border: 'none', borderBottom: '1px solid var(--row-hair)', background: 'transparent', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
            <span style={{ fontSize: TYPE.strong, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</span>
            <span style={{ height: 7, borderRadius: 4, background: 'var(--track)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${(x.done || 0) * 100}%`, background: ink.measure, borderRadius: 4, transformOrigin: 'left' }} /></span>
            <span style={{ fontSize: TYPE.strong, fontWeight: 800 }}>{pc(x.done)}</span>
            {x.right.map((v, i) => <span key={cols[i + 1]} style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 800 }}>{v}</span>)}
          </button>
        )}
      />
    </div>
  );
}

const score0 = (v) => (Number.isFinite(v) ? v.toFixed(0) : '—');
const daysText = (v) => (Number.isFinite(v) ? `${v.toFixed(1)} d` : '—');

// The training lift: how often each group clicked an email sent in the
// period, as columns: trained after a click (assigned), trained by choice
// (voluntary), not trained. Each column opens its people.
function LiftColumns({ groups, ink, onOpen }) {
  const max = Math.max(0.05, ...groups.map((g) => g.rate || 0)) * 1.15;
  const label = { Assigned: 'Assigned training', Voluntary: 'Voluntary training', None: 'No training' };
  return (
    <div role="group" aria-label="Click rate by training" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-end', gap: 18, padding: '14px 10px 0', borderBottom: '1px solid var(--hair-strong)' }}>
        {groups.map((g) => (
          <div key={g.key} data-ins-lift-col={g.key} {...pressable(() => onOpen(`${label[g.key]}`, { trained: g.key }))} {...tip(`${num(g.clicked)} of ${num(g.people)} people clicked`)} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', cursor: 'pointer' }}>
            <span style={{ fontSize: TYPE.figure, fontWeight: 800, marginBottom: 4 }}>{pc1(g.rate)}</span>
            <span style={{ width: '46%', height: `${((g.rate || 0) / max) * 82}%`, minHeight: 2, background: ink.measure, borderRadius: '6px 6px 0 0' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 18, padding: '5px 10px 0' }}>
        {groups.map((g) => (
          <span key={g.key} style={{ flex: 1, display: 'grid', justifyItems: 'center', textAlign: 'center' }}>
            <span style={{ ...small, fontWeight: 700, color: 'var(--text)' }}>{label[g.key]}</span>
            <span style={{ ...small }}>{num(g.people)} people</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function TrainingPage({ ctx, programmes }) {
  const { p, ink, reduce, people } = ctx;
  const t = p.now.training;
  const flow = [['Assigned', t.assigned, null], ['Started', t.started, 'Started'], ['Completed', t.completed, 'Completed'], ['Passed', t.passed, 'Passed']];
  const depts = [...p.departments].sort((a, b) => (b.training.completion ?? 0) - (a.training.completion ?? 0));
  return (
    <div style={grid('minmax(0,1fr) minmax(0,1fr)', 'minmax(0,0.85fr) minmax(0,1.15fr)')}>
      <Card i={0} reduce={reduce} title="Training lift" action={<span style={{ ...small, fontWeight: 700 }}>Click rate</span>} style={card} data-ins-lift>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 4 }}>
          {p.now.cohorts?.groups ? <LiftColumns groups={p.now.cohorts.groups} ink={ink} onOpen={people} />
            : p.now.cohorts && <Sankey cohorts={p.now.cohorts} ink={ink} onOpen={people} />}
        </div>
      </Card>
      <Card i={1} reduce={reduce} title="Training progress" style={card} data-ins-funnel>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-end', gap: 18, padding: '18px 10px 0' }}>
          {flow.map(([label, v, step]) => (
            <div key={label} {...pressable(() => people(label, step ? { step } : {}))} {...tip(`${num(v)} people`)} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', cursor: 'pointer' }}>
              <span style={{ fontSize: TYPE.figure, fontWeight: 800, marginBottom: 4 }}>{num(v)}</span>
              <span style={{ width: '46%', height: `${t.assigned ? (v / t.assigned) * 78 : 0}%`, background: ink.measure, borderRadius: '6px 6px 0 0' }} />
              <span style={{ ...small, fontWeight: 700, marginTop: 5 }}>{label}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card i={2} reduce={reduce} title="Departments" style={card} data-ins-train-depts>
        <TrainRows items={depts.map((d) => ({ name: d.name, done: d.training.completion, right: [pc(d.training.quizPassRate), score0(d.training.quizScore)], tip: `${num(d.training.assigned)} assigned` }))} cols={['Department', 'Pass rate', 'Avg quiz score']} what="departments" ink={ink} onRow={(x) => people(x.name, { department: x.name, step: 'Started' })} />
      </Card>
      <Card i={3} reduce={reduce} title="Programmes" style={card} data-ins-programmes>
        <TrainRows items={[...programmes].sort((a, b) => (b.completion ?? 0) - (a.completion ?? 0)).map((x) => ({ name: x.program, done: x.completion, right: [pc(x.quizPassRate), score0(x.quizScore), daysText(x.avgDays)], tip: `${num(x.assigned)} assigned` }))} cols={['Programme', 'Pass rate', 'Avg quiz score', 'Avg time']} what="programmes" ink={ink} onRow={(x) => people(x.name, { programme: x.name })} />
      </Card>
    </div>
  );
}
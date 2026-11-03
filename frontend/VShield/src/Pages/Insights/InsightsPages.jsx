import { useState } from 'react';

import { Card } from './InsightsCharts';
import { FitList } from './InsightsBits';
import { Trend } from './InsightsTrends';
import { useSize } from './useSize';
import { trends } from '../../services/insightsSummary';
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
const head = (s) => `30 days to ${day(s.to)}`;
const steps = (hi, by) => Array.from({ length: Math.floor(hi / by) + 1 }, (_, k) => k * by);
const within = (v, T) => (T.better === 'down' ? v <= T.target : v >= T.target);
const grid = (cols, rows) => ({ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: cols, gridTemplateRows: rows, gap: 12 });
const card = { background: 'var(--base)', borderRadius: 16, padding: '12px 16px 10px' };
// a clickable mark shows its count on hover (useHoverTip in Insights.jsx)
const tip = (text) => ({ 'data-tip': text });
const pressable = (onClick) => ({ role: 'button', tabIndex: 0, onClick, onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }, style: { cursor: 'pointer' } });

// --------------------------------------------------------------- Summary

export function SummaryPage({ ctx }) {
  const { m, p, ink, reduce, targets: T } = ctx;
  const t = trends(m, p);
  const R = T.riskScore; const H = T.hookRate; const P = T.reportRate; const G = T.gaveDetails; const F = T.firstReport;
  const lo = Math.floor(Math.min(...t.risk.map((s) => s.score), R.target) / 2) * 2 - 2;
  const hi = Math.ceil(Math.max(...t.risk.map((s) => s.score), R.target) / 2) * 2 + 2;
  const gaveHi = Math.max(G.target * 3, ...t.months.map((s) => s.gave || 0)) * 1.2;
  const firstHi = Math.max(F.target + 5, ...t.months.map((s) => s.firstReport || 0)) * 1.15;
  const c = t.training;
  return (
    <div data-ins-summary style={grid('repeat(6, minmax(0,1fr))', 'minmax(0,1.1fr) minmax(0,1fr)')}>
      <Card i={0} reduce={reduce} title="Risk score" style={{ ...card, gridColumn: 'span 3' }} data-ins-trend="risk">
        <Trend
          points={t.risk}
          label={`Risk Score, 30 days at a time: ${t.risk.at(-1)?.score.toFixed(1)} now; the target is ${targetText(R)}`}
          lo={lo}
          hi={hi}
          ticks={steps(hi, 2).filter((v) => v >= lo)}
          tickText={(v) => v}
          zones={[{ from: lo, to: R.target, color: ink.good }, { from: R.target, to: hi, color: ink.bad }]}
          lines={[{ key: 'score', dots: true, split: { at: R.target, below: ink.good, above: ink.bad } }]}
          tag={{ key: 'score', text: (v) => v.toFixed(1) }}
          right={44}
          tip={(s) => ({ head: head(s), rows: [{ label: 'Risk Score', value: s.score.toFixed(1), color: s.score <= R.target ? ink.good : ink.bad }] })}
        />
      </Card>
      <Card i={1} reduce={reduce} title="Clicked vs reported" style={{ ...card, gridColumn: 'span 3' }} data-ins-trend="culture">
        <Trend
          points={t.months}
          label={`Reported ${pc1(t.months.at(-1)?.reportRate)} and clicked ${pc1(t.months.at(-1)?.hooked)} of emails delivered in the latest 30 days`}
          lo={-0.05}
          hi={0.62}
          ticks={[0, 0.2, 0.4, 0.6]}
          tickText={pc}
          zones={[{ from: P.target, to: 0.62, color: ink.good }]}
          targets={[{ v: P.target, color: ink.good, label: `Report target ${targetText(P, '%')}`, below: true }, { v: H.target, color: ink.bad, label: `Click target ${targetText(H, '%')}`, below: true }]}
          lines={[{ key: 'reportRate', color: ink.good, end: true, name: 'Reported', text: pc1 }, { key: 'hooked', color: ink.bad, end: true, name: 'Clicked', text: pc1, dy: 6 }]}
          right={52}
          tip={(s) => ({ head: head(s), rows: [{ label: 'Reported', value: pc1(s.reportRate), color: ink.good }, { label: 'Clicked', value: pc1(s.hooked), color: ink.bad }] })}
        />
      </Card>
      <Card i={2} reduce={reduce} title="Gave details away" style={{ ...card, gridColumn: 'span 2' }} data-ins-trend="gave">
        <Trend
          points={t.months}
          label={`Gave details away: ${pc1(t.months.at(-1)?.gave)} in the latest 30 days; the target is ${targetText(G, '%')}`}
          lo={0}
          hi={gaveHi}
          ticks={steps(gaveHi, gaveHi > 0.08 ? 0.05 : 0.02)}
          tickText={pc}
          zones={[{ from: 0, to: G.target, color: ink.good }]}
          columns={{ key: 'gave', split: { at: G.target, below: ink.good, above: ink.bad }, text: pc1 }}
          right={10}
          tip={(s) => ({ head: head(s), rows: [{ label: 'Gave details away', value: pc1(s.gave), color: s.gave <= G.target ? ink.good : ink.bad }] })}
        />
      </Card>
      <Card i={3} reduce={reduce} title="Time to first report" style={{ ...card, gridColumn: 'span 2' }} data-ins-trend="first">
        <Trend
          points={t.months}
          label={`Median minutes to the first report: ${mins(t.months.at(-1)?.firstReport)} in the latest 30 days; the target is ${targetText(F, 'min')}`}
          lo={0}
          hi={firstHi}
          ticks={steps(firstHi, 10)}
          tickText={minutes}
          columns={{ key: 'firstReport', colorOf: (v) => (v <= F.target ? ink.good : ink.bad), text: minutes }}
          right={10}
          tip={(s) => ({ head: head(s), rows: [{ label: 'First report', value: mins(s.firstReport), color: s.firstReport <= F.target ? ink.good : ink.bad }] })}
        />
      </Card>
      <Card i={4} reduce={reduce} title="Training effectiveness" sub="Share of people who clicked a phishing email" style={{ ...card, gridColumn: 'span 2' }} data-ins-trend="training">
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['Not trained', c.untrained, ink.bad, p.now.cohorts?.untrained], ['Trained', c.trained, ink.good, p.now.cohorts?.trained]].map(([label, v, col, who]) => (
              <div key={label} data-ins-cohort={label} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 12, background: 'var(--plate)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: TYPE.body, fontWeight: 700 }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 3, background: col }} />{label}</span>
                <span style={{ fontSize: TYPE.heading, fontWeight: 800, color: col, lineHeight: 1 }}>{pc1(v)}</span>
                <span style={{ height: 6, borderRadius: 3, background: 'var(--track)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${Math.min(100, ((v || 0) / 0.25) * 100)}%`, background: col, borderRadius: 3 }} /></span>
                <span style={small}>clicked, of {num(who)} people</span>
              </div>
            ))}
          </div>
          {c.untrained !== null && c.trained !== null && (
            <span data-ins-lift style={{ ...small, fontSize: TYPE.body, textAlign: 'center' }}>
              Clicks drop from <strong style={{ color: ink.bad, fontWeight: 800 }}>{pc1(c.untrained)}</strong> to <strong style={{ color: ink.good, fontWeight: 800 }}>{pc1(c.trained)}</strong> after training
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}

// ----------------------------------------------------------- Departments

const DEPT_COLS = [
  { key: 'riskScore', name: 'Risk score', text: (v) => v.toFixed(1), unit: '' },
  { key: 'highRiskShare', name: 'High risk', text: pc1, unit: '%' },
  { key: 'hookRate', name: 'Hook rate', text: pc1, unit: '%' },
  { key: 'reportRate', name: 'Report rate', text: pc1, unit: '%' },
  { key: 'gaveDetails', name: 'Gave details', text: pc1, unit: '%' },
  { key: 'trainingCompletion', name: 'Completed', text: pc, unit: '%' },
];
const DEPT_GRID = 'minmax(0,1.6fr) repeat(6, minmax(0,1fr)) 64px 14px';

// up or down on the period before: green when it moved towards the target
function Trendlet({ now, before, T, ink }) {
  if (!Number.isFinite(now) || !Number.isFinite(before) || now === before) return <span style={{ width: 10 }} />;
  const up = now > before;
  const better = T.better === 'down' ? !up : up;
  return <span aria-hidden style={{ fontSize: TYPE.label, marginLeft: 5, color: better ? ink.good : ink.bad }}>{up ? '▲' : '▼'}</span>;
}

export function DepartmentsPage({ ctx }) {
  const { depts, ink, reduce, targets: T, openDept } = ctx;
  return (
    <Card i={0} reduce={reduce} title="Departments against targets" style={{ ...card, flex: 1 }} data-ins-depts>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 6 }}>
        <div aria-hidden style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: DEPT_GRID, columnGap: 8, alignItems: 'end', padding: '0 8px 6px', borderBottom: '1px solid var(--hair-strong)' }}>
          <span style={{ fontSize: TYPE.label, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)' }}>Department</span>
          {DEPT_COLS.map((c) => (
            <span key={c.key} style={{ textAlign: 'center', lineHeight: 1.3 }}>
              <span style={{ display: 'block', fontSize: TYPE.label, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ fontSize: TYPE.small, fontWeight: 700, color: 'var(--text)' }}>{targetText(T[c.key], c.unit)}</span>
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
                const ok = Number.isFinite(v) && within(v, T[c.key]);
                return (
                  <span key={c.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: TYPE.strong, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: !Number.isFinite(v) ? 'var(--muted)' : ok ? ink.good : ink.bad }}>
                    {Number.isFinite(v) ? c.text(v) : '—'}
                    <Trendlet now={v} before={d.before?.[c.key]} T={T[c.key]} ink={ink} />
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

// the department's risk levels, now over 30 days before
const TIERS = [['low', 'Low'], ['moderate', 'Moderate'], ['high', 'High'], ['critical', 'Critical']];
function Levels({ tiers, before, ink, onLevel }) {
  const col = { low: ink.good, moderate: ink.caution, high: ink.bad, critical: ink.severe };
  const total = (t) => TIERS.reduce((a, [k]) => a + (t?.[k] || 0), 0);
  const bar = (t, label) => {
    const n = total(t);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '84px minmax(0,1fr)', alignItems: 'center', gap: 10 }}>
        <span style={{ ...small, fontWeight: 700 }}>{label}</span>
        <span style={{ display: 'flex', height: 24, gap: 2, borderRadius: 6, overflow: 'hidden' }}>
          {TIERS.map(([k, word]) => {
            const w = n ? (t[k] / n) * 100 : 0;
            return <span key={k} {...pressable(() => onLevel(word))} {...tip(`${num(t[k])} people`)} style={{ width: `${w}%`, background: col[k], color: '#FFFFFF', fontSize: TYPE.label, fontWeight: 700, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{w > 7 ? `${Math.round(w)}%` : ''}</span>;
          })}
        </span>
      </div>
    );
  };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
      {bar(tiers, 'Now')}
      {before && bar(before, '30 days ago')}
      <span style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginLeft: 94, ...small, fontWeight: 700 }}>
        {TIERS.map(([k, word]) => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: col[k] }} />{word} {num(tiers[k])}</span>)}
      </span>
    </div>
  );
}

function Ring({ value, label, count, onOpen, color }) {
  const r = 26; const c = 2 * Math.PI * r;
  return (
    <div {...pressable(onOpen)} {...tip(`${num(count)} people`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center', cursor: 'pointer' }}>
      <svg width={68} height={68} aria-hidden>
        <circle cx={34} cy={34} r={r} fill="none" stroke="var(--track)" strokeWidth={7} />
        <circle cx={34} cy={34} r={r} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${c * Math.min(1, value)} ${c}`} transform="rotate(-90 34 34)" />
        <text x={34} y={38} textAnchor="middle" style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: TYPE.title, fill: 'var(--text)' }}>{(value * 100).toFixed(1)}%</text>
      </svg>
      <strong style={{ fontSize: TYPE.figure, fontWeight: 800 }}>{num(count)}</strong>
      <span style={{ ...small, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

// a bar per row on one 0–100% scale, green within the target and red past it
function RateRows({ rows, T, ink, onRow }) {
  const max = Math.max(0.2, ...rows.map((r) => r.v || 0)) * 1.15;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly' }}>
      {rows.map((r) => (
        <div key={r.name} {...pressable(() => onRow(r))} {...tip(r.tip)} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0,1fr) 56px', alignItems: 'center', columnGap: 10, cursor: 'pointer' }}>
          <span style={{ fontSize: TYPE.strong, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
          <span style={{ height: 10, borderRadius: 5, background: 'var(--track)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${((r.v || 0) / max) * 100}%`, background: within(r.v, T) ? ink.good : ink.bad, borderRadius: 5, transformOrigin: 'left' }} /></span>
          <span style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 800 }}>{pc1(r.v)}</span>
        </div>
      ))}
    </div>
  );
}

/** One department's own charts: the second level. */
export function DepartmentPage({ ctx, name }) {
  const { m, p, org, ink, reduce, targets: T, people } = ctx;
  const d = p.departments.find((x) => x.name === name);
  if (!d) return null;
  const idx = org.at(-1).departments.findIndex((x) => x.name === name);
  const months = org.slice(-6).map((s) => { const x = s.departments[idx]; return { to: s.to, high: x.tiers.high + x.tiers.critical, people: x.people }; });
  const limit = T.highRiskShare.target * d.people;
  const hi = Math.max(limit, ...months.map((s) => s.high)) * 1.2;
  // what puts people at risk, as the organisation's sample works it out from the levels
  const drivers = [
    ['Never reported', Math.round(d.tiers.moderate * 0.46), { did: 'clicked', levels: ['Moderate'] }],
    ['Clicked 2+ times', Math.round(d.tiers.high * 0.86), { did: 'twice' }],
    ['Training overdue', Math.round(d.people * (1 - (d.training.completion ?? 0.9)) * 0.2), { step: 'Not started' }],
    ['Failed quiz twice', Math.round(d.people * 0.016), { step: 'Completed' }],
  ];
  const lures = (m.deptLures[name] || []).slice(0, 6);
  const at = { department: name };
  return (
    <div data-ins-dept={name} style={grid('minmax(0,1fr) minmax(0,1fr)', 'minmax(0,1fr) minmax(0,1fr)')}>
      <Card i={0} reduce={reduce} title="People at high risk" style={card} onOpen={() => people('People at high or critical risk', { ...at, levels: ['High', 'Critical'] })} openLabel="People">
        <Trend
          points={months}
          label={`People at high risk in ${name}, 30 days at a time: ${num(months.at(-1)?.high)} now`}
          lo={0}
          hi={hi}
          ticks={steps(hi, hi > 300 ? 100 : 50)}
          tickText={(v) => num(v)}
          zones={[{ from: 0, to: limit, color: ink.good }]}
          columns={{ key: 'high', colorOf: (v) => (v <= limit ? ink.good : ink.bad), text: num }}
          right={10}
          tip={(s) => ({ head: head(s), rows: [{ label: 'At high risk', value: num(s.high), color: s.high <= limit ? ink.good : ink.bad }] })}
        />
      </Card>
      <Card i={1} reduce={reduce} title="Risk levels" style={card}>
        <Levels tiers={d.tiers} before={d.tiersBefore} ink={ink} onLevel={(level) => people(`${level} risk`, { ...at, level })} />
      </Card>
      <Card i={2} reduce={reduce} title="What puts people at risk" style={card}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', alignItems: 'center' }}>
          {drivers.map(([label, count, f]) => <Ring key={label} label={label} count={count} value={count / d.people} color={ink.bad} onOpen={() => people(label, { ...at, ...f })} />)}
        </div>
      </Card>
      <Card i={3} reduce={reduce} title="Hook rate, by campaign type" style={card}>
        <RateRows rows={lures.map((l) => ({ name: l.type, v: l.hooked, tip: `${num(l.clicked)} clicks` }))} T={T.hookRate} ink={ink} onRow={(r) => people(`Clicked a ${r.name} email`, { ...at, campaignType: r.name, did: 'clicked' })} />
      </Card>
    </div>
  );
}

// ------------------------------------------------------------- Campaigns

const CAMP_GRID = 'minmax(0,2fr) 70px 70px 80px 84px 84px';
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
            <span style={head}>Campaign</span><span style={head}>Started</span><span style={{ ...head, textAlign: 'right' }}>Emails</span><span style={{ ...head, textAlign: 'right' }}>Hook rate</span><span style={{ ...head, textAlign: 'right' }}>Report rate</span><span style={{ ...head, textAlign: 'right' }}>Gave details</span>
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

const TRAIN_GRID = 'minmax(0,1.6fr) minmax(0,1fr) 40px 64px';
function TrainRows({ items, cols, what, ink, onRow }) {
  const head = { fontSize: TYPE.label, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)' };
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 6 }}>
      <div aria-hidden style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: TRAIN_GRID, columnGap: 8, padding: '0 8px 6px', borderBottom: '1px solid var(--hair-strong)' }}>
        <span style={head}>{cols[0]}</span><span style={head}>Completed</span><span /><span style={{ ...head, textAlign: 'right', whiteSpace: 'nowrap' }}>{cols[1]}</span>
      </div>
      <FitList
        items={items}
        rowH={28}
        what={what}
        render={(x, k) => (
          <button key={x.name} type="button" className="ins-row" onClick={() => onRow(x)} {...tip(x.tip)} style={{ '--d': `${k * 0.012}s`, flexShrink: 0, display: 'grid', gridTemplateColumns: TRAIN_GRID, columnGap: 8, alignItems: 'center', height: 28, padding: '0 8px', border: 'none', borderBottom: '1px solid var(--row-hair)', background: 'transparent', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
            <span style={{ fontSize: TYPE.strong, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</span>
            <span style={{ height: 7, borderRadius: 4, background: 'var(--track)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${(x.done || 0) * 100}%`, background: ink.measure, borderRadius: 4, transformOrigin: 'left' }} /></span>
            <span style={{ fontSize: TYPE.strong, fontWeight: 800 }}>{pc(x.done)}</span>
            <span style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 800 }}>{x.right}</span>
          </button>
        )}
      />
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
      <Card i={0} reduce={reduce} title="Training lift" style={card} data-ins-lift>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 4 }}>{p.now.cohorts && <Sankey cohorts={p.now.cohorts} ink={ink} onOpen={people} />}</div>
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
        <TrainRows items={depts.map((d) => ({ name: d.name, done: d.training.completion, right: Number.isFinite(d.training.quizScore) ? d.training.quizScore.toFixed(0) : '—', tip: `${num(d.training.assigned)} assigned` }))} cols={['Department', 'Quiz score']} what="departments" ink={ink} onRow={(x) => people(x.name, { department: x.name, step: 'Started' })} />
      </Card>
      <Card i={3} reduce={reduce} title="Programmes" style={card} data-ins-programmes>
        <TrainRows items={[...programmes].sort((a, b) => b.completion - a.completion).map((x) => ({ name: x.program, done: x.completion / 100, right: `${x.pass}%`, tip: `${x.completion}% completed` }))} cols={['Programme', 'Pass rate']} what="programmes" ink={ink} onRow={(x) => people(x.name, { programme: x.name })} />
      </Card>
    </div>
  );
}

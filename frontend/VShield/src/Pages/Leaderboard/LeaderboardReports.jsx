import { useEffect, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Building2, Crown, Search, TriangleAlert, Users } from 'lucide-react';

import LevelBadge from '../../GlobalComponents/LevelBadge';
import { LEVEL_BY_ID } from '../../services/levels';
import { REPORT_INK } from './reportInk';

// The leaderboard's Reports view, for leaders and admins: what a campaign did
// (how people responded, how fast, by department, and what it did to points
// and levels), and how the organisation is doing across campaigns (the trend,
// where people stand by level, departments side by side). Plus the rail's
// campaign list and the "At a glance" card that stands in for How to earn
// points on staff screens.
//
// Colours: teal for reporting (good), red for clicking and giving details away
// (bad), indigo for plain magnitude, slate for the neutral steps. The pairs
// are checked for colour-blind separation on both themes; every coloured mark
// also has its words beside it.


const pc = (v, digits = 1) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(digits)}%`);
const num = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;
const mins = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };

// A change against a comparison: the arrow and its colour say whether the move is good.
const Delta = ({ value, upIsGood, ink, unit = 'pts', note }) => {
  if (value === null || value === undefined || Number.isNaN(value)) return <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)' }}>{note}</span>;
  const flat = Math.abs(value) < 0.0005;
  const good = flat ? null : (value > 0) === upIsGood;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
      {!flat && <Icon size={10} strokeWidth={3} color={good ? ink.good : ink.bad} aria-hidden />}
      <span style={{ color: flat ? 'var(--muted)' : good ? ink.good : ink.bad }}>{flat ? 'Same' : `${(Math.abs(value) * 100).toFixed(1)} ${unit}`}</span>
      {note}
    </span>
  );
};

// One headline figure: a label, the value, and what it is compared with.
const Kpi = ({ label, value, unit, foot }) => (
  <div style={{ minWidth: 0, padding: '0 16px', borderLeft: '1px solid var(--hair)' }}>
    <div style={eyebrow}>{label}</div>
    <div className="vs-rank" style={{ fontSize: 21, fontWeight: 900, lineHeight: 1, color: 'var(--text)', marginTop: 8, whiteSpace: 'nowrap' }}>
      {value}
      {unit && <span style={{ fontSize: 10, fontWeight: 800, marginLeft: 3, color: 'var(--muted)' }}>{unit}</span>}
    </div>
    <div style={{ marginTop: 6, minHeight: 12 }}>{foot}</div>
  </div>
);

const Panel = ({ title, sub, right, children, style }) => (
  <section style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', ...style }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</div>
        {sub && <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
    {children}
  </section>
);

// A thin bar with a 4px rounded end, on a track of its own.
const Bar = ({ frac, color, height = 8, label }) => (
  <span role="img" aria-label={label} title={label} style={{ display: 'block', height, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
    <span style={{ display: 'block', height: '100%', width: `${Math.max(0, Math.min(1, frac)) * 100}%`, background: color, borderRadius: '0 4px 4px 0' }} />
  </span>
);

const th = { ...eyebrow, fontSize: 8, padding: '0 0 6px', textAlign: 'left', position: 'sticky', top: 0, background: 'var(--base)' };
const td = { fontSize: 10.5, fontWeight: 600, color: 'var(--text)', padding: '6px 0', borderTop: '1px solid var(--hair)', whiteSpace: 'nowrap' };

// --- campaign ---------------------------------------------------------------

function CampaignKpis({ r, org, ink }) {
  return (
    <>
      <Kpi label="Reported" value={pc(r.rates.report)} foot={<Delta value={r.rates.report - org.rates.report} upIsGood ink={ink} note="vs average" />} />
      <Kpi label="Clicked" value={pc(r.rates.click)} foot={<Delta value={r.rates.click - org.rates.click} upIsGood={false} ink={ink} note="vs average" />} />
      <Kpi label="Gave details away" value={pc(r.rates.compromise)} foot={<Delta value={r.rates.compromise - org.rates.compromise} upIsGood={false} ink={ink} note="vs average" />} />
      <Kpi label="Reports per click" value={r.resilience === null ? '—' : r.resilience.toFixed(1)} unit="×" foot={<span style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)' }}>{r.resilience >= 1 ? 'More report than click' : 'More click than report'}</span>} />
      <Kpi label="First report" value={r.timing.firstReport} unit="min" foot={<span style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)' }}>First click after {r.timing.firstClick} min</span>} />
    </>
  );
}

function Responses({ r, ink }) {
  const steps = [
    { label: 'Delivered', n: r.delivered, color: ink.neutral },
    { label: 'Opened', n: r.opened, color: ink.neutral },
    { label: 'Clicked a link', n: r.clicked, color: ink.bad },
    { label: 'Gave details away', n: r.compromised, color: ink.bad },
  ];
  const row = (s, k) => (
    <div key={k} style={{ display: 'grid', gridTemplateColumns: '108px minmax(0,1fr) 92px', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text)' }}>{s.label}</span>
      <Bar frac={s.n / r.delivered} color={s.color} label={`${s.label}: ${num(s.n)}, ${pc(s.n / r.delivered)}`} />
      <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {num(s.n)} <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{pc(s.n / r.delivered, 0)}</span>
      </span>
    </div>
  );
  return (
    <Panel title="How people responded" sub={`${num(r.delivered)} of ${num(r.sent)} emails delivered`}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
        {steps.map(row)}
        <div style={{ borderTop: '1px solid var(--hair)' }} />
        {row({ label: 'Reported it', n: r.reported, color: ink.good }, 'rep')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10, paddingTop: 14 }}>
        {[['First report', r.timing.firstReport], ['Half reported by', r.timing.medianReport], ['First click', r.timing.firstClick]].map(([l, m]) => (
          <div key={l} style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--track)' }}>
            <div style={{ ...eyebrow, fontSize: 8 }}>{l}</div>
            <div className="vs-rank" style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>{mins(m)}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CampaignDepartments({ r, ink }) {
  const best = r.departments[0];
  return (
    <Panel title="Departments" sub={best ? `${best.name} reported most` : ''}>
      <div className="vs-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Department</th>
              <th style={{ ...th, textAlign: 'right' }}>People</th>
              <th style={{ ...th, paddingLeft: 14 }}>Reported</th>
              <th style={{ ...th, textAlign: 'right' }}>Clicked</th>
              <th style={{ ...th, textAlign: 'right' }}>Net pts</th>
            </tr>
          </thead>
          <tbody>
            {r.departments.map((d) => (
              <tr key={d.name}>
                <td style={{ ...td, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }} title={d.name}>{d.name}</td>
                <td style={{ ...td, textAlign: 'right', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{num(d.recipients)}</td>
                <td style={{ ...td, paddingLeft: 14, width: '34%' }}>
                  <span style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 38px', alignItems: 'center', gap: 6 }}>
                    <Bar frac={d.reportRate / 0.6} color={ink.good} height={6} label={`${d.name} reported ${pc(d.reportRate)}`} />
                    <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pc(d.reportRate, 0)}</span>
                  </span>
                </td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pc(d.clickRate, 0)}</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: d.net >= 0 ? ink.good : ink.bad, fontWeight: 800 }}>{signed(d.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function PointsAndLevels({ r, ink }) {
  const line = (icon, value, label, color) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' }}>
      <span aria-hidden style={{ width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center', background: 'var(--track)', color }}>{icon}</span>
      <span className="vs-rank" style={{ fontSize: 13, fontWeight: 900, color: 'var(--text)', minWidth: 62 }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)' }}>{label}</span>
    </div>
  );
  return (
    <Panel title="Points and levels" sub={`${signed(r.points.net)} pts net from this campaign`}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        {line(<ArrowUp size={12} strokeWidth={3} />, `+${num(r.points.earned)}`, 'pts earned', ink.good)}
        {line(<ArrowDown size={12} strokeWidth={3} />, `−${num(r.points.lost)}`, 'pts lost', ink.bad)}
      </div>
      <div style={{ borderTop: '1px solid var(--hair)', paddingTop: 4 }}>
        {line(<ArrowUp size={12} strokeWidth={3} />, num(r.levels.up), 'moved up a grade', ink.good)}
        {line(<ArrowDown size={12} strokeWidth={3} />, num(r.levels.down), 'moved down a grade', ink.bad)}
        {line(<TriangleAlert size={12} strokeWidth={2.6} />, num(r.levels.belowZero), 'fell below zero', ink.bad)}
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>
          <span>Trained after clicking</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{pc(r.rates.trainedAfterClick, 0)}</span>
        </div>
        <Bar frac={r.rates.trainedAfterClick} color={ink.good} height={6} label={`Trained after clicking: ${pc(r.rates.trainedAfterClick)}`} />
      </div>
      <div>
      <div style={{ ...eyebrow, marginBottom: 4 }}>First to report</div>
      {r.firstReporters.map((p, i) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
          <span style={{ width: 16, display: 'grid', placeItems: 'center', color: i === 0 ? '#E8B30B' : 'var(--muted)' }}>{i === 0 ? <Crown size={13} strokeWidth={2.4} aria-hidden /> : <span style={{ fontSize: 10, fontWeight: 800 }}>{i + 1}</span>}</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{p.minutes} min</span>
        </div>
      ))}
      </div>
      </div>
    </Panel>
  );
}

// --- organisation -----------------------------------------------------------

function OrgKpis({ o, ink }) {
  return (
    <>
      <Kpi label="Report rate" value={pc(o.rates.report)} foot={<Delta value={o.change.report} upIsGood ink={ink} note="vs earlier" />} />
      <Kpi label="Click rate" value={pc(o.rates.click)} foot={<Delta value={o.change.click} upIsGood={false} ink={ink} note="vs earlier" />} />
      <Kpi label="Gave details away" value={pc(o.rates.compromise)} foot={<span style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)' }}>Across {o.campaigns} campaigns</span>} />
      <Kpi label="Average score" value={num(o.avgScore)} unit="pts" foot={<span style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)' }}>Per person</span>} />
      <Kpi label="At risk" value={num(o.atRisk)} unit="people" foot={<span style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)' }}>Below zero points</span>} />
    </>
  );
}

// Reported and clicked rates across recent campaigns: two lines on one axis.
function Trend({ o, ink }) {
  const [hover, setHover] = useState(null);
  const id = useId();
  const box = useRef(null);
  const [size, setSize] = useState({ w: 360, h: 220 });
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setSize({ w: Math.max(200, el.clientWidth), h: Math.max(140, el.clientHeight) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = size.w;
  const H = size.h;
  const pad = { l: 32, r: 38, t: 10, b: 24 };
  const pts = o.trend;
  const top = Math.max(0.1, Math.ceil(Math.max(...pts.map((p) => Math.max(p.report, p.click))) * 10) / 10);
  const x = (i) => pad.l + (pts.length > 1 ? (i / (pts.length - 1)) * (W - pad.l - pad.r) : 0);
  const y = (v) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const path = (key) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const ticks = Array.from({ length: Math.round(top * 10) + 1 }, (_, k) => k / 10).filter((t, k, all) => all.length <= 6 || k % 2 === 0);
  const series = [{ key: 'report', label: 'Reported', color: ink.good }, { key: 'click', label: 'Clicked', color: ink.bad }];
  const h = hover === null ? null : pts[hover];
  return (
    <Panel
      title="Reported vs clicked"
      sub={`Last ${pts.length} campaigns, oldest first`}
      right={(
        <span style={{ display: 'flex', gap: 10 }}>
          {series.map((s) => (
            <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 700, color: 'var(--muted)' }}>
              <span aria-hidden style={{ width: 12, height: 2, borderRadius: 2, background: s.color }} />
              {s.label}
            </span>
          ))}
        </span>
      )}
    >
      <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-labelledby={`${id}-t`} style={{ display: 'block', overflow: 'visible' }}>
          <title id={`${id}-t`}>Reported and clicked rates across the last {pts.length} campaigns</title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--hair)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fontWeight="700" fill="var(--muted)">{Math.round(t * 100)}%</text>
            </g>
          ))}
          {pts.map((p, i) => (i % 2 === pts.length % 2 || i === pts.length - 1) && (
            <text key={p.id} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--muted)">{p.started}</text>
          ))}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeWidth="1" vectorEffect="non-scaling-stroke" opacity="0.5" />}
          {series.map((s) => (
            <g key={s.key}>
              <path d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              <text x={x(pts.length - 1) + 8} y={y(pts.at(-1)[s.key]) + 3.5} fontSize="10" fontWeight="800" fill="var(--text)">{pc(pts.at(-1)[s.key], 0)}</text>
            </g>
          ))}
          {(hover === null ? [pts.length - 1] : [hover]).map((i) => series.map((s) => (
            <circle key={`${s.key}-${i}`} cx={x(i)} cy={y(pts[i][s.key])} r="4" fill={s.color} stroke="var(--base)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          )))}
          {pts.map((p, i) => (
            <rect
              key={`hit-${p.id}`}
              x={x(i) - (W - pad.l - pad.r) / (2 * Math.max(1, pts.length - 1))}
              y={0}
              width={(W - pad.l - pad.r) / Math.max(1, pts.length - 1)}
              height={H}
              fill="transparent"
              tabIndex={0}
              aria-label={`${p.name}: reported ${pc(p.report)}, clicked ${pc(p.click)}`}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            />
          ))}
        </svg>
        {h && (
          <div role="status" style={{ position: 'absolute', top: 4, left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > pts.length / 2 ? '-105%' : '5%'})`, pointerEvents: 'none', padding: '7px 9px', borderRadius: 10, background: 'var(--base)', border: '1px solid var(--hair)', boxShadow: '0 6px 16px rgba(15,23,42,0.14)', minWidth: 140 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--text)', marginBottom: 4, whiteSpace: 'nowrap' }}>{h.name}</div>
            {series.map((s) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, color: 'var(--muted)', fontWeight: 600 }}>
                <span aria-hidden style={{ width: 10, height: 2, background: s.color, borderRadius: 2 }} />
                <strong style={{ color: 'var(--text)' }}>{pc(h[s.key])}</strong> {s.label.toLowerCase()}
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

const FAMILY_NAMES = { L7: 'Cyber Guardian', L6: 'Security Defender', L5: 'Security Champion', L4: 'Phish Catcher', L3: 'Safe Handler', L2: 'Aware User', L1: 'New Joiner', L0: 'Awareness Needed', LN1: 'Vulnerable User', LN2: 'Critical Risk' };
const FAMILY_BADGE = { L7: 'L7G1', L6: 'L6G1', L5: 'L5G1', L4: 'L4G1', L3: 'L3G1', L2: 'L2G1', L1: 'L1G1', L0: 'L0', LN1: 'LN1', LN2: 'LN2' };

function Levels({ o, ink }) {
  const most = Math.max(1, ...o.levels.map((l) => l.count));
  const total = o.levels.reduce((a, l) => a + l.count, 0) || 1;
  return (
    <Panel title="Where people stand" sub="Everyone on the board, by level">
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minHeight: 0 }}>
        {o.levels.map((l) => {
          const below = LEVEL_BY_ID[FAMILY_BADGE[l.family]]?.level <= 0;
          return (
            <div key={l.family} style={{ display: 'grid', gridTemplateColumns: '18px 112px minmax(0,1fr) 54px', alignItems: 'center', gap: 8 }}>
              <LevelBadge levelId={FAMILY_BADGE[l.family]} size={18} tilt={false} decorative />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{FAMILY_NAMES[l.family]}</span>
              <Bar frac={l.count / most} color={below ? ink.bad : ink.mag} height={7} label={`${FAMILY_NAMES[l.family]}: ${l.count} people`} />
              <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {l.count} <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{pc(l.count / total, 0)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function OrgDepartments({ o, ink }) {
  return (
    <Panel title="Departments" sub="Ranked by average score">
      <div className="vs-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Department</th>
              <th style={{ ...th, textAlign: 'right' }}>Avg pts</th>
              <th style={{ ...th, textAlign: 'right' }}>Reported</th>
              <th style={{ ...th, textAlign: 'right' }}>Clicked</th>
              <th style={{ ...th, textAlign: 'right' }}>At risk</th>
            </tr>
          </thead>
          <tbody>
            {o.departments.map((d) => (
              <tr key={d.name}>
                <td style={{ ...td, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 700 }} title={`${d.name} · ${d.people} people`}>{d.name}</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(d.avgScore)}</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pc(d.reportRate, 0)}</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pc(d.clickRate, 0)}</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {d.atRisk ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: ink.bad, fontWeight: 800 }}>
                      <TriangleAlert size={11} strokeWidth={2.6} aria-hidden />
                      {d.atRisk}
                    </span>
                  ) : <span style={{ color: 'var(--muted)' }}>0</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// --- the sheet ----------------------------------------------------------------

/**
 * The Reports sheet, in the same L shape as the board: a colour tile top left
 * naming what is reported on, the headline figures along the arm, and three
 * panels below.
 */
export function ReportsSheet({ kind, title, sub, counter, counterLabel, report, org, isDark, shell }) {
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  const { CAP_W, CAP_H, L_GAP, L_R, FILLET, PASTEL_INK } = shell;
  return (
    <div data-lb-reports={kind} style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...(isDark ? PASTEL_INK : null), position: 'absolute', top: 0, left: 0, width: CAP_W, height: CAP_H, zIndex: 2, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, background: 'var(--cap-reports)', borderRadius: L_R, overflow: 'hidden' }}>
        <div style={{ ...eyebrow, color: 'var(--t-reports)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {kind === 'org' ? <Building2 size={12} strokeWidth={2.6} aria-hidden /> : <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A' }} />}
          {kind === 'org' ? 'Organisation report' : 'Campaign report'}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.16, color: 'var(--text)' }}>{title}</div>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.35, maxWidth: 196 }}>{sub}</div>
        <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 2, padding: '4px 10px', borderRadius: 999, background: 'var(--chip)', fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>
          <Users size={13} strokeWidth={2.4} />
          <span className="lb-mono" style={{ fontWeight: 800, color: 'var(--text)' }}>{counter}</span>
          {counterLabel}
        </span>
      </div>
      <svg aria-hidden width={FILLET} height={FILLET} viewBox={`0 0 ${FILLET} ${FILLET}`} style={{ position: 'absolute', top: CAP_H - L_R, left: CAP_W - L_R, zIndex: 1, display: 'block' }}>
        <path d={`M 0 ${FILLET} A ${FILLET} ${FILLET} 0 0 0 ${FILLET} 0 V ${FILLET} H 0 Z`} fill="var(--base)" />
      </svg>

      {/* the arm: headline figures */}
      <div data-report-kpis style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', alignItems: 'center', padding: '0 12px 0 4px', background: 'var(--base)', borderTop: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderRadius: `${L_R}px ${L_R}px 0 0` }}>
        {kind === 'org' ? <OrgKpis o={org} ink={ink} /> : <CampaignKpis r={report} org={org} ink={ink} />}
      </div>

      {/* the base: three panels */}
      <div data-report-panels style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: kind === 'org' ? '1.15fr 1fr 1.05fr' : '1fr 1.2fr 0.85fr', gap: 28, padding: '18px 24px 20px', background: 'var(--base)', borderLeft: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', borderRadius: `${L_R}px 0 ${L_R}px ${L_R}px` }}>
        {kind === 'org' ? (
          <>
            <Trend o={org} ink={ink} />
            <Levels o={org} ink={ink} />
            <OrgDepartments o={org} ink={ink} />
          </>
        ) : (
          <>
            <Responses r={report} ink={ink} />
            <CampaignDepartments r={report} ink={ink} />
            <PointsAndLevels r={report} ink={ink} />
          </>
        )}
      </div>
    </div>
  );
}

// --- the rail -------------------------------------------------------------------

/**
 * The rail's list of campaigns, with a search box. Each row shows how much of
 * the campaign has been reported so far. `org` adds an Organisation row on top
 * (for Reports). `tint` is the selected row's colour.
 */
export function CampaignList({ campaigns, selected, onSelect, reportRateOf, isDark, ink, tint, org, label }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q ? campaigns.filter((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)) : campaigns;
  const pick = (sel) => ({
    ...(sel && isDark ? { '--text': '#0F172A', '--muted': '#475569', '--track': 'rgba(15,23,42,0.08)' } : null),
    border: sel ? `1.5px solid ${tint.edge}` : '1px solid var(--hair)',
    background: sel ? (isDark ? '#FFFFFF' : tint.fill) : 'var(--rail)',
    boxShadow: sel ? `0 4px 12px ${tint.glow}` : 'none',
  });
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 6px' }}>
        <span style={{ ...eyebrow, fontSize: 9 }}>{label} · {campaigns.length}</span>
      </div>
      <label style={{ flexShrink: 0, position: 'relative', display: 'block', margin: '0 4px 8px 0' }}>
        <span className="sr-only">Search campaigns</span>
        <Search size={13} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search campaigns"
          style={{ width: '100%', boxSizing: 'border-box', height: 32, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)', padding: '0 10px 0 30px', fontSize: 10.5, fontWeight: 600, outline: 'none' }}
        />
      </label>
      <div className="lb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px 12px 0' }}>
        {org && !q && (
          <button type="button" onClick={() => onSelect('org')} aria-pressed={selected === 'org'} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '9px 12px', color: 'var(--text)', ...pick(selected === 'org') }}>
            <span aria-hidden style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--track)', color: 'var(--text)' }}><Building2 size={14} strokeWidth={2.4} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800 }}>Organisation</span>
              <span style={{ display: 'block', fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' }}>Every campaign, every department</span>
            </span>
          </button>
        )}
        {shown.map((c) => {
          const sel = c.id === selected;
          const rate = reportRateOf(c);
          return (
            <button key={c.id} type="button" onClick={() => onSelect(c.id)} aria-pressed={sel} style={{ flexShrink: 0, textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '8px 12px', color: 'var(--text)', ...pick(sel) }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 800, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              </span>
              <span style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 56px', alignItems: 'center', gap: 8, marginTop: 4, paddingLeft: 14 }}>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.type} · {c.started}</span>
                <span title={`${pc(rate)} reported so far`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 5 }}>
                  <Bar frac={rate / 0.5} color={ink.good} height={4} label={`${pc(rate)} reported`} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{pc(rate, 0)}</span>
                </span>
              </span>
            </button>
          );
        })}
        {!shown.length && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', padding: '10px 4px' }}>No campaign matches “{query}”.</div>}
      </div>
    </div>
  );
}

/** Staff see this where colleagues see How to earn points: the week in three numbers. */
export function GlanceCard({ org, isDark, onOpen }) {
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  const rows = [
    { label: 'Report rate', value: pc(org.rates.report), delta: <Delta value={org.change.report} upIsGood ink={ink} /> },
    { label: 'Click rate', value: pc(org.rates.click), delta: <Delta value={org.change.click} upIsGood={false} ink={ink} /> },
    { label: 'People at risk', value: num(org.atRisk), delta: <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)' }}>Below zero</span> },
  ];
  return (
    <div data-lb-glance style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--rail)', border: '1px solid var(--hair)', borderRadius: 16, padding: '14px 16px' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>At a glance</span>
      <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', marginTop: 2 }}>Last {org.campaigns} campaigns</span>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 0', borderTop: '1px solid var(--hair)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{r.label}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {r.delta}
              <span className="vs-rank" style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', minWidth: 46, textAlign: 'right' }}>{r.value}</span>
            </span>
          </div>
        ))}
      </div>
      <button type="button" onClick={onOpen} style={{ marginTop: 'auto', alignSelf: 'stretch', height: 32, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--track)', color: 'var(--text)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
        Open reports
      </button>
    </div>
  );
}

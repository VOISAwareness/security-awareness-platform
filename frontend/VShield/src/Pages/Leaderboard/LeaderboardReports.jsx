import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowRight, ArrowUp, Building2, ChevronLeft, Crown, Search, TriangleAlert, Users } from 'lucide-react';

import LevelBadge from '../../GlobalComponents/LevelBadge';
import { LEVEL_BY_ID } from '../../services/levels';
import { REPORT_INK } from './reportInk';

// Security Pulse: the leaderboard's insight view for leaders and admins.
//
// It opens calm: one headline number (reports for every click, the single
// best measure of a phishing programme) and four question cards. A card opens
// into a focused view with one chart, its key figures, and three short notes:
// what it shows, why it matters, what to do next. Back returns to the cards.
// The same four questions are asked of the whole organisation or of one
// campaign.
//
// Colours: teal for reporting (good), red for clicking and giving details
// away (bad), indigo for plain magnitude, slate for neutral steps; checked
// for colour-blind separation on both themes, and every coloured mark has its
// words beside it.

const pc = (v, digits = 1) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(digits)}%`);
const num = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;
const mins = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };
const muted = { fontSize: 10, fontWeight: 600, color: 'var(--muted)' };

// A change against a comparison: the arrow and its colour say whether the move is good.
const Delta = ({ value, upIsGood, ink, note }) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const flat = Math.abs(value) < 0.0005;
  const good = flat ? null : (value > 0) === upIsGood;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
      {!flat && <Icon size={10} strokeWidth={3} color={good ? ink.good : ink.bad} aria-hidden />}
      <span style={{ color: flat ? 'var(--muted)' : good ? ink.good : ink.bad }}>{flat ? 'Same' : `${(Math.abs(value) * 100).toFixed(1)} pts`}</span>
      {note}
    </span>
  );
};

// A thin bar with a 4px rounded end, on a track of its own.
const Bar = ({ frac, color, height = 8, label }) => (
  <span role="img" aria-label={label} title={label} style={{ display: 'block', height, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
    <span style={{ display: 'block', height: '100%', width: `${Math.max(0, Math.min(1, frac)) * 100}%`, background: color, borderRadius: '0 4px 4px 0' }} />
  </span>
);

// Measure a box, so a chart can draw at its real size (never stretched).
function useSize(fallback) {
  const ref = useRef(null);
  const [size, setSize] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setSize({ w: Math.max(120, el.clientWidth), h: Math.max(80, el.clientHeight) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

// --- charts ---------------------------------------------------------------------

// Reported and clicked rates across campaigns: two lines on one axis, a
// crosshair and tooltip on hover. `mini` drops the axes for a card.
function TrendChart({ trend, ink, mini = false }) {
  const [hover, setHover] = useState(null);
  const id = useId();
  const [box, size] = useSize({ w: 360, h: 220 });
  const W = size.w;
  const H = size.h;
  const pad = mini ? { l: 4, r: 30, t: 6, b: 6 } : { l: 34, r: 42, t: 12, b: 26 };
  const top = Math.max(0.1, Math.ceil(Math.max(...trend.map((p) => Math.max(p.report, p.click))) * 10) / 10);
  const x = (i) => pad.l + (trend.length > 1 ? (i / (trend.length - 1)) * (W - pad.l - pad.r) : 0);
  const y = (v) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const path = (key) => trend.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ');
  const ticks = Array.from({ length: Math.round(top * 10) + 1 }, (_, k) => k / 10).filter((t, k, all) => all.length <= 6 || k % 2 === 0);
  const series = [{ key: 'report', label: 'Reported', color: ink.good }, { key: 'click', label: 'Clicked', color: ink.bad }];
  const h = hover === null ? null : trend[hover];
  const step = (W - pad.l - pad.r) / Math.max(1, trend.length - 1);
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-labelledby={`${id}-t`} style={{ display: 'block', overflow: 'visible' }}>
        <title id={`${id}-t`}>Reported and clicked rates across the last {trend.length} campaigns</title>
        {!mini && ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--hair)" strokeWidth="1" />
            <text x={pad.l - 8} y={y(t) + 3} textAnchor="end" fontSize="9" fontWeight="700" fill="var(--muted)">{Math.round(t * 100)}%</text>
          </g>
        ))}
        {!mini && trend.map((p, i) => (
          <text key={p.id} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--muted)">{p.started}</text>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--muted)" strokeWidth="1" opacity="0.45" />}
        {series.map((s) => (
          <g key={s.key}>
            <path d={path(s.key)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <text x={x(trend.length - 1) + 8} y={y(trend.at(-1)[s.key]) + 3.5} fontSize={mini ? 9 : 10} fontWeight="800" fill="var(--text)">{pc(trend.at(-1)[s.key], 0)}</text>
          </g>
        ))}
        {(hover === null ? [trend.length - 1] : [hover]).map((i) => series.map((s) => (
          <circle key={`${s.key}-${i}`} cx={x(i)} cy={y(trend[i][s.key])} r="4" fill={s.color} stroke="var(--base)" strokeWidth="2" />
        )))}
        {!mini && trend.map((p, i) => (
          <rect
            key={`hit-${p.id}`}
            x={x(i) - step / 2}
            y={0}
            width={step}
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
        <div role="status" style={{ position: 'absolute', top: 6, left: x(hover), transform: `translateX(${hover > trend.length / 2 ? 'calc(-100% - 10px)' : '10px'})`, pointerEvents: 'none', padding: '8px 10px', borderRadius: 10, background: 'var(--base)', border: '1px solid var(--hair)', boxShadow: '0 6px 16px rgba(15,23,42,0.14)', minWidth: 150 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text)', marginBottom: 4, whiteSpace: 'nowrap' }}>{h.name}</div>
          {series.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>
              <span aria-hidden style={{ width: 10, height: 2, background: s.color, borderRadius: 2 }} />
              <strong style={{ color: 'var(--text)' }}>{pc(h[s.key])}</strong> {s.label.toLowerCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Minutes to the first report, campaign by campaign: one column each, the
// typical time as a line across.
function SpeedChart({ trend, typical, ink }) {
  const id = useId();
  const [box, size] = useSize({ w: 360, h: 220 });
  const W = size.w;
  const H = size.h;
  const pad = { l: 34, r: 12, t: 18, b: 26 };
  const top = Math.max(5, Math.ceil(Math.max(...trend.map((t) => t.firstReport)) / 5) * 5);
  const slot = (W - pad.l - pad.r) / trend.length;
  const bw = Math.min(24, slot * 0.5);
  const y = (v) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const best = trend.reduce((b, t, i) => (t.firstReport < trend[b].firstReport ? i : b), 0);
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-labelledby={`${id}-t`} style={{ display: 'block', overflow: 'visible' }}>
        <title id={`${id}-t`}>Minutes to the first report in each of the last {trend.length} campaigns</title>
        {[0, top / 2, top].map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--hair)" strokeWidth="1" />
            <text x={pad.l - 8} y={y(t) + 3} textAnchor="end" fontSize="9" fontWeight="700" fill="var(--muted)">{t} min</text>
          </g>
        ))}
        {trend.map((t, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const yy = y(t.firstReport);
          const h = H - pad.b - yy;
          return (
            <g key={t.id}>
              <path d={`M${cx - bw / 2},${H - pad.b} V${yy + 4} Q${cx - bw / 2},${yy} ${cx - bw / 2 + 4},${yy} H${cx + bw / 2 - 4} Q${cx + bw / 2},${yy} ${cx + bw / 2},${yy + 4} V${H - pad.b} Z`} fill={i === best ? ink.good : ink.mag} opacity={i === best ? 1 : 0.85}>
                <title>{`${t.name}: first report after ${t.firstReport} min`}</title>
              </path>
              {(i === best || i === trend.length - 1) && h > 0 && (
                <text x={cx} y={yy - 6} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="var(--text)">{t.firstReport}</text>
              )}
              <text x={cx} y={H - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--muted)">{t.started}</text>
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={y(typical)} y2={y(typical)} stroke="var(--text)" strokeWidth="1" opacity="0.55" />
        <text x={W - pad.r} y={y(typical) - 5} textAnchor="end" fontSize="9" fontWeight="800" fill="var(--text)">Typical {typical} min</text>
      </svg>
    </div>
  );
}

// The race inside one campaign: first click, first report, half reported, on a line of minutes.
function RaceChart({ timing, ink }) {
  const id = useId();
  const [box, size] = useSize({ w: 360, h: 160 });
  const W = size.w;
  const H = Math.min(size.h, 190);
  const pad = { l: 16, r: 24 };
  const stepMin = timing.medianReport * 1.15 <= 60 ? 10 : timing.medianReport * 1.15 <= 120 ? 20 : 30;
  const end = Math.max(stepMin * 2, Math.ceil((timing.medianReport * 1.15) / stepMin) * stepMin);
  const gap = timing.firstReport - timing.firstClick;
  const x = (m) => pad.l + (m / end) * (W - pad.l - pad.r);
  const mid = H / 2;
  const marks = [
    { m: timing.firstClick, label: 'First click', sub: 'the attacker’s first win', color: ink.bad, up: true },
    { m: timing.firstReport, label: 'First report', sub: 'the alarm is raised', color: ink.good, up: false },
    { m: timing.medianReport, label: 'Half reported', sub: 'most who will report have', color: ink.good, up: true, hollow: true },
  ];
  const ticks = Array.from({ length: end / stepMin + 1 }, (_, k) => k * stepMin);
  return (
    <div style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex', flexDirection: 'column' }}>
    <div style={{ flexShrink: 0, padding: '6px 0 0' }}>
      <div className="vs-rank" style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', lineHeight: 1.2 }}>
        {gap > 0 ? `The attacker had a ${mins(gap)} head start` : gap < 0 ? `We raised the alarm ${mins(-gap)} before anyone clicked` : 'The first report came as the first click did'}
      </div>
      <div style={{ ...muted, marginTop: 6 }}>Between the first click and the first report. Every minute of it is a minute a real attacker could use.</div>
    </div>
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', display: 'flex', alignItems: 'center' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-labelledby={`${id}-t`} style={{ display: 'block', overflow: 'visible' }}>
        <title id={`${id}-t`}>First click after {timing.firstClick} min, first report after {timing.firstReport} min, half of the reports in by {timing.medianReport} min</title>
        <line x1={pad.l} x2={W - pad.r} y1={mid} y2={mid} stroke="var(--hair)" strokeWidth="6" strokeLinecap="round" />
        <line x1={x(timing.firstClick)} x2={x(timing.firstReport)} y1={mid} y2={mid} stroke={ink.bad} strokeWidth="6" strokeLinecap="round" opacity="0.35" />
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={mid + 34} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--muted)">{t} min</text>
        ))}
        {marks.map((k) => (
          <g key={k.label}>
            <line x1={x(k.m)} x2={x(k.m)} y1={mid} y2={k.up ? mid - 26 : mid + 16} stroke="var(--muted)" strokeWidth="1" opacity="0.6" />
            <circle cx={x(k.m)} cy={mid} r="6" fill={k.hollow ? 'var(--base)' : k.color} stroke={k.hollow ? k.color : 'var(--base)'} strokeWidth={k.hollow ? 3 : 2} />
            <text x={x(k.m)} y={k.up ? mid - 44 : mid + 58} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="var(--text)">{k.label} · {mins(k.m)}</text>
            <text x={x(k.m)} y={k.up ? mid - 31 : mid + 71} textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--muted)">{k.sub}</text>
          </g>
        ))}
      </svg>
    </div>
    </div>
  );
}

const FAMILY_NAMES = { L7: 'Cyber Guardian', L6: 'Security Defender', L5: 'Security Champion', L4: 'Phish Catcher', L3: 'Safe Handler', L2: 'Aware User', L1: 'New Joiner', L0: 'Awareness Needed', LN1: 'Vulnerable User', LN2: 'Critical Risk' };
const FAMILY_BADGE = { L7: 'L7G1', L6: 'L6G1', L5: 'L5G1', L4: 'L4G1', L3: 'L3G1', L2: 'L2G1', L1: 'L1G1', L0: 'L0', LN1: 'LN1', LN2: 'LN2' };
const belowZero = (family) => LEVEL_BY_ID[FAMILY_BADGE[family]]?.level <= 0;

function LevelsChart({ levels, ink }) {
  const most = Math.max(1, ...levels.map((l) => l.count));
  const total = levels.reduce((a, l) => a + l.count, 0) || 1;
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      {levels.map((l) => (
        <div key={l.family} style={{ display: 'grid', gridTemplateColumns: '20px 124px minmax(0,1fr) 64px', alignItems: 'center', gap: 10 }}>
          <LevelBadge levelId={FAMILY_BADGE[l.family]} size={20} tilt={false} decorative />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{FAMILY_NAMES[l.family]}</span>
          <Bar frac={l.count / most} color={belowZero(l.family) ? ink.bad : ink.mag} height={8} label={`${FAMILY_NAMES[l.family]}: ${l.count} people`} />
          <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {l.count} <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{pc(l.count / total, 0)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// Departments, best reporters first: reported and clicked as two bars on one scale.
function TeamsChart({ teams, ink, extra }) {
  const scale = Math.max(0.05, ...teams.map((d) => Math.max(d.reportRate || 0, d.clickRate || 0)));
  return (
    <div className="vs-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(0,1fr) 46px 46px' + (extra ? ' 70px' : ''), gap: '0 12px', alignItems: 'center' }}>
        <span style={eyebrow}>Department</span>
        <span style={eyebrow}>Reported · clicked</span>
        <span style={{ ...eyebrow, textAlign: 'right' }}>Rep.</span>
        <span style={{ ...eyebrow, textAlign: 'right' }}>Click</span>
        {extra && <span style={{ ...eyebrow, textAlign: 'right' }}>{extra.label}</span>}
        {teams.map((d) => (
          <div key={d.name} style={{ display: 'contents' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '7px 0', borderTop: '1px solid var(--hair)' }} title={d.name}>{d.name}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 0', borderTop: '1px solid var(--hair)' }}>
              <Bar frac={(d.reportRate || 0) / scale} color={ink.good} height={5} label={`${d.name} reported ${pc(d.reportRate)}`} />
              <Bar frac={(d.clickRate || 0) / scale} color={ink.bad} height={5} label={`${d.name} clicked ${pc(d.clickRate)}`} />
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', padding: '7px 0', borderTop: '1px solid var(--hair)' }}>{pc(d.reportRate, 0)}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', padding: '7px 0', borderTop: '1px solid var(--hair)' }}>{pc(d.clickRate, 0)}</span>
            {extra && <span style={{ fontSize: 10.5, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums', padding: '7px 0', borderTop: '1px solid var(--hair)', color: extra.color(d) }}>{extra.value(d)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelChart({ r, ink }) {
  const steps = [
    { label: 'Delivered', n: r.delivered, color: ink.neutral, note: 'reached an inbox' },
    { label: 'Opened', n: r.opened, color: ink.neutral, note: 'harmless on its own' },
    { label: 'Clicked a link', n: r.clicked, color: ink.bad, note: 'the lure worked' },
    { label: 'Gave details away', n: r.compromised, color: ink.bad, note: 'a real attacker would be in' },
    { label: 'Reported it', n: r.reported, color: ink.good, note: 'the behaviour we want', good: true },
  ];
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' }}>
      {steps.map((s) => (
        <div key={s.label} style={{ display: 'grid', gridTemplateColumns: '150px minmax(0,1fr) 110px', alignItems: 'center', gap: 14, ...(s.good ? { paddingTop: 12, borderTop: '1px solid var(--hair)' } : null) }}>
          <span>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>{s.label}</span>
            <span style={{ ...muted, fontSize: 9.5 }}>{s.note}</span>
          </span>
          <Bar frac={s.n / r.delivered} color={s.color} height={10} label={`${s.label}: ${num(s.n)}, ${pc(s.n / r.delivered)}`} />
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {num(s.n)} <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{pc(s.n / r.delivered, 0)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function ImpactChart({ r, ink }) {
  const most = Math.max(r.points.earned, r.points.lost, 1);
  const moves = [
    { label: 'Moved up a grade', n: r.levels.up, color: ink.good, Icon: ArrowUp },
    { label: 'Moved down a grade', n: r.levels.down, color: ink.bad, Icon: ArrowDown },
    { label: 'Fell below zero', n: r.levels.belowZero, color: ink.bad, Icon: TriangleAlert },
  ];
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr) 90px', alignItems: 'center', gap: '10px 14px' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>Points earned</span>
        <Bar frac={r.points.earned / most} color={ink.good} height={10} label={`Points earned: ${num(r.points.earned)}`} />
        <span className="vs-rank" style={{ fontSize: 13, fontWeight: 900, color: 'var(--text)', textAlign: 'right' }}>+{num(r.points.earned)}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>Points lost</span>
        <Bar frac={r.points.lost / most} color={ink.bad} height={10} label={`Points lost: ${num(r.points.lost)}`} />
        <span className="vs-rank" style={{ fontSize: 13, fontWeight: 900, color: 'var(--text)', textAlign: 'right' }}>−{num(r.points.lost)}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 12 }}>
        {moves.map(({ label, n, color, Icon }) => (
          <div key={label} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--track)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, ...muted, fontSize: 9.5, fontWeight: 700 }}>
              <Icon size={12} strokeWidth={2.8} color={color} aria-hidden />
              {label}
            </span>
            <span className="vs-rank" style={{ display: 'block', fontSize: 20, fontWeight: 900, color: 'var(--text)', marginTop: 6 }}>{num(n)}</span>
          </div>
        ))}
      </div>
      <div>
        <div style={{ ...eyebrow, marginBottom: 6 }}>First to report</div>
        {r.firstReporters.map((p, i) => (
          <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--hair)' }}>
            <span style={{ width: 18, display: 'grid', placeItems: 'center', color: i === 0 ? '#E8B30B' : 'var(--muted)' }}>{i === 0 ? <Crown size={14} strokeWidth={2.4} aria-hidden /> : <span style={{ fontSize: 10.5, fontWeight: 800 }}>{i + 1}</span>}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{p.name}</span>
            <span style={{ ...muted }}>{p.dept}</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text)', minWidth: 46, textAlign: 'right' }}>{p.minutes} min</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- mini visuals for the cards -------------------------------------------------------

const MiniBars = ({ rows, ink }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%' }}>
    {rows.map((r) => (
      <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '108px minmax(0,1fr) 34px', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
        <Bar frac={r.frac} color={r.color || ink.mag} height={6} label={`${r.label}: ${r.value}`} />
        <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--text)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
      </div>
    ))}
  </div>
);

const MiniRace = ({ first, report, ink }) => {
  const end = Math.max(first, report) * 1.4 || 1;
  const at = (m) => `${(m / end) * 100}%`;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', height: 8, borderRadius: 999, background: 'var(--track)' }}>
        <span style={{ position: 'absolute', left: at(Math.min(first, report)), width: `${(Math.abs(report - first) / end) * 100}%`, top: 0, bottom: 0, background: ink.bad, opacity: 0.3, borderRadius: 999 }} />
        <span title={`First click ${first} min`} style={{ position: 'absolute', left: at(first), top: '50%', width: 12, height: 12, margin: '-6px 0 0 -6px', borderRadius: 999, background: ink.bad, boxShadow: '0 0 0 2px var(--base)' }} />
        <span title={`First report ${report} min`} style={{ position: 'absolute', left: at(report), top: '50%', width: 12, height: 12, margin: '-6px 0 0 -6px', borderRadius: 999, background: ink.good, boxShadow: '0 0 0 2px var(--base)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 9.5, fontWeight: 700, color: 'var(--muted)' }}>
        <span><span style={{ color: ink.bad }}>●</span> First click {first} min</span>
        <span><span style={{ color: ink.good }}>●</span> First report {report} min</span>
      </div>
    </div>
  );
};

const MiniZones = ({ safe, risk, ink }) => {
  const total = safe + risk || 1;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 2, height: 10 }}>
        <span style={{ flex: safe / total, background: ink.mag, borderRadius: '4px 0 0 4px' }} />
        <span style={{ flex: Math.max(risk / total, 0.015), background: ink.bad, borderRadius: '0 4px 4px 0' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 9.5, fontWeight: 700, color: 'var(--muted)' }}>
        <span><span style={{ color: ink.mag }}>●</span> {num(safe)} on track</span>
        <span><span style={{ color: ink.bad }}>●</span> {num(risk)} below zero</span>
      </div>
    </div>
  );
};

// --- the cards and their stories ------------------------------------------------

// Each story: the question on its card, its headline, a small visual, and the
// focused view it opens (chart, key figures, what / why / do).
function stories({ kind, r, o, ink }) {
  if (kind === 'org') {
    const best = o.departments.filter((d) => d.reportRate !== null).sort((a, b) => b.reportRate - a.reportRate);
    const safe = o.levels.filter((l) => !belowZero(l.family)).reduce((a, l) => a + l.count, 0);
    return [
      {
        id: 'reporting',
        q: 'Are we catching more phish?',
        value: pc(o.rates.report),
        unit: 'reported',
        context: <Delta value={o.change.report} upIsGood ink={ink} note="vs the earlier campaigns" />,
        mini: <div style={{ height: 70, width: '100%', display: 'flex' }}><TrendChart trend={o.trend} ink={ink} mini /></div>,
        chartTitle: 'Reported vs clicked, campaign by campaign',
        chart: <TrendChart trend={o.trend} ink={ink} />,
        legend: [['Reported', ink.good], ['Clicked', ink.bad]],
        figures: [['Report rate', pc(o.rates.report)], ['Click rate', pc(o.rates.click)], ['Reports per click', o.resilience ? `${o.resilience.toFixed(1)}×` : '—']],
        what: 'The share of people who reported each simulation, against the share who clicked it, over the last campaigns.',
        why: 'A report is an early warning: one person reporting lets the security team pull a real phish from every inbox. A report line climbing away from the click line means training is changing behaviour, not just testing it.',
        todo: 'Where clicks jump on a campaign, look at its lure and give that team a short training on it.',
      },
      {
        id: 'risk',
        q: 'How many people are at risk?',
        value: num(o.atRisk),
        unit: o.atRisk === 1 ? 'person' : 'people',
        context: <span style={muted}>{pc(o.atRisk / Math.max(1, safe + o.atRisk))} of everyone, below zero points</span>,
        mini: <MiniZones safe={safe} risk={o.atRisk} ink={ink} />,
        chartTitle: 'Everyone on the board, by level',
        chart: <LevelsChart levels={o.levels} ink={ink} />,
        figures: [['Below zero', num(o.atRisk)], ['Average score', `${num(o.avgScore)} pts`], ['On the board', num(o.people)]],
        what: 'How many people sit at each level, from Cyber Guardian down to Critical Risk. Levels below zero are in red.',
        why: 'People below zero have fallen for simulations more often than they reported them. They are the likeliest way in for a real attacker, and the group where coaching pays back most.',
        todo: 'Assign them refresher training. Their badge shows them the way back up, through the Comeback Zone.',
      },
      {
        id: 'teams',
        q: 'Which teams lead, and which need help?',
        value: best[0] ? best[0].name : '—',
        unit: '',
        small: true,
        context: <span style={muted}>Reports the most · {best.at(-1) ? `${best.at(-1).name} the least` : ''}</span>,
        mini: <MiniBars ink={ink} rows={best.slice(0, 3).map((d) => ({ label: d.name, frac: d.reportRate / Math.max(0.01, best[0].reportRate), value: pc(d.reportRate, 0), color: ink.good }))} />,
        chartTitle: 'Departments, best reporters first',
        chart: <TeamsChart teams={best} ink={ink} extra={{ label: 'At risk', value: (d) => d.atRisk || '—', color: (d) => (d.atRisk ? ink.bad : 'var(--muted)') }} />,
        legend: [['Reported', ink.good], ['Clicked', ink.bad]],
        figures: [['Best', best[0] ? pc(best[0].reportRate, 0) : '—'], ['Weakest', best.at(-1) ? pc(best.at(-1).reportRate, 0) : '—'], ['Departments', num(best.length)]],
        what: 'Each department’s report and click rates across the last campaigns, side by side.',
        why: 'Risk is not spread evenly. A team that clicks twice as often as the rest is where an attacker gets in, and a team that reports the most shows the others it can be done.',
        todo: 'Send the next campaign to the weakest teams first, and recognise the top team.',
      },
      {
        id: 'speed',
        q: 'How fast do we raise the alarm?',
        value: o.timing.firstReport,
        unit: 'min',
        context: <span style={muted}>Typical time to the first report</span>,
        mini: <MiniRace first={o.timing.firstClick} report={o.timing.firstReport} ink={ink} />,
        chartTitle: 'Minutes to the first report, campaign by campaign',
        chart: <SpeedChart trend={o.trend} typical={o.timing.firstReport} ink={ink} />,
        figures: [['First report', mins(o.timing.firstReport)], ['First click', mins(o.timing.firstClick)], ['Head start', mins(Math.max(0, o.timing.firstReport - o.timing.firstClick))]],
        what: 'How many minutes passed between sending each campaign and the first person reporting it. The fastest campaign is in teal.',
        why: 'Attackers work in minutes. The first report is the moment the security team can block the sender and warn everyone, so every minute saved shrinks what an attacker can reach.',
        todo: 'Keep the Report button in view and thank the first reporters; they set the pace for everyone.',
      },
    ];
  }
  return [
    {
      id: 'response',
      q: 'How did people respond?',
      value: pc(r.rates.report),
      unit: 'reported',
      context: <Delta value={r.rates.report - o.rates.report} upIsGood ink={ink} note="vs the average campaign" />,
      mini: <MiniBars ink={ink} rows={[
        { label: 'Opened', frac: r.rates.open, value: pc(r.rates.open, 0), color: ink.neutral },
        { label: 'Clicked', frac: r.rates.click, value: pc(r.rates.click, 0), color: ink.bad },
        { label: 'Reported', frac: r.rates.report, value: pc(r.rates.report, 0), color: ink.good },
      ]} />,
      chartTitle: 'From inbox to outcome',
      chart: <FunnelChart r={r} ink={ink} />,
      figures: [['Reported', pc(r.rates.report)], ['Clicked', pc(r.rates.click)], ['Gave details away', pc(r.rates.compromise)]],
      what: 'Every recipient, from the email arriving to what they did with it.',
      why: 'Opening is harmless; clicking and giving details away are the risk, and reporting is the goal. Where the bars drop off shows how convincing the lure was and which step to train.',
      todo: r.rates.compromise > o.rates.compromise ? 'More people than usual gave details away: train on checking the web address before signing in.' : 'Fewer gave details away than usual: keep this lure in the rotation and raise the difficulty next time.',
    },
    {
      id: 'race',
      q: 'Who was faster: the attacker or us?',
      value: r.timing.firstReport,
      unit: 'min to the first report',
      context: <span style={muted}>The first click came after {mins(r.timing.firstClick)}</span>,
      mini: <MiniRace first={r.timing.firstClick} report={r.timing.firstReport} ink={ink} />,
      chartTitle: 'The first hour of the campaign',
      chart: <RaceChart timing={r.timing} ink={ink} />,
      figures: [['First click', mins(r.timing.firstClick)], ['First report', mins(r.timing.firstReport)], ['Half reported by', mins(r.timing.medianReport)]],
      what: 'When the first person clicked, when the first person reported, and when half of all reports were in.',
      why: 'In a real attack the first click is the attacker’s win and the first report is ours. The gap between them is the time an attacker has before the security team can act.',
      todo: 'If the first report trails the first click by more than a few minutes, remind everyone where the Report button is.',
    },
    {
      id: 'teams',
      q: 'Which teams caught it?',
      value: r.departments[0] ? r.departments[0].name : '—',
      unit: '',
      small: true,
      context: <span style={muted}>Reported the most · {r.departments.at(-1) ? `${r.departments.at(-1).name} the least` : ''}</span>,
      mini: <MiniBars ink={ink} rows={r.departments.slice(0, 3).map((d) => ({ label: d.name, frac: d.reportRate / Math.max(0.01, r.departments[0].reportRate), value: pc(d.reportRate, 0), color: ink.good }))} />,
      chartTitle: 'Departments, best reporters first',
      chart: <TeamsChart teams={r.departments} ink={ink} extra={{ label: 'Net pts', value: (d) => signed(d.net), color: (d) => (d.net >= 0 ? ink.good : ink.bad) }} />,
      legend: [['Reported', ink.good], ['Clicked', ink.bad]],
      figures: [['Best', r.departments[0] ? pc(r.departments[0].reportRate, 0) : '—'], ['Weakest', r.departments.at(-1) ? pc(r.departments.at(-1).reportRate, 0) : '—'], ['Departments', num(r.departments.length)]],
      what: 'How each department handled this campaign: reported, clicked, and the points it won or lost.',
      why: 'One lure can fool one team and not another. Seeing it by department shows whether the weak spot is a team, or the lure itself.',
      todo: 'Share the result with the department heads, and follow up with the team that clicked most.',
    },
    {
      id: 'impact',
      q: 'What did it change?',
      value: signed(r.points.net),
      unit: 'pts net',
      context: <span style={muted}>{num(r.levels.up)} moved up a grade · {num(r.levels.down)} moved down</span>,
      mini: <MiniBars ink={ink} rows={[
        { label: 'Earned', frac: r.points.earned / Math.max(r.points.earned, r.points.lost, 1), value: `+${Math.round(r.points.earned / 1000)}k`, color: ink.good },
        { label: 'Lost', frac: r.points.lost / Math.max(r.points.earned, r.points.lost, 1), value: `−${Math.round(r.points.lost / 1000)}k`, color: ink.bad },
      ]} />,
      chartTitle: 'Points, grades and the first reporters',
      chart: <ImpactChart r={r} ink={ink} />,
      figures: [['Trained after clicking', pc(r.rates.trainedAfterClick, 0)], ['Fell below zero', num(r.levels.belowZero)], ['First report', mins(r.timing.firstReport)]],
      what: 'The points this campaign gave and took away, who moved between grades, and who reported it first.',
      why: 'Points and grades are how people see their own progress. A campaign that moves people up, not only catches them out, keeps them engaged with the programme.',
      todo: 'Thank the first reporters by name, and check in with anyone who fell below zero.',
    },
  ];
}

// One question card on the overview.
function StoryCard({ s, onOpen, index, reduce }) {
  return (
    <motion.button
      type="button"
      data-story={s.id}
      onClick={onOpen}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: reduce ? 0 : index * 0.05, ease: 'easeOut' }}
      className="lb-story"
      style={{ textAlign: 'left', cursor: 'pointer', minWidth: 0, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0, 46%)', gap: 24, alignItems: 'center', padding: '20px 22px', borderRadius: 16, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)' }}
    >
      <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '-0.01em' }}>{s.q}</span>
        <span className="vs-rank" style={{ fontSize: s.small ? 17 : 28, fontWeight: 900, lineHeight: 1.05, whiteSpace: s.small ? 'normal' : 'nowrap' }}>
          {s.value}
          {s.unit && <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', marginLeft: 5 }}>{s.unit}</span>}
        </span>
        <span>{s.context}</span>
        <span className="lb-story-go" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: 'var(--muted)', marginTop: 2 }}>
          See why it matters <ArrowRight size={12} strokeWidth={2.6} aria-hidden />
        </span>
      </span>
      <span style={{ minWidth: 0, display: 'flex', alignItems: 'center' }}>{s.mini}</span>
    </motion.button>
  );
}

// A card opened: its chart on the left, the figures and the three notes on the right.
function StoryDetail({ s, onBack, reduce }) {
  const back = useRef(null);
  useEffect(() => { back.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);
  const note = (title, text) => (
    <div>
      <div style={{ ...eyebrow, marginBottom: 4 }}>{title}</div>
      <p style={{ margin: 0, fontSize: 10.5, fontWeight: 600, lineHeight: 1.55, color: 'var(--text)' }}>{text}</p>
    </div>
  );
  return (
    <motion.div
      key={s.id}
      data-story-open={s.id}
      initial={reduce ? false : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button ref={back} type="button" onClick={onBack} aria-label="Back to Security Pulse" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 30, padding: '0 12px 0 8px', borderRadius: 999, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
          <ChevronLeft size={14} strokeWidth={2.6} aria-hidden /> Pulse
        </button>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{s.q}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 32 }}>
        <section style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text)' }}>{s.chartTitle}</span>
            {s.legend && (
              <span style={{ display: 'flex', gap: 12 }}>
                {s.legend.map(([l, c]) => (
                  <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 700, color: 'var(--muted)' }}>
                    <span aria-hidden style={{ width: 12, height: 2, borderRadius: 2, background: c }} />{l}
                  </span>
                ))}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>{s.chart}</div>
        </section>
        <aside style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 24, borderLeft: '1px solid var(--hair)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
            {s.figures.map(([l, v]) => (
              <div key={l}>
                <div style={{ ...eyebrow, fontSize: 8 }}>{l}</div>
                <div className="vs-rank" style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', marginTop: 4, whiteSpace: 'nowrap' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--hair)' }} />
          {note('What it shows', s.what)}
          {note('Why it matters', s.why)}
          {note('What to do', s.todo)}
        </aside>
      </div>
    </motion.div>
  );
}

// --- the sheet ----------------------------------------------------------------

/**
 * Security Pulse, in the board's L shape: a colour tile top left naming what
 * the pulse is taken of; the headline along the arm; the four question cards
 * below, each opening into its story.
 */
export function PulseSheet({ kind, title, sub, counter, counterLabel, report, org, isDark, shell }) {
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  const reduce = useReducedMotion();
  const { CAP_W, CAP_H, L_GAP, L_R, FILLET, PASTEL_INK } = shell;
  const [open, setOpen] = useState(null);
  const scopeKey = kind === 'org' ? 'org' : report.id;
  const [openFor, setOpenFor] = useState(scopeKey);
  if (openFor !== scopeKey) { setOpenFor(scopeKey); setOpen(null); } // a new scope starts on the cards
  const list = stories({ kind, r: report, o: org, ink });
  const story = list.find((s) => s.id === open) || null;
  const ratio = kind === 'org' ? org.resilience : report.resilience;
  const rates = kind === 'org' ? org.rates : report.rates;
  const better = kind === 'org' ? org.change.report > 0 && org.change.click <= 0 : report.rates.report > org.rates.report;
  const verdict = kind === 'org' ? (better ? 'Improving' : 'Needs attention') : (better ? 'Better than average' : 'Below average');
  return (
    <div data-lb-reports={kind} style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...(isDark ? PASTEL_INK : null), position: 'absolute', top: 0, left: 0, width: CAP_W, height: CAP_H, zIndex: 2, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, background: 'var(--cap-reports)', borderRadius: L_R, overflow: 'hidden' }}>
        <div style={{ ...eyebrow, color: 'var(--t-reports)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {kind === 'org' ? <Building2 size={12} strokeWidth={2.6} aria-hidden /> : <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A' }} />}
          Security Pulse
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

      {/* the arm: the one number, reports for every click */}
      <div data-pulse-hero style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 32, padding: '0 28px', background: 'var(--base)', borderTop: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderRadius: `${L_R}px ${L_R}px 0 0` }}>
        <div style={{ minWidth: 0 }}>
          <div style={eyebrow}>Reports for every click</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
            <span className="vs-rank" style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, color: 'var(--text)' }}>{ratio === null ? '—' : ratio.toFixed(1)}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 800, color: better ? ink.good : ink.bad, background: 'var(--track)' }}>
              {better ? <ArrowUp size={11} strokeWidth={3} aria-hidden /> : <TriangleAlert size={11} strokeWidth={2.6} aria-hidden />}
              {verdict}
            </span>
          </div>
          <div style={{ ...muted, marginTop: 8 }}>
            {ratio !== null && ratio >= 1 ? 'More people report than click.' : 'More people click than report.'} The higher, the safer.
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200, maxWidth: 420, marginLeft: 'auto' }}>
          <div style={{ ...eyebrow, marginBottom: 8 }}>Reported vs clicked</div>
          <div style={{ display: 'flex', gap: 2, height: 12 }} role="img" aria-label={`${pc(rates.report)} reported, ${pc(rates.click)} clicked`}>
            <span style={{ flex: rates.report / Math.max(1e-6, rates.report + rates.click), background: ink.good, borderRadius: '4px 0 0 4px' }} />
            <span style={{ flex: rates.click / Math.max(1e-6, rates.report + rates.click), background: ink.bad, borderRadius: '0 4px 4px 0' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>
            <span><strong style={{ color: 'var(--text)' }}>{pc(rates.report)}</strong> reported</span>
            <span><strong style={{ color: 'var(--text)' }}>{pc(rates.click)}</strong> clicked</span>
          </div>
        </div>
      </div>

      {/* the base: four questions, or the one that is open */}
      <div data-pulse-body style={{ flex: 1, minHeight: 0, position: 'relative', padding: '18px 24px 22px', background: 'var(--base)', borderLeft: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', borderRadius: `${L_R}px 0 ${L_R}px ${L_R}px`, overflow: 'hidden' }}>
        <div style={{ position: 'relative', height: '100%' }}>
          <AnimatePresence mode="wait" initial={false}>
            {story ? (
              <StoryDetail key={`d-${scopeKey}-${story.id}`} s={story} onBack={() => setOpen(null)} reduce={reduce} />
            ) : (
              <motion.div
                key={`g-${scopeKey}`}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gridTemplateRows: 'repeat(2, minmax(0,1fr))', gap: 14 }}
              >
                {list.map((s, i) => <StoryCard key={s.id} s={s} index={i} reduce={reduce} onOpen={() => setOpen(s.id)} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
        Open Security Pulse
      </button>
    </div>
  );
}

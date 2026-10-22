import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { useSize } from './useSize';
import { EASE, SPRING, cardTitle, day, healthInk, lureShort, pc, pc1, rise, small, times } from './insightsUi';

// Insights' building blocks: the bento card, the sliding switch, and the
// four charts (tick-bar sparkline, trend line, lure columns, dot matrix).
// Thin marks, hairline solid grids, a 2px surface ring on end dots; every
// mark has a hover with its numbers, and every value is also in the tables
// and the export. Text stays in the text inks; colour sits on the marks.

const STEP = 14 * 86400000; // the trend's points are a fortnight apart

/** A bento card: a title, a line under it, an action in the corner, then its body. */
export function Card({ title, sub, action, children, i = 0, reduce, style, ...rest }) {
  return (
    <motion.section {...rise(reduce, i)} className="ins-card" style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px 12px', borderRadius: 16, border: '1px solid var(--hair)', background: 'var(--base)', ...style }} {...rest}>
      {(title || action) && (
        <header style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ minWidth: 0 }}>
            <span style={cardTitle}>{title}</span>
            {sub && <span style={{ display: 'block', ...small, marginTop: 2 }}>{sub}</span>}
          </span>
          {action && <span style={{ marginLeft: 'auto', flexShrink: 0 }}>{action}</span>}
        </header>
      )}
      {children}
    </motion.section>
  );
}

/** A quiet pill that leads to a tab. */
export function GoTo({ label, onClick, ...rest }) {
  return (
    <button type="button" className="ins-go" onClick={onClick} {...rest} style={{ height: 26, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 9px 0 11px', borderRadius: 999, border: '1px solid var(--hair)', background: 'var(--base)', color: 'var(--text)', fontSize: 10, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {label} <ArrowUpRight size={12} strokeWidth={2.6} aria-hidden />
    </button>
  );
}

/**
 * A row of choices on a track; the chosen one's pill slides between them.
 * `id` names the pill so two switches never share it.
 */
export function Segmented({ id, label, value, options, onChange, reduce, tabs = false }) {
  return (
    <div role={tabs ? 'tablist' : 'radiogroup'} aria-label={label} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2, padding: 2, borderRadius: 10, background: 'var(--track)' }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role={tabs ? 'tab' : 'radio'}
            {...(tabs ? { 'aria-selected': on } : { 'aria-checked': on })}
            data-ins-option={`${id}:${o.id}`}
            title={o.title}
            onClick={() => onChange(o.id)}
            style={{ position: 'relative', height: 26, padding: '0 11px', borderRadius: 8, border: 'none', background: 'transparent', cursor: on ? 'default' : 'pointer', fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', color: on ? 'var(--text)' : 'var(--muted)', transition: 'color .2s ease' }}
          >
            {on && <motion.span layoutId={`${id}-pill`} transition={reduce ? { duration: 0 } : SPRING} style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'var(--base)', boxShadow: '0 1px 3px rgba(15,23,42,0.12)' }} />}
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {o.Icon && <o.Icon size={12} strokeWidth={2.4} aria-hidden />}{o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** A small card that floats over a chart with a mark's numbers. */
function Tip({ x, y, w, children, edge }) {
  const shift = x < w * 0.25 ? '0%' : x > w * 0.75 ? '-100%' : '-50%';
  return (
    <div role="tooltip" data-ins-tip style={{ position: 'absolute', zIndex: 6, left: x, top: y, transform: `translate(${shift}, calc(-100% - ${edge ?? 10}px))`, pointerEvents: 'none', minWidth: 150, padding: '8px 10px', borderRadius: 10, background: 'var(--base)', border: '1px solid var(--hair)', boxShadow: '0 14px 30px rgba(15,23,42,0.16)', whiteSpace: 'nowrap' }}>
      {children}
    </div>
  );
}
const tipTitle = { fontSize: 10.5, fontWeight: 800, color: 'var(--text)' };
const tipLine = { ...small, fontSize: 9.5, marginTop: 3 };

/**
 * A sparkline of ticks, one per campaign, oldest to newest, in the quiet
 * ink; the newest in `color` with a dot on top. From zero, so a tick's
 * height is its value.
 */
export function Barcode({ values, color, reduce, height = 26, label }) {
  const max = Math.max(...values.filter(Number.isFinite), 0.0001);
  return (
    <span role="img" aria-label={label} style={{ height, width: '100%', minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', gap: values.length > 30 ? 1 : 2, paddingTop: 6 }}>
      {values.map((v, i) => {
        const last = i === values.length - 1;
        return (
          <motion.span
            key={i}
            initial={{ scaleY: reduce ? 1 : 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.2 + 0.014 * i, ease: EASE }}
            style={{ position: 'relative', flex: '1 1 0', maxWidth: 5, minWidth: 0, height: `${(Math.max(0, v || 0) / max) * 100}%`, minHeight: 2, transformOrigin: 'bottom', borderRadius: 2, background: last ? color : 'var(--tick)' }}
          >
            {last && <span aria-hidden style={{ position: 'absolute', left: '50%', top: -7, width: 7, height: 7, marginLeft: -3.5, borderRadius: 999, background: color, boxShadow: '0 0 0 2px var(--plate)' }} />}
          </motion.span>
        );
      })}
    </span>
  );
}

// A smooth line through the points that never overshoots them (monotone cubic).
function smooth(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  const n = pts.length;
  const dx = []; const m = [];
  for (let i = 0; i < n - 1; i += 1) { dx.push(pts[i + 1][0] - pts[i][0]); m.push((pts[i + 1][1] - pts[i][1]) / dx[i]); }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i += 1) t.push(m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]));
  t.push(m[n - 2]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + h * t[i]} ${pts[i + 1][0] - h},${pts[i + 1][1] - h * t[i + 1]} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

/**
 * Reports for every click, a fortnight at a time: a line with a soft wash under it,
 * the period on show as a band, the newest week labelled. Hover a week for
 * its numbers.
 */
export function TrendChart({ trend, from, end, days, ink, reduce, isDark }) {
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const L = 26; const R = 36; const T = 20; const B = 18;
  const pw = Math.max(0, w - L - R); const ph = Math.max(0, h - T - B);
  const start = trend[0].to - STEP;
  const x = (t) => L + ((t - start) / (end - start)) * pw;
  const top = Math.max(3, Math.ceil(Math.max(0, ...trend.map((p) => p.perClick || 0)) + 0.2));
  const y = (v) => T + ph - (Math.min(v, top) / top) * ph;
  const pts = trend.filter((p) => p.perClick !== null).map((p) => [x(p.to), y(p.perClick), p]);
  const line = smooth(pts.map(([a, b]) => [a, b]));
  const area = pts.length ? `${line} L${pts.at(-1)[0]},${T + ph} L${pts[0][0]},${T + ph} Z` : '';
  const last = pts.at(-1);
  const months = trend.filter((p, i) => i === 0 || new Date(p.to).getUTCMonth() !== new Date(trend[i - 1].to).getUTCMonth()).slice(1);
  const bandX = x(Math.max(from, start));
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - r.left;
    let best = null;
    pts.forEach((p) => { if (!best || Math.abs(p[0] - mx) < Math.abs(best[0] - mx)) best = p; });
    setHover(best);
  };
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={`Reports for every click, a fortnight at a time; the newest fortnight ${times(last?.[2].perClick)}`} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="ins-wash" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ink.good} stopOpacity={isDark ? 0.28 : 0.18} />
              <stop offset="100%" stopColor={ink.good} stopOpacity={0} />
            </linearGradient>
          </defs>
          <motion.rect initial={false} animate={{ x: bandX, width: Math.max(0, L + pw - bandX) }} transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE }} y={T - 14} height={ph + 14} rx={8} fill="var(--band)" />
          <motion.text initial={false} animate={{ x: bandX + 8 }} transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE }} y={T - 3} style={{ fontSize: 9, fontWeight: 800, fill: 'var(--muted)' }}>Last {days} days</motion.text>
          {Array.from({ length: top + 1 }, (_, v) => (
            <g key={v}>
              <line x1={L} x2={L + pw} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={1} />
              <text x={L - 7} y={y(v) + 3} textAnchor="end" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{v}×</text>
            </g>
          ))}
          {months.map((p) => <text key={p.to} x={x(p.to)} y={h - 3} textAnchor="middle" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)' }}>{new Date(p.to).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}</text>)}
          <motion.path d={area} fill="url(#ins-wash)" initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.5 }} />
          <motion.path d={line} fill="none" stroke={ink.good} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 1.2, ease: EASE }} />
          {last && (
            <motion.g initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: reduce ? 0 : 1.1 }}>
              <circle cx={last[0]} cy={last[1]} r={4.5} fill={ink.good} stroke="var(--base)" strokeWidth={2} />
              <text x={last[0] + 9} y={last[1] + 3.5} style={{ fontSize: 10.5, fontWeight: 800, fill: 'var(--text)' }}>{times(last[2].perClick)}</text>
            </motion.g>
          )}
          {hover && (
            <g pointerEvents="none">
              <line x1={hover[0]} x2={hover[0]} y1={T} y2={T + ph} stroke="var(--muted)" strokeOpacity={0.35} strokeWidth={1} />
              <circle cx={hover[0]} cy={hover[1]} r={4.5} fill={ink.good} stroke="var(--base)" strokeWidth={2} />
            </g>
          )}
          <rect x={L} y={T - 14} width={pw} height={ph + 14} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
        </svg>
      )}
      {hover && (
        <Tip x={hover[0]} y={hover[1]} w={w}>
          <div style={tipTitle}>{times(hover[2].perClick)} reports per click</div>
          <div style={tipLine}>Fortnight to {day(hover[2].to)} · {hover[2].campaigns} {hover[2].campaigns === 1 ? 'campaign' : 'campaigns'}</div>
        </Tip>
      )}
    </div>
  );
}

/**
 * The Hook Rate of each kind of lure as a column in its own rounded track,
 * the most convincing first and in full colour, the rest quieter. Hover for
 * the rest of its numbers; a click opens it on the Lures tab.
 */
export function LureColumns({ lures, ink, reduce, onOpen }) {
  const [hover, setHover] = useState(null);
  const [box, { w }] = useSize();
  const max = Math.max(...lures.map((l) => l.hooked || 0), 0.0001) * 1.22;
  const n = lures.length;
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', gap: 8, marginTop: 12 }} onMouseLeave={() => setHover(null)}>
      {lures.map((l, i) => {
        const hgt = `${((l.hooked || 0) / max) * 100}%`;
        return (
          <button
            key={l.type}
            type="button"
            className="ins-col"
            data-ins-lure-col={l.type}
            aria-label={`${l.type}: Hook Rate ${pc1(l.hooked)}. See it on the Lures tab`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onClick={() => onOpen(l.type)}
            style={{ flex: '1 1 0', minWidth: 0, maxWidth: 76, display: 'flex', flexDirection: 'column', gap: 7, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <span className="ins-track" style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 4, borderRadius: 14, background: 'var(--plate)' }}>
              <motion.span
                initial={{ height: reduce ? hgt : '0%' }}
                animate={{ height: hgt }}
                transition={reduce ? { duration: 0 } : { ...SPRING, stiffness: 180, damping: 24, delay: 0.15 + 0.06 * i }}
                style={{ position: 'relative', display: 'block', minHeight: 6, borderRadius: 10, background: i === 0 ? ink.bad : 'var(--soft-bad)' }}
              />
              <span style={{ position: 'absolute', left: 0, right: 0, top: 8, textAlign: 'center', fontSize: 10.5, fontWeight: 800, color: 'var(--text)' }}>{pc(l.hooked)}</span>
            </span>
            <span style={{ ...small, fontSize: 9.5, fontWeight: 700, textAlign: 'center', color: i === 0 ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lureShort(l.type)}</span>
          </button>
        );
      })}
      {hover !== null && w > 0 && (
        <Tip x={((hover + 0.5) / n) * w} y={30} w={w} edge={4}>
          <div style={tipTitle}>{lures[hover].type}</div>
          <div style={tipLine}>Hook Rate {pc1(lures[hover].hooked)} · gave details {pc(lures[hover].gaveOfClicks)} of clicks</div>
          <div style={tipLine}>Reported {pc(lures[hover].reportRate)} · {times(lures[hover].perClick)} reports per click</div>
        </Tip>
      )}
    </div>
  );
}

/**
 * Every campaign in the period as a column of dots, oldest to newest: one
 * dot for each half a report per click, coloured by its health; the rest of
 * the column in the quiet ink. Hover for its numbers; a click opens its race
 * on the Response tab.
 */
export function DotMatrix({ campaigns, ink, reduce, onOpen }) {
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const ROWS = 10; // 0.5× each, up to 5×
  const n = campaigns.length;
  const L = 22;
  const colW = n ? (w - L) / n : 0;
  const rowH = h / ROWS;
  const s = Math.max(3, Math.min(9, colW * 0.6, rowH * 0.62));
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 12 }}>
      <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }} onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((v) => <span key={v} aria-hidden style={{ position: 'absolute', left: 0, width: L - 6, textAlign: 'right', top: h - v * 2 * rowH + rowH / 2, transform: 'translateY(-50%)', ...small, fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>{v}×</span>)}
        <div style={{ position: 'absolute', left: L, right: 0, top: 0, bottom: 0, display: 'flex' }}>
          {w > 0 && campaigns.map((c, i) => {
            const filled = Math.min(ROWS, Math.round((c.perClick || 0) / 0.5));
            const color = healthInk(c.health?.word, ink);
            return (
              <button
                key={c.id}
                type="button"
                data-ins-dots={c.id}
                aria-label={`${c.name}, started ${c.started}: ${times(c.perClick)} reports for every click, ${c.health?.word}. See its race`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => onOpen(c.id)}
                style={{ flex: '1 1 0', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', padding: 0, border: 'none', borderRadius: 6, background: hover === i ? 'var(--track)' : 'transparent', cursor: 'pointer', transition: 'background .15s ease' }}
              >
                {Array.from({ length: ROWS }, (_, r) => (
                  <span key={r} style={{ height: rowH, display: 'grid', placeItems: 'center' }}>
                    <motion.span
                      initial={{ scale: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.2 + 0.018 * i + 0.012 * r, ease: EASE }}
                      style={{ display: 'block', width: s, height: s, borderRadius: 999, background: r < filled ? color : 'var(--tick)' }}
                    />
                  </span>
                ))}
              </button>
            );
          })}
        </div>
        {hover !== null && (
          <Tip x={L + (hover + 0.5) * colW} y={h - Math.min(ROWS, Math.round((campaigns[hover].perClick || 0) / 0.5)) * rowH} w={w}>
            <div style={tipTitle}>{campaigns[hover].name}</div>
            <div style={tipLine}>{campaigns[hover].type} · started {campaigns[hover].started}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: healthInk(campaigns[hover].health?.word, ink) }} />
              {times(campaigns[hover].perClick)} reports per click · {campaigns[hover].health?.word}
            </div>
          </Tip>
        )}
      </div>
      <div aria-hidden style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', paddingLeft: L, marginTop: 6, ...small, fontSize: 9 }}>
        <span>{campaigns[0]?.started}</span>
        <span>{campaigns.at(-1)?.started}</span>
      </div>
    </div>
  );
}

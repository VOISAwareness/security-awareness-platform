import { useId, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { useSize } from './useSize';
import { EASE, SPRING, cardTitle, rise, small } from './insightsUi';

// Insights' chart kit, drawn the way the references are: bold rounded
// shapes, texture (barcode lines, fields of dots), one lit window with a
// floating label, rings with soft gradients, and a plain sentence under a
// chart saying what it shows. Every mark has a hover with its numbers; every
// value is also in the export. Text stays in the text inks; colour sits on
// the marks. Nothing moves for those who ask for less.

const clamp = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
// a lighter step of a colour, for the top of a gradient
const light = (c, by = 38) => `color-mix(in srgb, ${c} ${100 - by}%, white)`;

/**
 * A bento card: a title, a line under it, an action in the corner, then its
 * body. With `onOpen` the whole card leads somewhere (its profile), and with
 * `layoutId` it grows into that profile and back.
 */
export function Card({ title, sub, action, children, i = 0, reduce, style, layoutId, onOpen, openLabel = 'Open', ...rest }) {
  return (
    <motion.section
      layoutId={layoutId}
      {...rise(reduce, i)}
      className={`ins-card${onOpen ? ' ins-open' : ''}`}
      onClick={onOpen ? (e) => { if (!e.defaultPrevented) onOpen(); } : undefined}
      style={{ position: 'relative', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px 12px', borderRadius: 18, border: '1px solid var(--hair)', background: 'var(--base)', cursor: onOpen ? 'pointer' : 'default', ...style }}
      {...rest}
    >
      {(title || action || onOpen) && (
        <header style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ minWidth: 0 }}>
            <span style={cardTitle}>{title}</span>
            {sub && <span style={{ display: 'block', ...small, marginTop: 2 }}>{sub}</span>}
          </span>
          <span style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            {action}
            {onOpen && <GoTo label={openLabel} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen(); }} />}
          </span>
        </header>
      )}
      {children}
    </motion.section>
  );
}

/** A quiet pill that leads somewhere. */
export function GoTo({ label, onClick, dark = false, ...rest }) {
  return (
    <button type="button" className="ins-go" onClick={onClick} {...rest} style={{ height: 26, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 9px 0 11px', borderRadius: 999, border: dark ? 'none' : '1px solid var(--hair)', background: dark ? 'rgba(255,255,255,0.12)' : 'var(--base)', color: dark ? 'inherit' : 'var(--text)', fontSize: 10, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {label} <ArrowUpRight className="ins-go-arrow" size={12} strokeWidth={2.6} aria-hidden />
    </button>
  );
}

/** A legend: a short line or dot in each series' colour, then its name. */
export function Legend({ items }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {items.map((x) => (
        <span key={x.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
          <span aria-hidden style={{ width: x.line ? 14 : 8, height: x.line ? 3 : 8, borderRadius: 999, background: x.color, opacity: x.faint ? 0.5 : 1 }} />{x.label}
        </span>
      ))}
    </span>
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
export function Tip({ x, y, w, children, edge, below = false }) {
  const shift = x < w * 0.25 ? '0%' : x > w * 0.75 ? '-100%' : '-50%';
  return (
    <div role="tooltip" data-ins-tip style={{ position: 'absolute', zIndex: 20, left: x, top: y, transform: `translate(${shift}, ${below ? `${edge ?? 10}px` : `calc(-100% - ${edge ?? 10}px)`})`, pointerEvents: 'none', minWidth: 150, padding: '8px 11px', borderRadius: 12, background: 'var(--base)', border: '1px solid var(--hair)', boxShadow: '0 16px 34px rgba(15,23,42,0.18)', whiteSpace: 'nowrap', color: 'var(--text)' }}>
      {children}
    </div>
  );
}
const tipTitle = { fontSize: 10.5, fontWeight: 800, color: 'var(--text)' };
const tipLine = { ...small, fontSize: 9.5, marginTop: 3 };

/** A floating pill, for the one thing a chart wants you to see. */
function Pill({ x, y, children, tone }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)', zIndex: 4, pointerEvents: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px', borderRadius: 999, background: 'var(--base)', border: '1px solid var(--hair)', boxShadow: '0 8px 18px rgba(15,23,42,0.12)', fontSize: 9.5, fontWeight: 800, whiteSpace: 'nowrap', color: 'var(--text)' }}>
      {tone && <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: tone }} />}{children}
    </div>
  );
}

/**
 * A ring gauge: the share of `max` as a gradient arc over a quiet track,
 * ticks round the edge lit as far as the arc goes; what sits in the middle
 * is `children`.
 */
export function RingGauge({ value, max = 100, size = 64, stroke = 7, color, reduce, children, label }) {
  const id = useId().replace(/:/g, '');
  const share = clamp(value / max);
  const r = (size - stroke) / 2 - 5;
  const c = 2 * Math.PI * r;
  const TICKS = 44;
  return (
    <span role="img" aria-label={label} style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'inline-grid', placeItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={light(color, 45)} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        {Array.from({ length: TICKS }, (_, k) => {
          const a = (k / TICKS) * Math.PI * 2;
          const r1 = size / 2 - 1.5; const r2 = size / 2 - 3.5;
          return <line key={k} x1={size / 2 + Math.cos(a) * r1} y1={size / 2 + Math.sin(a) * r1} x2={size / 2 + Math.cos(a) * r2} y2={size / 2 + Math.sin(a) * r2} stroke={k / TICKS < share ? color : 'var(--tick)'} strokeOpacity={k / TICKS < share ? 0.55 : 0.8} strokeWidth={1.4} strokeLinecap="round" />;
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id}g)`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: reduce ? c * (1 - share) : c }} animate={{ strokeDashoffset: c * (1 - share) }} transition={{ duration: reduce ? 0 : 1.1, ease: EASE, delay: reduce ? 0 : 0.2 }} />
      </svg>
      <span style={{ position: 'relative', textAlign: 'center', lineHeight: 1 }}>{children}</span>
    </span>
  );
}

/**
 * A barcode meter: a field of thin lines, lit in `color` (growing stronger)
 * up to the share `value`, quiet after it, with a marker at the share.
 */
export function BarcodeMeter({ value, color, n = 54, height = 24, reduce, label }) {
  const at = Math.round(clamp(value) * n);
  return (
    <span role="img" aria-label={label} style={{ position: 'relative', height, width: '100%', minWidth: 0, display: 'flex', alignItems: 'stretch', gap: 2, paddingTop: 8, boxSizing: 'border-box' }}>
      {Array.from({ length: n }, (_, k) => {
        const lit = k < at;
        return (
          <motion.span
            key={k}
            initial={{ opacity: reduce ? 1 : 0, scaleY: reduce ? 1 : 0.4 }}
            animate={{ opacity: lit ? 0.3 + 0.7 * ((k + 1) / Math.max(1, at)) : 1, scaleY: 1 }}
            transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.15 + 0.008 * k, ease: EASE }}
            style={{ flex: '1 1 0', minWidth: 0, maxWidth: 3, borderRadius: 2, transformOrigin: 'bottom', background: lit ? color : 'var(--tick)' }}
          />
        );
      })}
      <motion.span aria-hidden initial={{ left: reduce ? `${(at / n) * 100}%` : '0%' }} animate={{ left: `${(at / n) * 100}%` }} transition={{ duration: reduce ? 0 : 0.8, ease: EASE, delay: reduce ? 0 : 0.15 }} style={{ position: 'absolute', top: 2, bottom: 0, width: 2, marginLeft: -1, borderRadius: 2, background: color }}>
        <span style={{ position: 'absolute', left: '50%', top: -4, width: 8, height: 8, marginLeft: -4, borderRadius: 999, background: color, boxShadow: '0 0 0 2px var(--plate)' }} />
      </motion.span>
    </span>
  );
}

// a smooth line through the points that never overshoots them (monotone cubic)
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
// the value at time t, read straight between the points either side
const along = (at, values, t) => {
  if (t <= at[0]) return values[0];
  for (let i = 1; i < at.length; i += 1) if (t <= at[i]) return values[i - 1] + ((values[i] - values[i - 1]) * (t - at[i - 1])) / (at[i] - at[i - 1]);
  return values.at(-1);
};
const monthOf = (t) => new Date(t).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });

/**
 * A textured trend: a field of thin bars following the series, lit in
 * `color` inside the period on show (from `from` on), with the series as a
 * smooth line over it, a floating pill naming the change over the period,
 * and the newest value at the end. `compare` adds a quiet second line (the
 * company, against a department). Hover a point for its numbers.
 */
export function TexturedTrend({ at, values, from, color, format, top, pill, reduce, tipHead, compare, valueLabel = 'Risk score' }) {
  const id = useId().replace(/:/g, '');
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const L = 24; const R = 34; const T = 30; const B = 18;
  const pw = Math.max(0, w - L - R); const ph = Math.max(0, h - T - B);
  const start = at[0]; const end = at.at(-1);
  const x = (t) => L + ((t - start) / (end - start || 1)) * pw;
  const y = (v) => T + ph - (Math.max(0, Math.min(v, top)) / top) * ph;
  const pts = at.map((t, i) => [x(t), y(values[i])]);
  const bars = Math.max(10, Math.floor(pw / 6));
  const fromX = x(Math.max(from, start));
  const last = pts.at(-1);
  const onMove = (e) => {
    const mx = e.clientX - e.currentTarget.getBoundingClientRect().left + L;
    let best = 0;
    pts.forEach((p, i) => { if (Math.abs(p[0] - mx) < Math.abs(pts[best][0] - mx)) best = i; });
    setHover(best);
  };
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={`${valueLabel}: ${format(values.at(-1))} now${pill ? `; ${pill}` : ''}`} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={`${id}in`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.85} />
              <stop offset="100%" stopColor={color} stopOpacity={0.12} />
            </linearGradient>
          </defs>
          {[0, top / 2, top].map((v) => <text key={v} x={L - 8} y={y(v) + 3} textAnchor="end" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{format(v, true)}</text>)}
          {Array.from({ length: bars }, (_, k) => {
            const bx = L + (k / (bars - 1)) * pw;
            const t = start + ((bx - L) / pw) * (end - start);
            const v = along(at, values, t) * 0.94;
            const inside = bx >= fromX - 0.5;
            return (
              <motion.rect
                key={k}
                x={bx - 1.25}
                width={2.5}
                rx={1.25}
                fill={inside ? `url(#${id}in)` : 'var(--tick)'}
                initial={{ y: T + ph, height: 0 }}
                animate={{ y: y(v), height: Math.max(2, T + ph - y(v)) }}
                transition={reduce ? { duration: 0 } : { duration: 0.7, delay: 0.1 + 0.006 * k, ease: EASE }}
              />
            );
          })}
          <line x1={fromX} x2={fromX} y1={T - 6} y2={T + ph} stroke={color} strokeOpacity={0.35} strokeWidth={1} />
          {compare && <motion.path d={smooth(at.map((t, i) => [x(t), y(compare.values[i])]))} fill="none" stroke="var(--muted)" strokeOpacity={0.6} strokeWidth={1.5} strokeLinecap="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 1.1, ease: EASE }} />}
          <motion.path d={smooth(pts)} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 1.2, ease: EASE, delay: reduce ? 0 : 0.2 }} />
          {at.map((t, i) => (i === 0 || new Date(t).getUTCMonth() !== new Date(at[i - 1]).getUTCMonth()) && <text key={t} x={x(t)} y={h - 3} textAnchor="middle" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)' }}>{monthOf(t)}</text>)}
          <motion.g initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 1.1 }}>
            <circle cx={last[0]} cy={last[1]} r={5} fill={color} stroke="var(--base)" strokeWidth={2.5} />
            <text x={last[0] + 9} y={last[1] + 4} style={{ fontSize: 11, fontWeight: 800, fill: 'var(--text)' }}>{format(values.at(-1))}</text>
          </motion.g>
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={pts[hover][0]} x2={pts[hover][0]} y1={T - 6} y2={T + ph} stroke="var(--muted)" strokeOpacity={0.4} strokeWidth={1} />
              <circle cx={pts[hover][0]} cy={pts[hover][1]} r={5} fill={color} stroke="var(--base)" strokeWidth={2.5} />
            </g>
          )}
          <rect x={L} y={T - 6} width={pw} height={ph + 6} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
        </svg>
      )}
      {w > 0 && pill && hover === null && (
        <motion.div initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 1.2, duration: 0.4, ease: EASE }}>
          <Pill x={Math.min(w - 90, Math.max(90, (fromX + L + pw) / 2))} y={T - 2} tone={color}>{pill}</Pill>
        </motion.div>
      )}
      {hover !== null && (
        <Tip x={pts[hover][0]} y={pts[hover][1]} w={w}>
          <div style={tipTitle}>{tipHead(at[hover])}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 10, fontWeight: 700 }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: color }} />{valueLabel}<strong style={{ marginLeft: 'auto', paddingLeft: 12 }}>{format(values[hover])}</strong></div>
          {compare && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 10, fontWeight: 700 }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--muted)' }} />{compare.label}<strong style={{ marginLeft: 'auto', paddingLeft: 12 }}>{format(compare.values[hover])}</strong></div>}
        </Tip>
      )}
    </div>
  );
}

/** A plain sentence under a chart: what it shows, and a line of detail. */
export function Insight({ children, sub, tone }) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 10, padding: '9px 12px', borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--plate)' }}>
      {tone && <span aria-hidden style={{ flexShrink: 0, width: 7, height: 7, borderRadius: 999, marginTop: 4, background: tone }} />}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text)', lineHeight: 1.35 }}>{children}</span>
        {sub && <span style={{ display: 'block', ...small, marginTop: 2, lineHeight: 1.4 }}>{sub}</span>}
      </span>
    </div>
  );
}

// Lay out tiles of the given areas in the box, as square as can be.
function squarify(items, box) {
  const out = [];
  let { x, y, w, h } = box;
  let rest = items.filter((it) => it.area > 0);
  const worst = (row, side) => {
    const s = row.reduce((a, r) => a + r.area, 0);
    const mx = Math.max(...row.map((r) => r.area)); const mn = Math.min(...row.map((r) => r.area));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  while (rest.length) {
    const side = Math.min(w, h);
    const row = [rest[0]];
    let i = 1;
    while (i < rest.length && worst([...row, rest[i]], side) <= worst(row, side)) { row.push(rest[i]); i += 1; }
    const s = row.reduce((a, r) => a + r.area, 0);
    const thick = s / side;
    let off = 0;
    row.forEach((it) => {
      const len = it.area / thick;
      out.push(w >= h ? { ...it, x, y: y + off, w: thick, h: len } : { ...it, x: x + off, y, w: len, h: thick });
      off += len;
    });
    if (w >= h) { x += thick; w -= thick; } else { y += thick; h -= thick; }
    rest = rest.slice(row.length);
  }
  return out;
}

/**
 * A tile map: one rounded tile per item, its size its `weight`, its colour
 * from `fill(item)`, its name and number on it where they fit. Hover lifts
 * a tile and shows its numbers; a click opens it. `tip(item)` gives the
 * tooltip's lines.
 */
export function TileMap({ items, fill, ink, onOpen, reduce, tip, layoutIdOf }) {
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const total = items.reduce((a, it) => a + it.weight, 0) || 1;
  const tiles = w > 0 && h > 0 ? squarify([...items].sort((a, b) => b.weight - a.weight).map((it) => ({ ...it, area: (it.weight / total) * w * h })), { x: 0, y: 0, w, h }) : [];
  const shown = tiles.find((t) => t.key === hover);
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }} onMouseLeave={() => setHover(null)}>
      {tiles.map((t, k) => {
        const big = t.w > 92 && t.h > 58;
        const fits = t.w > 54 && t.h > 30;
        const name = t.short && t.label.length * 5.8 > (t.w - 22) * (big ? 1.7 : 1) ? t.short : t.label;
        return (
          <motion.button
            key={t.key}
            type="button"
            layoutId={layoutIdOf?.(t)}
            data-ins-tile={t.key}
            aria-label={`${t.label}: ${t.text}. Open its profile`}
            onMouseEnter={() => setHover(t.key)}
            onFocus={() => setHover(t.key)}
            onClick={(e) => { e.stopPropagation(); onOpen?.(t.key); }}
            initial={{ opacity: 0, scale: reduce ? 1 : 0.85 }}
            animate={{ opacity: 1, scale: hover === t.key ? 1.035 : 1 }}
            transition={{ duration: reduce ? 0 : 0.45, delay: reduce || hover ? 0 : 0.1 + 0.035 * k, ease: EASE }}
            style={{ position: 'absolute', left: t.x + 2, top: t.y + 2, width: Math.max(0, t.w - 4), height: Math.max(0, t.h - 4), zIndex: hover === t.key ? 3 : 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', padding: fits ? '8px 9px' : 0, border: 'none', borderRadius: 12, background: `linear-gradient(160deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%), ${fill(t)}`, color: ink(t), textAlign: 'left', cursor: 'pointer', boxShadow: hover === t.key ? '0 14px 28px rgba(15,23,42,0.22)' : '0 1px 0 rgba(255,255,255,0.25) inset' }}
          >
            {fits && <span style={{ maxWidth: '100%', fontSize: 9.5, fontWeight: 800, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: big ? 2 : 1, WebkitBoxOrient: 'vertical' }}>{name}</span>}
            {fits && <span className="vs-rank" style={{ fontSize: big ? 20 : 14, fontWeight: 900, lineHeight: 1 }}>{t.text}</span>}
          </motion.button>
        );
      })}
      {shown && tip && (
        <Tip x={shown.x + shown.w / 2} y={shown.y} w={w} edge={6}>
          {tip(shown).map((line, i) => <div key={line} style={i ? tipLine : tipTitle}>{line}</div>)}
        </Tip>
      )}
    </div>
  );
}

/**
 * Proportion blocks: one rounded block per part, its width its share, with
 * a 4px gap between; a legend under them with each part's share and name.
 */
export function Blocks({ parts, reduce, height = 34, onDark = false, legendCols = 2 }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')} style={{ display: 'flex', gap: 4, height }}>
        {parts.map((p, k) => (
          <motion.span
            key={p.key}
            title={`${p.label}: ${p.text}`}
            initial={{ flexGrow: reduce ? p.value : 0 }}
            animate={{ flexGrow: p.value }}
            transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : 0.2 + 0.08 * k, ease: EASE }}
            style={{ flexBasis: 0, minWidth: 8, borderRadius: 10, background: `linear-gradient(180deg, ${light(p.color, 22)}, ${p.color})`, boxShadow: onDark ? 'none' : '0 1px 0 rgba(255,255,255,0.3) inset' }}
          />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${legendCols}, minmax(0,1fr))`, gap: '8px 14px' }}>
        {parts.map((p) => (
          <span key={p.key} style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span aria-hidden style={{ alignSelf: 'center', flexShrink: 0, width: 8, height: 8, borderRadius: 3, background: p.color }} />
            <span className="vs-rank" style={{ fontSize: 14, fontWeight: 900 }}>{Math.round((p.value / total) * 100)}%</span>
            <span style={{ fontSize: 9.5, fontWeight: 700, opacity: onDark ? 0.75 : 1, color: onDark ? 'inherit' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Pill columns: each item a column in its own rounded track, its value on a
 * bubble that rides the top of the bar; the first in full colour, the rest
 * quieter. Hover for its numbers; a click opens it.
 */
export function PillColumns({ items, color, soft, reduce, onOpen, label }) {
  const [hover, setHover] = useState(null);
  const [box, { w }] = useSize();
  const max = Math.max(...items.map((x) => x.value || 0), 0.0001) * 1.25;
  const n = items.length;
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', gap: 8, marginTop: 12 }} onMouseLeave={() => setHover(null)}>
      {items.map((x, i) => {
        const hgt = `${((x.value || 0) / max) * 100}%`;
        const strong = i === 0 || hover === i;
        const Tag = onOpen ? 'button' : 'div';
        return (
          <Tag
            key={x.key}
            {...(onOpen ? { type: 'button', onClick: (e) => { e.stopPropagation(); onOpen(x.key); } } : { tabIndex: 0 })}
            className="ins-col"
            data-ins-col={x.key}
            aria-label={`${x.label}: ${x.text} ${label}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7, padding: 0, border: 'none', background: 'none', cursor: onOpen ? 'pointer' : 'default' }}
          >
            <span style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 5, borderRadius: 16, background: 'var(--plate)' }}>
              <motion.span
                initial={{ height: reduce ? hgt : '0%' }}
                animate={{ height: hgt }}
                transition={reduce ? { duration: 0 } : { ...SPRING, stiffness: 170, damping: 22, delay: 0.15 + 0.06 * i }}
                style={{ position: 'relative', display: 'block', minHeight: 8, borderRadius: 11, background: strong ? `linear-gradient(180deg, ${light(color, 28)}, ${color})` : soft, transition: 'background .2s ease' }}
              >
                <span style={{ position: 'absolute', left: '50%', top: -26, transform: 'translateX(-50%)', height: 20, padding: '0 7px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', background: strong ? 'var(--ink)' : 'var(--base)', color: strong ? 'var(--ink-on)' : 'var(--text)', boxShadow: '0 4px 10px rgba(15,23,42,0.12)', fontSize: 9.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{x.text}</span>
              </motion.span>
            </span>
            <span style={{ ...small, fontSize: 9.5, fontWeight: 700, textAlign: 'center', color: strong ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.label}</span>
          </Tag>
        );
      })}
      {hover !== null && w > 0 && items[hover].tip && (
        <Tip x={((hover + 0.5) / n) * w} y={0} w={w} edge={-2}>
          {items[hover].tip.map((line, k) => <div key={line} style={k ? tipLine : tipTitle}>{line}</div>)}
        </Tip>
      )}
    </div>
  );
}

/**
 * Stacked columns: one rounded track per step, filled from the bottom by
 * its segments in order with a 2px gap between, the steps in the period in
 * full colour and the rest quieter. Hover a column for its numbers.
 */
export function StackColumns({ columns, order, colors, words, reduce, tipHead }) {
  const [box, { w }] = useSize();
  const [hover, setHover] = useState(null);
  const n = columns.length;
  const sum = (c) => order.reduce((a, k) => a + (c.values[k] || 0), 0);
  const max = Math.max(...columns.map(sum), 1) * 1.06;
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', gap: 6 }} onMouseLeave={() => setHover(null)}>
      {columns.map((c, i) => {
        const hgt = `${(sum(c) / max) * 100}%`;
        const lit = c.current || hover === i;
        return (
          <div key={c.key} onMouseEnter={() => setHover(i)} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 3, borderRadius: 11, background: hover === i ? 'var(--track)' : 'var(--plate)', transition: 'background .15s ease' }}>
              <motion.span
                initial={{ height: reduce ? hgt : '0%' }}
                animate={{ height: hgt }}
                transition={reduce ? { duration: 0 } : { ...SPRING, stiffness: 170, damping: 24, delay: 0.15 + 0.035 * i }}
                style={{ display: 'flex', flexDirection: 'column-reverse', gap: 2, opacity: lit ? 1 : 0.45, transition: 'opacity .2s ease' }}
              >
                {order.map((k) => <span key={k} style={{ flex: `${c.values[k] || 0} 1 0`, minHeight: 3, borderRadius: 7, background: colors[k] }} />)}
              </motion.span>
            </span>
            <span style={{ ...small, fontSize: 9, textAlign: 'center', fontWeight: c.current ? 800 : 600, color: c.current ? 'var(--text)' : 'var(--muted)' }}>{c.label}</span>
          </div>
        );
      })}
      {hover !== null && w > 0 && (
        <Tip x={((hover + 0.5) / n) * w} y={8} w={w} below>
          <div style={tipTitle}>{tipHead(columns[hover])}</div>
          {order.map((k) => <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 10, fontWeight: 700 }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 3, background: colors[k] }} />{words[k]}<strong style={{ marginLeft: 'auto', paddingLeft: 14 }}>{Math.round(columns[hover].values[k]).toLocaleString('en-US')}</strong></div>)}
        </Tip>
      )}
    </div>
  );
}

/**
 * Who moved between levels: the levels at the start on the left, now on the
 * right, a ribbon for every move as wide as the people in it. Moves to a
 * lower level in `good`, to a higher one in `bad`, staying put quiet.
 * Hover a ribbon for how many.
 */
export function LevelFlow({ links, order, colors, words, good, bad, joinedColor, reduce }) {
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const NODE = 12; const GAP = 10; const LABEL = 92;
  const left = [...order, 'joined'].filter((k) => links.some((l) => l.from === k));
  const right = order.filter((k) => links.some((l) => l.to === k));
  const total = links.reduce((a, l) => a + l.n, 0) || 1;
  const usable = (side) => Math.max(1, h - GAP * (side.length - 1));
  const scale = Math.min(usable(left) / total, usable(right) / total);
  const place = (side, key) => {
    const pos = {}; let y = 0;
    side.forEach((k) => { const n = links.filter((l) => l[key] === k).reduce((a, l) => a + l.n, 0); pos[k] = { y, h: n * scale, n }; y += n * scale + GAP; });
    return pos;
  };
  const L = place(left, 'from'); const Rt = place(right, 'to');
  // each label's middle, pushed apart so two small levels never overlap
  const spread = (side, pos) => {
    const c = side.map((k) => ({ k, y: pos[k].y + pos[k].h / 2 }));
    for (let i = 1; i < c.length; i += 1) c[i].y = Math.max(c[i].y, c[i - 1].y + 26);
    const over = c.length ? c.at(-1).y - (h - 12) : 0;
    if (over > 0) { c.at(-1).y -= over; for (let i = c.length - 2; i >= 0; i -= 1) c[i].y = Math.min(c[i].y, c[i + 1].y - 26); }
    return Object.fromEntries(c.map((x) => [x.k, x.y]));
  };
  const LY = spread(left, L); const RY = spread(right, Rt);
  const x0 = LABEL; const x1 = Math.max(x0 + 40, w - LABEL);
  const outAt = Object.fromEntries(left.map((k) => [k, L[k].y]));
  const inAt = Object.fromEntries(right.map((k) => [k, Rt[k].y]));
  const rank = (k) => (k === 'joined' ? 99 : order.indexOf(k));
  const ribbons = [...links].sort((a, b) => rank(a.from) - rank(b.from) || rank(a.to) - rank(b.to)).map((l) => {
    const th = l.n * scale;
    const y0 = outAt[l.from]; outAt[l.from] += th;
    const y1 = inAt[l.to]; inAt[l.to] += th;
    const kind = l.from === 'joined' ? 'joined' : l.from === l.to ? 'stay' : rank(l.to) > rank(l.from) ? 'down' : 'up';
    return { ...l, th, y0, y1, kind };
  });
  const fillOf = (r) => (r.kind === 'down' ? good : r.kind === 'up' ? bad : r.kind === 'joined' ? joinedColor : 'var(--tick)');
  const mx = (x0 + NODE + x1) / 2;
  const tip = hover !== null ? ribbons[hover] : null;
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={ribbons.filter((r) => r.kind !== 'stay').map((r) => `${r.n} from ${words[r.from] || r.from} to ${words[r.to]}`).join('; ')} style={{ display: 'block', overflow: 'visible' }}>
          {ribbons.map((r, k) => {
            const a = x0 + NODE; const b = x1;
            const d = `M${a},${r.y0} C${mx},${r.y0} ${mx},${r.y1} ${b},${r.y1} L${b},${r.y1 + r.th} C${mx},${r.y1 + r.th} ${mx},${r.y0 + r.th} ${a},${r.y0 + r.th} Z`;
            return (
              <motion.path
                key={`${r.from}-${r.to}`}
                d={d}
                fill={fillOf(r)}
                onMouseEnter={() => setHover(k)}
                onMouseLeave={() => setHover(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: hover === null ? (r.kind === 'stay' ? 0.6 : 0.72) : hover === k ? 0.95 : 0.16 }}
                transition={{ duration: reduce ? 0 : 0.5, delay: reduce || hover !== null ? 0 : 0.3 + 0.05 * k }}
              />
            );
          })}
          {left.map((k, i) => (
            <g key={`l${k}`}>
              <motion.rect x={x0} y={L[k].y} width={NODE} rx={4} fill={k === 'joined' ? joinedColor : colors[k]} initial={{ height: reduce ? Math.max(2, L[k].h) : 0 }} animate={{ height: Math.max(2, L[k].h) }} transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.05 * i }} />
              <text x={x0 - 10} y={LY[k] - 2} textAnchor="end" style={{ fontSize: 10, fontWeight: 800, fill: 'var(--text)' }}>{k === 'joined' ? 'Joined' : words[k]}</text>
              <text x={x0 - 10} y={LY[k] + 10} textAnchor="end" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)' }}>{L[k].n.toLocaleString('en-US')}</text>
            </g>
          ))}
          {right.map((k, i) => (
            <g key={`r${k}`}>
              <motion.rect x={x1} y={Rt[k].y} width={NODE} rx={4} fill={colors[k]} initial={{ height: reduce ? Math.max(2, Rt[k].h) : 0 }} animate={{ height: Math.max(2, Rt[k].h) }} transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.05 * i }} />
              <text x={x1 + NODE + 10} y={RY[k] - 2} style={{ fontSize: 10, fontWeight: 800, fill: 'var(--text)' }}>{words[k]}</text>
              <text x={x1 + NODE + 10} y={RY[k] + 10} style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)' }}>{Rt[k].n.toLocaleString('en-US')}</text>
            </g>
          ))}
        </svg>
      )}
      {tip && (
        <Tip x={mx} y={(tip.y0 + tip.y1) / 2 + tip.th / 2} w={w}>
          <div style={tipTitle}>{tip.n.toLocaleString('en-US')} {tip.kind === 'stay' ? `stayed ${words[tip.to]}` : tip.kind === 'joined' ? 'joined, as moderate' : `moved ${tip.kind === 'down' ? 'to a lower level' : 'to a higher level'}`}</div>
          {tip.kind !== 'stay' && tip.kind !== 'joined' && <div style={tipLine}>From {words[tip.from]} to {words[tip.to]}</div>}
        </Tip>
      )}
    </div>
  );
}

/** Comparison bars: big rounded bars, one per row, the value at the bar's end. */
export function CompareBars({ rows, reduce, max, height = 30 }) {
  const top = max ?? Math.max(...rows.map((r) => r.value || 0), 0.0001) * 1.08;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, k) => {
        const wd = `${clamp((r.value || 0) / top) * 100}%`;
        return (
          <div key={r.key}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800 }}>{r.label}</span>
              {r.sub && <span style={{ ...small, fontSize: 9 }}>{r.sub}</span>}
            </div>
            <div style={{ height, borderRadius: 10, background: 'var(--plate)', overflow: 'hidden' }}>
              <motion.div initial={{ width: reduce ? wd : '0%' }} animate={{ width: wd }} transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : 0.25 + 0.12 * k, ease: EASE }} style={{ height: '100%', minWidth: 58, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10, boxSizing: 'border-box', background: `linear-gradient(90deg, ${light(r.color, 40)}, ${r.color})` }}>
                <span className="vs-rank" style={{ fontSize: 13, fontWeight: 900, color: '#FFFFFF' }}>{r.text}</span>
              </motion.div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A stepped funnel: a column per step, as tall as its people, joined to the
 * next by a soft band; its number over it and its share under it.
 */
export function StepFunnel({ steps, color, reduce }) {
  const [box, { w, h }] = useSize();
  const n = steps.length;
  const first = steps[0]?.value || 1;
  const gap = Math.max(18, w * 0.05);
  const colW = n ? (w - gap * (n - 1)) / n : 0;
  const T = 26; const B = 30;
  const ph = Math.max(0, h - T - B);
  const yOf = (v) => T + ph - (v / first) * ph;
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={steps.map((s) => `${s.label} ${s.value}`).join(', ')} style={{ display: 'block', overflow: 'visible' }}>
          {steps.slice(0, -1).map((s, i) => {
            const xa = i * (colW + gap) + colW; const xb = xa + gap;
            return <motion.path key={`b${s.key}`} d={`M${xa},${yOf(s.value)} L${xb},${yOf(steps[i + 1].value)} L${xb},${T + ph} L${xa},${T + ph} Z`} fill={color} initial={{ opacity: 0 }} animate={{ opacity: 0.14 }} transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.5 + 0.1 * i }} />;
          })}
          {steps.map((s, i) => {
            const x = i * (colW + gap); const y = yOf(s.value);
            return (
              <g key={s.key}>
                <motion.rect x={x} width={colW} rx={12} fill={color} fillOpacity={1 - i * 0.14} initial={{ y: T + ph, height: 0 }} animate={{ y, height: T + ph - y }} transition={reduce ? { duration: 0 } : { duration: 0.8, delay: 0.15 + 0.1 * i, ease: EASE }} />
                <text x={x + colW / 2} y={y - 8} textAnchor="middle" className="vs-rank" style={{ fontSize: 14, fontWeight: 900, fill: 'var(--text)' }}>{s.value.toLocaleString('en-US')}</text>
                <text x={x + colW / 2} y={h - 15} textAnchor="middle" style={{ fontSize: 10, fontWeight: 800, fill: 'var(--text)' }}>{s.label}</text>
                <text x={x + colW / 2} y={h - 3} textAnchor="middle" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)' }}>{i ? `${Math.round((s.value / first) * 100)}% of assigned` : 'people'}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/** A small smooth line with a soft wash under it and its newest point marked. */
export function Spark({ values, color, width = 120, height = 34, reduce }) {
  const id = useId().replace(/:/g, '');
  const v = values.filter(Number.isFinite);
  if (v.length < 2) return null;
  const lo = Math.min(...v); const hi = Math.max(...v);
  const pts = v.map((x, i) => [3 + (i / (v.length - 1)) * (width - 6), 4 + (1 - (x - lo) / (hi - lo || 1)) * (height - 8)]);
  const d = smooth(pts);
  return (
    <svg width={width} height={height} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.22} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient>
      </defs>
      <path d={`${d} L${pts.at(-1)[0]},${height} L${pts[0][0]},${height} Z`} fill={`url(#${id}s)`} />
      <motion.path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.9, ease: EASE, delay: reduce ? 0 : 0.2 }} />
      <circle cx={pts.at(-1)[0]} cy={pts.at(-1)[1]} r={3} fill={color} stroke="var(--base)" strokeWidth={1.5} />
    </svg>
  );
}

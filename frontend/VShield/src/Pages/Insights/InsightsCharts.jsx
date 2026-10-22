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
const monthOf = (t) => new Date(t).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });

// a column with rounded top corners, standing on the baseline
const column = (x, top, w, base, r) => {
  const k = Math.max(0, Math.min(r, w / 2, base - top));
  return `M${x},${base} V${top + k} Q${x},${top} ${x + k},${top} H${x + w - k} Q${x + w},${top} ${x + w},${top + k} V${base} Z`;
};

/**
 * Score columns: a rounded column for each step, the steps in the period
 * (`lit`) in full colour and the rest softer, with `line` drawn over them on
 * the same scale (the three-month average, or the whole company against a
 * department) and the newest value on a bubble. Hover a column for its
 * numbers.
 */
export function ScoreBars({ at, values, lit, color, soft, format, top, line, reduce, tipHead, valueLabel = 'Risk score' }) {
  const id = useId().replace(/:/g, '');
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const L = 26; const R = 4; const T = 30; const B = 20;
  const n = values.length;
  const pw = Math.max(0, w - L - R); const ph = Math.max(0, h - T - B);
  const slot = n ? pw / n : 0;
  const bw = Math.max(6, Math.min(34, slot * 0.6));
  const cx = (i) => L + slot * (i + 0.5);
  const base = T + ph;
  const y = (v) => base - (Math.max(0, Math.min(v, top)) / top) * ph;
  const pts = line ? line.values.map((v, i) => [cx(i), y(v)]) : [];
  const last = n - 1;
  const at2 = hover ?? last;
  const prev = at2 > 0 ? values[at2] - values[at2 - 1] : null;
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }} onMouseLeave={() => setHover(null)}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={`${valueLabel} by month, ${format(values[0])} to ${format(values[last])}${line ? `; ${line.label} as a line` : ''}`} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={light(color, 30)} />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          </defs>
          {[0, top / 2, top].map((v) => (
            <g key={v}>
              <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={1} strokeDasharray={v ? '3 4' : undefined} />
              <text x={L - 8} y={y(v) + 3} textAnchor="end" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{format(v, true)}</text>
            </g>
          ))}
          {values.map((v, i) => {
            const on = lit[i] || hover === i;
            return (
              <g key={at[i]} onMouseEnter={() => setHover(i)}>
                <rect x={cx(i) - slot / 2} y={T - 10} width={slot} height={ph + 10 + B} fill={hover === i ? 'var(--plate)' : 'transparent'} rx={10} />
                <motion.path
                  d={column(cx(i) - bw / 2, y(v), bw, base, 7)}
                  fill={on ? `url(#${id}c)` : soft}
                  initial={{ scaleY: reduce ? 1 : 0 }}
                  animate={{ scaleY: 1 }}
                  transition={reduce ? { duration: 0 } : { ...SPRING, stiffness: 180, damping: 24, delay: 0.12 + 0.04 * i }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'bottom', transition: 'fill .2s ease' }}
                />
                <text x={cx(i)} y={h - 4} textAnchor="middle" style={{ fontSize: 9, fontWeight: lit[i] ? 800 : 600, fill: lit[i] ? 'var(--text)' : 'var(--muted)' }}>{monthOf(at[i])}</text>
              </g>
            );
          })}
          {line && (
            <g pointerEvents="none">
              <motion.path d={smooth(pts)} fill="none" stroke={line.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: reduce ? 0 : 1, ease: EASE, delay: reduce ? 0 : 0.55 }} />
              {pts.map((pt, i) => <motion.circle key={at[i]} cx={pt[0]} cy={pt[1]} r={hover === i ? 4.5 : 3} fill="var(--base)" stroke={line.color} strokeWidth={2} initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.7 + 0.05 * i }} />)}
            </g>
          )}
        </svg>
      )}
      {w > 0 && hover === null && (
        <motion.span initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.9, duration: 0.35, ease: EASE }} style={{ position: 'absolute', left: cx(last), top: y(values[last]) - 8, transform: 'translate(-50%, -100%)', height: 20, padding: '0 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', background: 'var(--ink)', color: 'var(--ink-on)', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', boxShadow: '0 6px 14px rgba(15,23,42,0.18)', pointerEvents: 'none' }}>{format(values[last])}</motion.span>
      )}
      {hover !== null && (
        <Tip x={cx(hover)} y={Math.min(y(values[hover]), line ? y(line.values[hover]) : Infinity) - 4} w={w}>
          <div style={tipTitle}>{tipHead(at[hover])}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, fontSize: 10, fontWeight: 700 }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: color }} />{valueLabel}<strong style={{ marginLeft: 'auto', paddingLeft: 12 }}>{format(values[hover])}</strong></div>
          {line && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 10, fontWeight: 700 }}><span aria-hidden style={{ width: 10, height: 2, borderRadius: 2, background: line.color }} />{line.label}<strong style={{ marginLeft: 'auto', paddingLeft: 12 }}>{format(line.values[hover])}</strong></div>}
          {prev !== null && <div style={tipLine}>{Math.abs(prev) < 0.05 ? 'Level with the month before' : `${prev < 0 ? 'Down' : 'Up'} ${Math.abs(prev).toFixed(1)} on the month before`}</div>}
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
 * Who moved between levels, as a ladder: the levels side by side from the
 * safest to the riskiest, with the people on each now and at the start;
 * between each pair, an arc over the top for those who moved up to the
 * riskier level (in `bad`) and one underneath for those who moved down to
 * the safer (in `good`), as thick as the people on it and with their number
 * on it. Hover a level for who stayed.
 */
export function LevelLadder({ links, order, colors, words, good, bad, reduce }) {
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const sumOf = (pick) => links.filter(pick).reduce((a, l) => a + l.n, 0);
  const levels = order.map((k) => ({ k, was: sumOf((l) => l.from === k), now: sumOf((l) => l.to === k), stayed: sumOf((l) => l.from === k && l.to === k) }));
  const gaps = order.slice(0, -1).map((k, i) => ({ i, up: sumOf((l) => l.from === k && l.to === order[i + 1]), down: sumOf((l) => l.from === order[i + 1] && l.to === k) }));
  const most = Math.max(...gaps.flatMap((g) => [g.up, g.down]), 1);
  const nw = Math.min(150, Math.max(70, (w - 3 * 44) / 4));
  const gap = (w - 4 * nw) / 3;
  const nh = Math.min(64, Math.max(48, h - 92));
  const top = (h - nh) / 2; const bottom = top + nh;
  const lift = Math.min(34, top - 12);
  const xl = (i) => i * (nw + gap);
  const thick = (v) => 2 + 7 * (v / most);
  const tag = (x, y, text, tone) => (
    <span style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', height: 20, padding: '0 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--base)', boxShadow: `inset 0 0 0 1.5px ${tone}, 0 4px 10px rgba(15,23,42,0.12)`, fontSize: 10, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
      <span aria-hidden style={{ fontSize: 8.5, color: tone }}>{text[0]}</span>{text.slice(1)}
    </span>
  );
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {w > 0 && h > 0 && (
        <>
          <svg width={w} height={h} role="img" aria-label={gaps.map((g) => `${g.up} up from ${words[order[g.i]]} to ${words[order[g.i + 1]]}, ${g.down} down`).join('; ')} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <defs>
              {[['up', bad], ['down', good]].map(([k, c]) => (
                <marker key={k} id={`ladder-${k}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 Z" fill={c} />
                </marker>
              ))}
            </defs>
            {gaps.map((g, k) => {
              const a = xl(g.i) + nw - 16; const b = xl(g.i + 1) + 16; const m = (a + b) / 2;
              return (
                <g key={g.i}>
                  {g.up > 0 && <motion.path d={`M${a},${top - 2} Q${m},${top - 2 - lift * 2} ${b},${top - 2}`} fill="none" stroke={bad} strokeWidth={thick(g.up)} strokeLinecap="round" markerEnd="url(#ladder-up)" initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }} animate={{ pathLength: 1, opacity: 0.9 }} transition={{ duration: reduce ? 0 : 0.7, ease: EASE, delay: reduce ? 0 : 0.35 + 0.12 * k }} />}
                  {g.down > 0 && <motion.path d={`M${b},${bottom + 2} Q${m},${bottom + 2 + lift * 2} ${a},${bottom + 2}`} fill="none" stroke={good} strokeWidth={thick(g.down)} strokeLinecap="round" markerEnd="url(#ladder-down)" initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }} animate={{ pathLength: 1, opacity: 0.9 }} transition={{ duration: reduce ? 0 : 0.7, ease: EASE, delay: reduce ? 0 : 0.5 + 0.12 * k }} />}
                </g>
              );
            })}
          </svg>
          {gaps.map((g) => {
            const m = (xl(g.i) + nw - 16 + xl(g.i + 1) + 16) / 2;
            return (
              <motion.span key={g.i} initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.9 + 0.1 * g.i }}>
                {g.up > 0 && tag(m, top - 2 - lift, `▲${g.up.toLocaleString('en-US')}`, bad)}
                {g.down > 0 && tag(m, bottom + 2 + lift, `▼${g.down.toLocaleString('en-US')}`, good)}
              </motion.span>
            );
          })}
          {levels.map((lv, i) => {
            const d = lv.now - lv.was;
            return (
              <motion.div
                key={lv.k}
                tabIndex={0}
                aria-label={`${words[lv.k]}: ${lv.now} now, ${lv.was} at the start, ${lv.stayed} stayed`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : 0.08 * i, ease: EASE }}
                style={{ position: 'absolute', left: xl(i), top, width: nw, height: nh, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, padding: '0 11px', borderRadius: 14, background: 'var(--plate)', border: '1px solid var(--hair)', boxShadow: hover === i ? 'var(--lift)' : 'none', outline: 'none' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, fontWeight: 800 }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 3, background: colors[lv.k] }} />{words[lv.k]}</span>
                <span className="vs-rank" style={{ fontSize: 17, fontWeight: 900, lineHeight: 1 }}>{lv.now.toLocaleString('en-US')}</span>
                <span style={{ ...small, fontSize: 8.5, whiteSpace: 'nowrap' }}>{d === 0 ? 'no change' : `${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('en-US')} since the start`}</span>
              </motion.div>
            );
          })}
          {hover !== null && (
            <Tip x={xl(hover) + nw / 2} y={top} w={w}>
              <div style={tipTitle}>{words[levels[hover].k]} risk</div>
              <div style={tipLine}>{levels[hover].stayed.toLocaleString('en-US')} stayed · {levels[hover].was.toLocaleString('en-US')} at the start</div>
            </Tip>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Rows of stacked parts on one scale: each row's parts side by side, as
 * long as their values, with a 2px gap and the value on a part wide enough
 * to hold it; a row's total before its bar.
 */
export function MakeupBars({ rows, max, reduce, format }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((r, k) => (
        <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '84px minmax(0,1fr)', alignItems: 'center', gap: 12 }}>
          <span>
            <span style={{ display: 'block', ...small, fontSize: 9 }}>{r.label}</span>
            <span className="vs-rank" style={{ display: 'block', fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>{format(r.total)}</span>
          </span>
          <span style={{ position: 'relative', height: 30, display: 'flex' }}>
            <motion.span initial={{ width: reduce ? `${(r.total / max) * 100}%` : '0%' }} animate={{ width: `${(r.total / max) * 100}%` }} transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : 0.2 + 0.15 * k, ease: EASE }} style={{ display: 'flex', gap: 2, height: '100%', overflow: 'hidden' }}>
              {r.parts.map((pt) => (
                <span key={pt.key} title={`${pt.label}: ${format(pt.value)}`} style={{ flex: `${pt.value} 1 0`, minWidth: 4, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: pt.color, color: pt.ink, fontSize: 10, fontWeight: 800, overflow: 'hidden', whiteSpace: 'nowrap' }}>{pt.value / max > 0.08 ? format(pt.value) : ''}</span>
              ))}
            </motion.span>
          </span>
        </div>
      ))}
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

/**
 * Where each group stands on two rates, `x` across and `y` up: a bubble per
 * group, as big as its `size` and coloured by `fill`, with the averages
 * crossing the map and splitting it into four named corners (`corners`,
 * top-left, top-right, bottom-left, bottom-right; the top-left washed in
 * `good`'s soft tint and the bottom-right in `bad`'s). Hover a bubble for
 * its numbers; a click opens it, growing it with `layoutIdOf`.
 */
export function BubbleMap({ items, avg, fill, ink, axes, corners, format, reduce, onOpen, layoutIdOf, tip }) {
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const L = 44; const R = 10; const T = 26; const B = 46;
  const pw = Math.max(0, w - L - R); const ph = Math.max(0, h - T - B);
  const STEP = 0.02;
  const lo = (v) => Math.floor((Math.min(...v) - 0.015) / STEP) * STEP;
  const hi = (v) => Math.ceil((Math.max(...v) + 0.015) / STEP) * STEP;
  const xs = [...items.map((it) => it.x), avg.x]; const ys = [...items.map((it) => it.y), avg.y];
  const [x0, x1, y0, y1] = [lo(xs), hi(xs), lo(ys), hi(ys)];
  const X = (v) => L + ((v - x0) / (x1 - x0 || 1)) * pw;
  const Y = (v) => T + ph - ((v - y0) / (y1 - y0 || 1)) * ph;
  const ticks = (a, b) => { const out = []; for (let v = a; v <= b + 1e-9; v += STEP) out.push(Math.round(v * 1000) / 1000); const k = Math.ceil(out.length / 6); return out.filter((_, i) => i % k === 0); };
  const biggest = Math.max(...items.map((it) => it.size), 1);
  const rOf = (it) => 12 + 14 * Math.sqrt(it.size / biggest);
  const ax = X(avg.x); const ay = Y(avg.y);
  const shown = items.find((it) => it.key === hover);
  const corner = (c, i) => {
    const right = i % 2 === 1; const low = i > 1;
    return (
      <span key={c.title} style={{ position: 'absolute', [right ? 'right' : 'left']: right ? R : L, [low ? 'bottom' : 'top']: low ? 0 : 2, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
        {c.tone && <span aria-hidden style={{ width: 7, height: 7, borderRadius: 999, background: c.tone }} />}
        {right ? <>{c.sub && <span style={{ ...small, fontSize: 9 }}>{c.sub} ·</span>}{c.title}</> : <>{c.title}{c.sub && <span style={{ ...small, fontSize: 9 }}>· {c.sub}</span>}</>}
      </span>
    );
  };
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }} onMouseLeave={() => setHover(null)}>
      {w > 0 && h > 0 && (
        <>
          <svg width={w} height={h} aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            <rect x={L} y={T} width={Math.max(0, ax - L)} height={Math.max(0, ay - T)} rx={12} fill="var(--good-soft)" opacity={0.75} />
            <rect x={ax} y={ay} width={Math.max(0, L + pw - ax)} height={Math.max(0, T + ph - ay)} rx={12} fill="var(--bad-soft)" opacity={0.75} />
            {ticks(x0, x1).map((v) => (
              <g key={`x${v}`}>
                <line x1={X(v)} x2={X(v)} y1={T} y2={T + ph} stroke="var(--grid)" />
                <text x={X(v)} y={T + ph + 14} textAnchor="middle" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)' }}>{format(v)}</text>
              </g>
            ))}
            {ticks(y0, y1).map((v) => (
              <g key={`y${v}`}>
                <line x1={L} x2={L + pw} y1={Y(v)} y2={Y(v)} stroke="var(--grid)" />
                <text x={L - 8} y={Y(v) + 3} textAnchor="end" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)' }}>{format(v)}</text>
              </g>
            ))}
            <line x1={ax} x2={ax} y1={T} y2={T + ph} stroke="var(--muted)" strokeOpacity={0.7} strokeDasharray="4 4" />
            <line x1={L} x2={L + pw} y1={ay} y2={ay} stroke="var(--muted)" strokeOpacity={0.7} strokeDasharray="4 4" />
            <text x={ax + 5} y={T + ph - 6} style={{ fontSize: 8.5, fontWeight: 700, fill: 'var(--muted)' }}>Company {format(avg.x)}</text>
            <text x={L + pw - 4} y={ay - 6} textAnchor="end" style={{ fontSize: 8.5, fontWeight: 700, fill: 'var(--muted)' }}>Company {format(avg.y)}</text>
            <text x={L + pw / 2} y={h - 3} textAnchor="middle" style={{ fontSize: 9, fontWeight: 800, fill: 'var(--text)' }}>{axes.x} →</text>
            <text transform={`translate(10, ${T}) rotate(-90)`} textAnchor="end" style={{ fontSize: 9, fontWeight: 800, fill: 'var(--text)' }}>{axes.y} →</text>
          </svg>
          {corners.map(corner)}
          {items.map((it, k) => {
            const r = rOf(it);
            const on = hover === it.key;
            return (
              <motion.button
                key={it.key}
                type="button"
                layoutId={layoutIdOf?.(it)}
                data-ins-bubble={it.key}
                aria-label={`${it.label}: ${tip(it).slice(1).join('; ')}. Open its profile`}
                onMouseEnter={() => setHover(it.key)}
                onFocus={() => setHover(it.key)}
                onBlur={() => setHover(null)}
                onClick={(e) => { e.stopPropagation(); onOpen?.(it.key); }}
                initial={{ opacity: 0, scale: reduce ? 1 : 0.2 }}
                animate={{ opacity: 1, scale: on ? 1.14 : 1 }}
                transition={reduce ? { duration: 0 } : { ...SPRING, stiffness: 260, damping: 20, delay: hover ? 0 : 0.15 + 0.035 * k }}
                style={{ position: 'absolute', left: X(it.x) - r, top: Y(it.y) - r, width: 2 * r, height: 2 * r, zIndex: on ? 5 : 2, padding: 0, display: 'grid', placeItems: 'center', borderRadius: 999, border: '2px solid var(--base)', background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.38), rgba(255,255,255,0) 58%), ${fill(it)}`, color: ink(it), boxShadow: on ? '0 12px 26px rgba(15,23,42,0.26)' : '0 4px 10px rgba(15,23,42,0.12)', fontSize: r > 18 ? 9.5 : 8, fontWeight: 900, letterSpacing: '0.02em', cursor: 'pointer' }}
              >
                {it.code}
              </motion.button>
            );
          })}
          {shown && (
            <Tip x={X(shown.x)} y={Y(shown.y) - rOf(shown) - 2} w={w}>
              {tip(shown).map((line, i) => <div key={line} style={i ? tipLine : tipTitle}>{line}</div>)}
            </Tip>
          )}
        </>
      )}
    </div>
  );
}

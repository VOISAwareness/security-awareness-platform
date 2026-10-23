import { useId, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { useSize } from './useSize';
import { Define } from './InsightsBits';
import { EASE, HEAD_H, SPRING, cardTitle, onScale, rise, small, TYPE } from './insightsUi';

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
export function Card({ title, sub, action, define, children, i = 0, reduce, style, layoutId, onOpen, openLabel = 'Open', ...rest }) {
  return (
    <motion.section
      layoutId={layoutId}
      {...rise(reduce, i)}
      className={`ins-card${onOpen ? ' ins-open' : ''}`}
      onClick={onOpen ? (e) => { if (!e.defaultPrevented) onOpen(); } : undefined}
      style={{ position: 'relative', minWidth: 0, minHeight: 0, containerType: 'size', display: 'flex', flexDirection: 'column', padding: '14px 16px 12px', borderRadius: 18, border: '1px solid var(--card-edge)', background: 'var(--card)', cursor: onOpen ? 'pointer' : 'default', ...style }}
      {...rest}
    >
      {(title || action || onOpen) && (
        <header style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ minWidth: 0 }}>
            <span style={{ height: HEAD_H, display: 'flex', alignItems: 'center', gap: 6 }}><span style={cardTitle}>{title}</span>{define && <Define term={define} />}</span>
            {sub && <span style={{ display: 'block', ...small, marginTop: -3 }}>{sub}</span>}
          </span>
          <span style={{ marginLeft: 'auto', flexShrink: 0, height: HEAD_H, display: 'flex', alignItems: 'center', gap: 8 }}>
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
    <button type="button" className="ins-go" onClick={onClick} {...rest} style={{ height: 26, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 9px 0 11px', borderRadius: 999, border: dark ? 'none' : '1px solid var(--card-edge)', background: dark ? 'rgba(255,255,255,0.12)' : 'var(--ghost)', color: dark ? 'inherit' : 'var(--text)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
      {label} <ArrowUpRight className="ins-go-arrow" size={12} strokeWidth={2.6} aria-hidden />
    </button>
  );
}

/** A legend: a short line or dot in each series' colour, then its name. */
export function Legend({ items }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {items.map((x) => (
        <span key={x.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: TYPE.small, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
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
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(o.id); }}
            style={{ position: 'relative', height: 26, padding: '0 11px', borderRadius: 8, border: 'none', background: 'transparent', cursor: on ? 'default' : 'pointer', fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', color: on ? 'var(--brand)' : 'var(--muted)', transition: 'color .2s ease' }}
          >
            {on && <motion.span layoutId={`${id}-pill`} transition={reduce ? { duration: 0 } : SPRING} style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'var(--pill)', boxShadow: '0 1px 3px rgba(15,23,42,0.12)' }} />}
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
    <div role="tooltip" data-ins-tip style={{ position: 'absolute', zIndex: 20, left: x, top: y, transform: `translate(${shift}, ${below ? `${edge ?? 10}px` : `calc(-100% - ${edge ?? 10}px)`})`, pointerEvents: 'none', minWidth: 150, padding: '8px 11px', borderRadius: 12, background: 'var(--glass)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', border: '1px solid var(--hair-strong)', boxShadow: '0 16px 34px rgba(15,23,42,0.18)', whiteSpace: 'nowrap', color: 'var(--text)' }}>
      {children}
    </div>
  );
}
const tipTitle = { fontSize: TYPE.body, fontWeight: 800, color: 'var(--text)' };
const tipLine = { ...small, marginTop: 3 };

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
 * A half gauge, like a speedometer: the score's bands round a half circle
 * from 0 on the left to 100 on the right, quiet, then the stretch from 0 to
 * the score drawn solid in its band's colour with a marker at its end; the
 * number and "/ 100" sit inside. `bands` are { to, color } in order.
 */
export function BandGauge({ value, bands, size = 112, stroke = 9, reduce, label, glowing = 'none' }) {
  const r = (size - stroke) / 2 - 1; const cx = size / 2; const cy = r + stroke / 2 + 1;
  const h = cy + 4;
  const at = (v) => { const t = Math.PI * (1 - Math.max(0, Math.min(100, v)) / 100); return [cx + r * Math.cos(t), cy - r * Math.sin(t)]; };
  const arc = (a, b) => { const [x0, y0] = at(a); const [x1, y1] = at(b); return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`; };
  const v = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const color = (bands.find((b) => v < b.to) || bands.at(-1)).color;
  const [mx, my] = at(v);
  const spans = bands.map((b, k) => ({ ...b, from: k ? bands[k - 1].to : 0 }));
  return (
    <span role="img" aria-label={label} style={{ position: 'relative', width: size, height: h, flexShrink: 0, display: 'block' }}>
      <svg width={size} height={h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {spans.map((b) => <path key={b.to} d={arc(b.from + (b.from ? 0.8 : 0), b.to - (b.to < 100 ? 0.8 : 0))} fill="none" stroke={b.color} strokeOpacity={0.3} strokeWidth={stroke} strokeLinecap="butt" />)}
        <motion.path d={arc(0, Math.max(v, 0.5))} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 0.9, ease: EASE, delay: reduce ? 0 : 0.15 }} />
        <motion.circle cx={mx} cy={my} r={stroke / 2 + 1} fill="var(--base)" stroke={color} strokeWidth={2} initial={{ opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.9 }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      </svg>
      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center', lineHeight: 1 }}>
        <span className="vs-rank" style={{ display: 'block', fontSize: onScale(size * 0.17), fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', textShadow: glowing }}>{Number.isFinite(value) ? value.toFixed(1) : '—'}</span>
        <span style={{ display: 'block', fontSize: TYPE.label, fontWeight: 800, color: 'var(--muted)', marginTop: 2 }}>/ 100</span>
      </span>
    </span>
  );
}

/**
 * A barcode meter: a field of thin lines, lit in `color` (growing stronger)
 * up to the share `value`, quiet after it, with a marker at the share.
 */
export function BarcodeMeter({ value, color, n = 54, height = 24, reduce, label }) {
  const at = Math.round(clamp(value) * n);
  // the lines are drawn once and revealed left to right by one clip, rather
  // than each line animating on its own
  return (
    <span role="img" aria-label={label} style={{ position: 'relative', height, width: '100%', minWidth: 0, display: 'block', paddingTop: 8, boxSizing: 'border-box' }}>
      <motion.span initial={{ clipPath: reduce ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: reduce ? 0 : 0.7, ease: EASE, delay: reduce ? 0 : 0.1 }} style={{ height: '100%', display: 'flex', alignItems: 'stretch', gap: 2 }}>
        {Array.from({ length: n }, (_, k) => (
          <span key={k} style={{ flex: '1 1 0', minWidth: 0, maxWidth: 3, borderRadius: 2, background: k < at ? color : 'var(--tick)', opacity: k < at ? 0.3 + 0.7 * ((k + 1) / Math.max(1, at)) : 1, transition: 'background-color .3s ease, opacity .3s ease' }} />
        ))}
      </motion.span>
      <motion.span aria-hidden initial={{ left: reduce ? `${(at / n) * 100}%` : '0%' }} animate={{ left: `${(at / n) * 100}%` }} transition={{ duration: reduce ? 0 : 0.7, ease: EASE, delay: reduce ? 0 : 0.1 }} style={{ position: 'absolute', top: 2, bottom: 0, width: 2, marginLeft: -1, borderRadius: 2, background: color }}>
        <span style={{ position: 'absolute', left: '50%', top: -4, width: 8, height: 8, marginLeft: -4, borderRadius: 999, background: color, boxShadow: '0 0 0 2px var(--plate)' }} />
      </motion.span>
    </span>
  );
}

const monthOf = (t) => new Date(t).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
// a month's name, with its year when it is January ("Jan ’26")
const monthLabel = (t) => { const d = new Date(t); return d.getUTCMonth() === 0 ? `Jan ’${String(d.getUTCFullYear()).slice(2)}` : monthOf(t); };
// how long ago a run of monthly steps began
const sinceWord = (months) => (months >= 23 ? 'two years ago' : months >= 11 ? 'a year ago' : `${months} months ago`);

/**
 * A staircase: the first step's value as a dot, then for each step a bar
 * from where the value was to where it went, in `good` when it fell and
 * `bad` when it rose, joined by a dashed tread; the steps in the period
 * (`lit`) in full colour, the first value and the newest on labels. Hover a
 * step for its numbers.
 */
export function Staircase({ at, values, lit, start, good, bad, format, reduce, tipHead, valueLabel = 'Risk score' }) {
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const L = 26; const R = 6; const T = 34; const B = 20;
  const n = values.length;
  const lo = Math.floor(Math.min(...values)) - 1; const hi = Math.ceil(Math.max(...values)) + 1;
  const pw = Math.max(0, w - L - R); const ph = Math.max(0, h - T - B);
  const slot = n ? pw / n : 0;
  const bw = Math.max(6, Math.min(30, slot * 0.6));
  const cx = (i) => L + slot * (i + 0.5);
  const y = (v) => T + ph - ((v - lo) / (hi - lo || 1)) * ph;
  const last = n - 1;
  const step = (i) => (i ? values[i] - values[i - 1] : null);
  const fell = values[last] - values[0];
  // with two years of months, every third month is named, counting back
  // from the newest; January carries its year
  const every = n > 14 ? 3 : 1;
  const labelled = (i) => (last - i) % every === 0;
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }} onMouseLeave={() => setHover(null)}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={`${valueLabel} by month, from ${format(values[0])} to ${format(values[last])}: ${values.slice(1).filter((v, i) => v < values[i]).length} of ${n - 1} months lower than the one before`} style={{ display: 'block', overflow: 'visible' }}>
          {[lo, Math.round((lo + hi) / 2), hi].map((v) => (
            <g key={v}>
              <line x1={L} x2={w - R} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeDasharray={v === lo ? undefined : '3 4'} />
              <text x={L - 8} y={y(v) + 3} textAnchor="end" style={{ fontSize: TYPE.label, fontWeight: 600, fill: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{v}</text>
            </g>
          ))}
          {values.map((v, i) => {
            const on = lit[i] || hover === i;
            const d = step(i);
            const x = cx(i) - bw / 2;
            const top = d === null ? 0 : Math.min(y(values[i - 1]), y(v));
            const ht = d === null ? 0 : Math.max(3, Math.abs(y(v) - y(values[i - 1])));
            return (
              <g key={at[i]} onMouseEnter={() => setHover(i)}>
                <rect x={cx(i) - slot / 2} y={T - 14} width={slot} height={ph + 14 + B} rx={10} fill={hover === i ? 'var(--plate)' : 'transparent'} />
                {d === null
                  ? <motion.circle cx={cx(i)} cy={y(v)} r={5.5} fill={start} stroke="var(--base)" strokeWidth={2} initial={{ scale: reduce ? 1 : 0 }} animate={{ scale: 1 }} transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.1, ease: EASE }} />
                  : (
                    <>
                      <motion.line x1={cx(i - 1) + (i === 1 ? 0 : bw / 2)} x2={x} y1={y(values[i - 1])} y2={y(values[i - 1])} stroke="var(--muted)" strokeOpacity={0.6} strokeDasharray="2 3" initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.08 + 0.035 * i }} />
                      <motion.rect
                        x={x} y={top} width={bw} height={ht} rx={Math.min(5, ht / 2, bw / 2)}
                        fill={d > 0 ? bad : good}
                        initial={{ scaleY: reduce ? 1 : 0, opacity: 0 }}
                        animate={{ scaleY: 1, opacity: on ? 1 : 0.72 }}
                        transition={reduce ? { duration: 0 } : { scaleY: { ...SPRING, stiffness: 200, damping: 22, delay: 0.15 + 0.07 * i }, opacity: { duration: 0.2, delay: hover === null ? 0.15 + 0.07 * i : 0 } }}
                        style={{ transformBox: 'fill-box', transformOrigin: d > 0 ? 'bottom' : 'top' }}
                      />
                    </>
                  )}
                {labelled(i) && <text x={cx(i)} y={h - 4} textAnchor="middle" style={{ fontSize: TYPE.label, fontWeight: lit[i] ? 800 : 600, fill: lit[i] ? 'var(--text)' : 'var(--muted)' }}>{monthLabel(at[i])}</text>}
              </g>
            );
          })}
        </svg>
      )}
      {w > 0 && hover === null && (
        <motion.span initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 1.1, duration: 0.35 }} style={{ pointerEvents: 'none' }}>
          <span style={{ position: 'absolute', left: Math.max(4, cx(0) - 10), top: y(values[0]) - 30, height: 20, padding: '0 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', background: 'var(--plate)', border: '1px solid var(--hair)', fontSize: TYPE.body, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{format(values[0])} {sinceWord(n - 1)}</span>
          <span style={{ position: 'absolute', left: Math.min(cx(last) + bw / 2, w - 4), top: y(values[last]) + 10, transform: 'translateX(-100%)', height: 20, padding: '0 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--ink)', color: 'var(--ink-on)', fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', boxShadow: '0 6px 14px rgba(15,23,42,0.18)' }}>{format(values[last])} now <span style={{ opacity: 0.7 }}>{fell <= 0 ? '▼' : '▲'}{Math.abs(fell).toFixed(1)}</span></span>
        </motion.span>
      )}
      {hover !== null && (
        <Tip x={cx(hover)} y={Math.min(y(values[hover]), hover ? y(values[hover - 1]) : Infinity) - 6} w={w}>
          <div style={tipTitle}>{tipHead(at[hover])}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 5, fontSize: TYPE.body, fontWeight: 700 }}>{valueLabel}<strong style={{ marginLeft: 'auto' }}>{format(values[hover])}</strong></div>
          <div style={tipLine}>{step(hover) === null ? 'Where the year starts' : Math.abs(step(hover)) < 0.05 ? 'Level with the month before' : `${step(hover) < 0 ? 'Down' : 'Up'} ${Math.abs(step(hover)).toFixed(1)} on the month before`}</div>
        </Tip>
      )}
    </div>
  );
}

/**
 * The gap, step by step: for each step a column from the zero line (the
 * `base` series, e.g. the whole company) up when `values` sat above it, in
 * `bad`, or down when below, in `good`; the steps in the period in full
 * colour, the newest gap on a bubble. Hover a step for both scores.
 */
export function GapBars({ at, values, base, lit, good, bad, reduce, tipHead, valueLabel, baseLabel, unit = 'pts' }) {
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const L = 34; const R = 4; const T = 30; const B = 20;
  const gaps = values.map((v, i) => v - base[i]);
  const lim = Math.max(0.5, Math.ceil(Math.max(...gaps.map((g) => Math.abs(g))) * 2 + 0.5) / 2);
  const n = gaps.length;
  const pw = Math.max(0, w - L - R); const ph = Math.max(0, h - T - B);
  const slot = n ? pw / n : 0;
  const bw = Math.max(6, Math.min(30, slot * 0.56));
  const cx = (i) => L + slot * (i + 0.5);
  const y = (g) => T + ph / 2 - (g / lim) * (ph / 2);
  const zero = y(0);
  const last = n - 1;
  const signed = (g) => `${g > 0.05 ? '+' : g < -0.05 ? '−' : ''}${Math.abs(g).toFixed(1)}`;
  const bar = (i) => {
    const g = gaps[i]; const top = Math.min(zero, y(g)); const ht = Math.max(2, Math.abs(y(g) - zero));
    const r = Math.min(7, bw / 2, ht);
    const x = cx(i) - bw / 2;
    // rounded at the far end only, square on the zero line
    return g >= 0
      ? `M${x},${zero} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${zero} Z`
      : `M${x},${zero} V${top + ht - r} Q${x},${top + ht} ${x + r},${top + ht} H${x + bw - r} Q${x + bw},${top + ht} ${x + bw},${top + ht - r} V${zero} Z`;
  };
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }} onMouseLeave={() => setHover(null)}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={`${valueLabel} against ${baseLabel}, month by month: ${gaps.map((g) => signed(g)).join(', ')} ${unit}`} style={{ display: 'block', overflow: 'visible' }}>
          {[lim, -lim].map((g) => (
            <g key={g}>
              <line x1={L} x2={w - R} y1={y(g)} y2={y(g)} stroke="var(--grid)" strokeDasharray="3 4" />
              <text x={L - 8} y={y(g) + 3} textAnchor="end" style={{ fontSize: TYPE.label, fontWeight: 600, fill: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{signed(g)}</text>
            </g>
          ))}
          {gaps.map((g, i) => {
            const on = lit[i] || hover === i;
            return (
              <g key={at[i]} onMouseEnter={() => setHover(i)}>
                <rect x={cx(i) - slot / 2} y={T - 10} width={slot} height={ph + 10 + B} rx={10} fill={hover === i ? 'var(--plate)' : 'transparent'} />
                <motion.path
                  d={bar(i)}
                  fill={g > 0 ? bad : good}
                  initial={{ scaleY: reduce ? 1 : 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: on ? 1 : 0.72 }}
                  transition={reduce ? { duration: 0 } : { scaleY: { ...SPRING, stiffness: 180, damping: 24, delay: 0.12 + 0.04 * i }, opacity: { duration: 0.2 } }}
                  style={{ transformBox: 'fill-box', transformOrigin: g >= 0 ? 'bottom' : 'top' }}
                />
                <text x={cx(i)} y={h - 4} textAnchor="middle" style={{ fontSize: TYPE.label, fontWeight: lit[i] ? 800 : 600, fill: lit[i] ? 'var(--text)' : 'var(--muted)' }}>{monthOf(at[i])}</text>
              </g>
            );
          })}
          <line x1={L} x2={w - R} y1={zero} y2={zero} stroke="var(--text)" strokeWidth={1.5} pointerEvents="none" />
          <text x={L - 8} y={zero + 3} textAnchor="end" style={{ fontSize: TYPE.label, fontWeight: 800, fill: 'var(--text)' }}>0</text>
        </svg>
      )}
      {w > 0 && hover === null && (
        <motion.span initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.9, duration: 0.35, ease: EASE }} style={{ position: 'absolute', left: Math.min(cx(last), w - 44), top: gaps[last] >= 0 ? y(gaps[last]) - 8 : y(gaps[last]) + 8, transform: gaps[last] >= 0 ? 'translate(-50%, -100%)' : 'translate(-50%, 0)', height: 20, padding: '0 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', background: 'var(--ink)', color: 'var(--ink-on)', fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', boxShadow: '0 6px 14px rgba(15,23,42,0.18)', pointerEvents: 'none' }}>{signed(gaps[last])} {unit}</motion.span>
      )}
      {w > 0 && <span style={{ position: 'absolute', left: L + 6, top: zero + 4, ...small, fontSize: TYPE.label, fontWeight: 700, pointerEvents: 'none' }}>{baseLabel}</span>}
      {hover !== null && (
        <Tip x={cx(hover)} y={Math.min(zero, y(gaps[hover])) - 4} w={w}>
          <div style={tipTitle}>{tipHead(at[hover])}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 5, fontSize: TYPE.body, fontWeight: 700 }}>{valueLabel}<strong style={{ marginLeft: 'auto' }}>{values[hover].toFixed(1)}</strong></div>
          <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: TYPE.body, fontWeight: 700 }}>{baseLabel}<strong style={{ marginLeft: 'auto' }}>{base[hover].toFixed(1)}</strong></div>
          <div style={tipLine}>{Math.abs(gaps[hover]) < 0.05 ? 'Level with it' : `${Math.abs(gaps[hover]).toFixed(1)} ${unit} ${gaps[hover] > 0 ? 'riskier' : 'safer'}`}</div>
        </Tip>
      )}
    </div>
  );
}

/** A plain sentence under a chart: what it shows, and a line of detail. */
export function Insight({ children, sub, tone }) {
  return (
    <div className="ins-optional" style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 10, padding: '9px 12px', borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--plate)' }}>
      {tone && <span aria-hidden style={{ flexShrink: 0, width: 7, height: 7, borderRadius: 999, marginTop: 4, background: tone }} />}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: TYPE.strong, fontWeight: 800, color: 'var(--text)', lineHeight: 1.35 }}>{children}</span>
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
  // laid out on the box's shape rounded to a quarter, then stretched to fit:
  // a few pixels more or less (fonts landing, a resize) stretch the tiles a
  // little instead of shuffling them
  const shape = w > 0 && h > 0 ? Math.max(0.5, Math.round((w / h) * 4) / 4) : 0;
  const tiles = shape ? squarify([...items].sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key)).map((it) => ({ ...it, area: (it.weight / total) * shape })), { x: 0, y: 0, w: shape, h: 1 })
    .map((t) => ({ ...t, x: (t.x / shape) * w, y: t.y * h, w: (t.w / shape) * w, h: t.h * h, at: { left: `calc(${(t.x / shape) * 100}% + 2px)`, top: `calc(${t.y * 100}% + 2px)`, width: `calc(${(t.w / shape) * 100}% - 4px)`, height: `calc(${t.h * 100}% - 4px)` } })) : [];
  const shown = tiles.find((t) => t.key === hover);
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }} onMouseLeave={() => setHover(null)}>
      {tiles.map((t, k) => {
        const big = t.w > 92 && t.h > 58;
        const fits = t.w > 34 && t.h > 26;
        const narrow = t.w <= 56; // just the short name and a smaller number
        const flat = fits && !narrow && t.h < 48; // too short for two lines: name and number side by side
        const name = t.short && (narrow || t.label.length * 5.8 > (t.w - 22 - (flat ? 36 : 0)) * (big ? 1.7 : 1)) ? t.short : t.label;

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
            className="ins-pop-in"
            animate={{ scale: hover === t.key ? 1.035 : 1 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
            style={{ '--d': `${0.05 + 0.02 * k}s`, position: 'absolute', ...t.at, zIndex: hover === t.key ? 3 : 1, overflow: 'hidden', display: 'flex', flexDirection: flat ? 'row' : 'column', justifyContent: 'space-between', alignItems: flat ? 'center' : 'flex-start', gap: flat ? 6 : 0, padding: fits ? (flat ? '0 9px' : narrow ? '7px 6px' : '8px 9px') : 0, border: 'none', borderRadius: 12, background: `linear-gradient(160deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 60%), ${fill(t)}`, color: ink(t), textAlign: 'left', cursor: 'pointer', boxShadow: hover === t.key ? '0 14px 28px rgba(15,23,42,0.22)' : '0 1px 0 rgba(255,255,255,0.25) inset' }}
          >
            {fits && <span style={{ minWidth: 0, maxWidth: '100%', fontSize: TYPE.small, fontWeight: 800, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: big ? 2 : 1, WebkitBoxOrient: 'vertical' }}>{name}</span>}
            {fits && <span className="vs-rank" style={{ flexShrink: 0, fontSize: big ? TYPE.number : flat || narrow ? TYPE.strong : TYPE.figure, fontWeight: 900, lineHeight: 1 }}>{t.text}</span>}
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
      <motion.div role="img" aria-label={parts.map((p) => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(', ')} initial={{ clipPath: reduce ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.15, ease: EASE }} style={{ display: 'flex', gap: 4, height }}>
        {parts.map((p) => (
          <span
            key={p.key}
            title={`${p.label}: ${p.text}`}
            style={{ flex: `${p.value} 1 0`, minWidth: 8, borderRadius: 10, background: `linear-gradient(180deg, ${light(p.color, 22)}, ${p.color})`, boxShadow: onDark ? 'none' : '0 1px 0 rgba(255,255,255,0.3) inset', transition: 'flex-grow .5s ease' }}
          />
        ))}
      </motion.div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${legendCols}, minmax(0,1fr))`, gap: '8px 14px' }}>
        {parts.map((p) => (
          <span key={p.key} style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span aria-hidden style={{ alignSelf: 'center', flexShrink: 0, width: 8, height: 8, borderRadius: 3, background: p.color }} />
            <span className="vs-rank" style={{ fontSize: TYPE.figure, fontWeight: 900 }}>{Math.round((p.value / total) * 100)}%</span>
            <span style={{ fontSize: TYPE.small, fontWeight: 700, opacity: onDark ? 0.75 : 1, color: onDark ? 'inherit' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * A donut: each part an arc of the ring, as long as its share, with a gap
 * between; `children` sit in the middle, and a legend beside it gives each
 * part's number and share. Hover an arc or a legend row to pick its part
 * out. Parts are { key, label, value, color, title }.
 */
export function Donut({ parts, label, children }) {
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const size = Math.floor(Math.max(0, Math.min(h, w * 0.46, 220)));
  const stroke = Math.max(10, Math.round(size * 0.12));
  const r = (size - stroke) / 2 - 3;
  const c = 2 * Math.PI * r;
  const gap = parts.filter((p) => p.value > 0).length > 1 ? 3 : 0;
  const arcs = parts.map((p, k) => ({ ...p, start: (parts.slice(0, k).reduce((a, x) => a + x.value, 0) / total) * c, len: (p.value / total) * c }));
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22 }} onMouseLeave={() => setHover(null)}>
      {size > 40 && (
        <span role="img" aria-label={label} className="ins-pop-in" style={{ '--d': '0.12s', position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} style={{ display: 'block', transform: 'rotate(-90deg)', overflow: 'visible' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
            {arcs.map((a) => a.len > 0 && (
              <circle
                key={a.key}
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={a.color} strokeWidth={hover === a.key ? stroke + 5 : stroke}
                strokeDasharray={`${Math.max(0.5, a.len - gap)} ${c}`} strokeDashoffset={-(a.start + gap / 2)}
                onMouseEnter={() => setHover(a.key)}
                style={{ opacity: hover && hover !== a.key ? 0.35 : 1, transition: 'opacity .2s ease, stroke-width .15s ease', cursor: 'default' }}
              />
            ))}
          </svg>
          <span style={{ position: 'absolute', inset: stroke + 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>{children}</span>
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0, maxWidth: 250, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {parts.map((p, k) => (
          <div key={p.key} title={p.title} onMouseEnter={() => setHover(p.key)} className="ins-in-x" style={{ '--d': `${0.2 + 0.04 * k}s`, display: 'grid', gridTemplateColumns: '8px minmax(0,1fr) auto 38px', alignItems: 'center', gap: 9, height: 30, padding: '0 8px', borderRadius: 8, background: hover === p.key ? 'var(--track)' : 'none', opacity: hover && hover !== p.key ? 0.55 : 1, transition: 'background .15s ease, opacity .2s ease' }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 3, background: p.color }} />
            <span style={{ minWidth: 0, fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
            <span className="vs-rank" style={{ fontSize: TYPE.strong, fontWeight: 900, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{p.value.toLocaleString('en-US')}</span>
            <span style={{ ...small, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{Math.round((p.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Pill columns: each item a column in its own rounded track, its value on a
 * bubble that rides the top of the bar; the first (or the `lit` one) in full
 * colour, the rest quieter. Hover for its numbers; a click opens it.
 */
export function PillColumns({ items, color, soft, reduce, onOpen, label, lit = null }) {
  const [hover, setHover] = useState(null);
  const [box, { w }] = useSize();
  const max = Math.max(...items.map((x) => x.value || 0), 0.0001) * 1.25;
  const n = items.length;
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', gap: 8, marginTop: 12 }} onMouseLeave={() => setHover(null)}>
      {items.map((x, i) => {
        const hgt = `${((x.value || 0) / max) * 100}%`;
        const strong = (lit === null ? i === 0 : x.key === lit) || hover === i;
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
                initial={{ scaleY: reduce ? 1 : 0 }}
                animate={{ scaleY: 1 }}
                transition={reduce ? { duration: 0 } : { ...SPRING, stiffness: 170, damping: 22, delay: 0.12 + 0.05 * i }}
                style={{ display: 'block', height: hgt, minHeight: 8, borderRadius: 11, transformOrigin: 'bottom', background: strong ? `linear-gradient(180deg, ${light(color, 28)}, ${color})` : soft, transition: 'background .2s ease, height .5s ease' }}
              />
              <motion.span
                initial={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : 0.25 + 0.04 * i }}
                style={{ position: 'absolute', left: '50%', bottom: `calc((100% - 10px) * ${(x.value || 0) / max} + 11px)`, marginLeft: -40, width: 80, display: 'flex', justifyContent: 'center', pointerEvents: 'none', transition: 'bottom .5s ease' }}
              >
                <span style={{ height: 20, padding: '0 7px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', background: strong ? 'var(--ink)' : 'var(--base)', color: strong ? 'var(--ink-on)' : 'var(--text)', boxShadow: '0 4px 10px rgba(15,23,42,0.12)', fontSize: TYPE.small, fontWeight: 800, whiteSpace: 'nowrap' }}>{x.text}</span>
              </motion.span>
            </span>
            <span style={{ ...small, fontWeight: 700, textAlign: 'center', color: strong ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.label}</span>
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
            <span style={{ display: 'block', ...small }}>{r.label}</span>
            <span className="vs-rank" style={{ display: 'block', fontSize: TYPE.heading, fontWeight: 900, lineHeight: 1.1 }}>{format(r.total)}</span>
          </span>
          <span style={{ position: 'relative', height: 30, display: 'flex' }}>
            <motion.span initial={{ clipPath: reduce ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.12 + 0.08 * k, ease: EASE }} style={{ display: 'flex', gap: 2, height: '100%', width: `${(r.total / max) * 100}%`, overflow: 'hidden', transition: 'width .5s ease' }}>
              {r.parts.map((pt) => (
                <span key={pt.key} title={`${pt.label}: ${format(pt.value)}`} style={{ flex: `${pt.value} 1 0`, minWidth: 4, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: pt.color, color: pt.ink, fontSize: TYPE.body, fontWeight: 800, overflow: 'hidden', whiteSpace: 'nowrap' }}>{pt.value / max > 0.08 ? format(pt.value) : ''}</span>
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
              <span style={{ fontSize: TYPE.body, fontWeight: 800 }}>{r.label}</span>
              {r.sub && <span style={{ ...small }}>{r.sub}</span>}
            </div>
            <div className="ins-cbar" style={{ height, borderRadius: 10, background: 'var(--plate)', overflow: 'hidden' }}>
              <motion.div initial={{ clipPath: reduce ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.12 + 0.08 * k, ease: EASE }} style={{ height: '100%', width: wd, transition: 'width .5s ease', minWidth: 58, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 10, boxSizing: 'border-box', background: `linear-gradient(90deg, ${light(r.color, 40)}, ${r.color})` }}>
                <span className="vs-rank" style={{ fontSize: TYPE.title, fontWeight: 900, color: '#FFFFFF' }}>{r.text}</span>
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
            return <motion.path key={`b${s.key}`} d={`M${xa},${yOf(s.value)} L${xb},${yOf(steps[i + 1].value)} L${xb},${T + ph} L${xa},${T + ph} Z`} fill={color} initial={{ opacity: 0 }} animate={{ opacity: 0.14 }} transition={{ duration: reduce ? 0 : 0.6, delay: reduce ? 0 : 0.3 + 0.06 * i }} />;
          })}
          {steps.map((s, i) => {
            const x = i * (colW + gap); const y = yOf(s.value);
            return (
              <g key={s.key}>
                <motion.rect x={x} width={colW} rx={12} fill={color} fillOpacity={1 - i * 0.14} initial={{ y: T + ph, height: 0 }} animate={{ y, height: T + ph - y }} transition={reduce ? { duration: 0 } : { duration: 0.8, delay: 0.15 + 0.1 * i, ease: EASE }} />
                <text x={x + colW / 2} y={y - 8} textAnchor="middle" className="vs-rank" style={{ fontSize: TYPE.figure, fontWeight: 900, fill: 'var(--text)' }}>{s.value.toLocaleString('en-US')}</text>
                <text x={x + colW / 2} y={h - 15} textAnchor="middle" style={{ fontSize: TYPE.body, fontWeight: 800, fill: 'var(--text)' }}>{s.label}</text>
                <text x={x + colW / 2} y={h - 3} textAnchor="middle" style={{ fontSize: TYPE.label, fontWeight: 600, fill: 'var(--muted)' }}>{i ? `${Math.round((s.value / first) * 100)}% of assigned` : 'people'}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/**
 * The risk ring: every group on a spoke around the whole's score, closer to
 * the centre safer. On each spoke a small open ring where the group stood
 * before and a dot where it stands now, joined by a tail: `good` when it
 * moved in, `bad` when it moved out. Behind them, rings every two points,
 * the stretch past `threshold` washed in `bad`'s tint, and the whole's
 * score as a dashed ring. Hover a spoke for its numbers; a click opens it.
 */
export function RiskRing({ items, whole, good, bad, neutral, threshold = 20, onOpen, tipHead, days, active = null, onHover }) {
  const [box, { w, h }] = useSize();
  const [own, setOwn] = useState(null);
  const S = Math.min(w, h);
  const cx = w / 2; const cy = h / 2;
  const r1 = Math.max(40, S / 2 - 36); const r0 = r1 * 0.3;
  const all = items.flatMap((it) => [it.now, it.before]).concat(whole.now);
  const lo = Math.floor((Math.min(...all) - 0.5) / 2) * 2; const hi = Math.ceil((Math.max(...all) + 0.5) / 2) * 2;
  const R = (v) => r0 + ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo || 1)) * (r1 - r0);
  const order = [...items].sort((a, b) => b.now - a.now || a.key.localeCompare(b.key));
  // the spoke lit: the one hovered here, else the one lit from outside
  const lit = own !== null ? own : order.findIndex((it) => it.key === active);
  const hover = lit >= 0 ? lit : null;
  const setHover = (i) => { setOwn(i); onHover?.(i === null ? null : order[i].key); };
  const n = order.length;
  const ang = (i) => ((-90 + (i / n) * 360) * Math.PI) / 180;
  const at = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const toneOf = (it) => { const d = it.now - it.before; return d < -0.05 ? good : d > 0.05 ? bad : neutral; };
  const ringPath = (r) => `M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0`;
  const steps = []; for (let v = lo; v <= hi; v += 2) steps.push(v);
  const shown = hover !== null ? order[hover] : null;
  const wd = whole.before !== undefined && whole.before !== null ? whole.now - whole.before : null;
  return (
    <div ref={box} className="ins-pop-in" style={{ '--d': '0.12s', position: 'relative', flex: 1, minHeight: 0 }} onMouseLeave={() => setHover(null)}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={order.map((it) => `${it.label} ${it.now.toFixed(1)}, ${it.before.toFixed(1)} before`).join('; ')} style={{ display: 'block', overflow: 'visible' }}>
          {threshold > lo && threshold < hi && <path d={`${ringPath(R(hi))} ${ringPath(R(threshold))}`} fill={bad} fillOpacity={0.06} fillRule="evenodd" />}
          {steps.map((v) => <circle key={v} cx={cx} cy={cy} r={R(v)} fill="none" stroke={v === threshold ? bad : 'var(--grid)'} strokeOpacity={v === threshold ? 0.45 : 1} strokeWidth={v === threshold ? 1.2 : 1} strokeDasharray={v === threshold ? undefined : '2 4'} />)}
          {steps.filter((v) => v > lo).map((v) => { const [tx, ty] = at(R(v), ang(0.5)); return <text key={`t${v}`} x={tx} y={ty + 3} textAnchor="middle" style={{ fontSize: TYPE.label, fontWeight: 600, fill: 'var(--muted)', paintOrder: 'stroke', stroke: 'var(--base)', strokeWidth: 3 }}>{v}</text>; })}
          <circle cx={cx} cy={cy} r={R(whole.now)} fill="none" stroke="var(--text)" strokeOpacity={0.5} strokeWidth={1.3} strokeDasharray="5 4" />
          {order.map((it, i) => {
            const a = ang(i);
            const dim = hover !== null && hover !== i;
            const [sx, sy] = at(r0 - 4, a); const [ex, ey] = at(r1 + 6, a);
            const [bx, by] = at(R(it.before), a); const [nx, ny] = at(R(it.now), a);
            const [lx, ly] = at(r1 + 20, a);
            const d = it.now - it.before;
            const c = toneOf(it);
            return (
              <g
                key={it.key}
                role="button"
                tabIndex={0}
                aria-label={`${it.label}: Risk Score ${it.now.toFixed(1)}, ${Math.abs(d) < 0.05 ? 'no change' : `${d < 0 ? 'down' : 'up'} ${Math.abs(d).toFixed(1)}`} on ${days} days ago. Open its profile`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => onOpen?.(it.key)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(it.key); } }}
                style={{ cursor: 'pointer', outline: 'none', opacity: dim ? 0.3 : 1, transition: 'opacity .2s ease' }}
              >
                <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={hover === i ? 'var(--hair-strong)' : 'var(--grid)'} strokeWidth={1} />
                <line x1={sx} y1={sy} x2={lx} y2={ly} stroke="transparent" strokeWidth={22} />
                <line x1={bx} y1={by} x2={nx} y2={ny} stroke={c} strokeOpacity={0.45} strokeWidth={5} strokeLinecap="round" />
                <circle cx={bx} cy={by} r={3} fill="var(--base)" stroke={neutral} strokeWidth={1.5} />
                <circle cx={nx} cy={ny} r={hover === i ? 8 : 6.5} fill={c} stroke="var(--base)" strokeWidth={2} style={{ transition: 'r .15s ease' }} />
                <text x={lx} y={ly - 1} textAnchor="middle" style={{ fontSize: TYPE.small, fontWeight: 800, fill: 'var(--text)' }}>{it.code}</text>
                <text x={lx} y={ly + 11} textAnchor="middle" style={{ fontSize: TYPE.label, fontWeight: 700, fill: 'var(--muted)' }}>
                  <tspan fill={c}>{d < -0.05 ? '▼' : d > 0.05 ? '▲' : '●'}</tspan> {Math.abs(d).toFixed(1)}
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={r0 - 8} fill="var(--base)" stroke="var(--hair)" />
        </svg>
      )}
      {w > 0 && h > 0 && (
        <div style={{ position: 'absolute', left: cx, top: cy, transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div className="vs-rank" style={{ fontSize: onScale(Math.max(14, Math.min(22, r0 * 0.36))), fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text)' }}>{whole.now.toFixed(1)}</div>
          <div style={{ ...small, fontSize: TYPE.label, fontWeight: 800, letterSpacing: '0.08em', marginTop: 3 }}>COMPANY</div>
          {wd !== null && <div style={{ fontSize: TYPE.label, fontWeight: 800, marginTop: 2, color: 'var(--text)' }}><span style={{ color: wd <= 0 ? good : bad }}>{wd < -0.05 ? '▼' : wd > 0.05 ? '▲' : '●'}</span> {Math.abs(wd).toFixed(1)}</div>}
        </div>
      )}
      {shown && (() => {
        const i = order.indexOf(shown); const [tx, ty] = at(R(shown.now), ang(i)); const d = shown.now - shown.before;
        return (
          <Tip x={tx} y={ty - 10} w={w}>
            <div style={tipTitle}>{tipHead(shown)}</div>
            <div style={{ display: 'flex', gap: 14, marginTop: 5, fontSize: TYPE.body, fontWeight: 700 }}>Risk Score now<strong style={{ marginLeft: 'auto' }}>{shown.now.toFixed(1)}</strong></div>
            <div style={{ display: 'flex', gap: 14, marginTop: 3, fontSize: TYPE.body, fontWeight: 700, color: 'var(--muted)' }}>{days} days ago<strong style={{ marginLeft: 'auto', color: 'var(--text)' }}>{shown.before.toFixed(1)}</strong></div>
            <div style={tipLine}>{Math.abs(d) < 0.05 ? 'No change' : `${d < 0 ? 'Safer' : 'Riskier'} by ${Math.abs(d).toFixed(1)} pts · open its profile`}</div>
          </Tip>
        );
      })()}
    </div>
  );
}


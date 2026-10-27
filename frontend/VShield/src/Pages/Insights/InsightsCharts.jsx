import { useContext, useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { useSize } from './useSize';
import { Define, Delta, Returning } from './InsightsBits';
import { EASE, HEAD_H, SPRING, TIER_WORD, cardTitle, onScale, pc, pc1, rise, small, TYPE } from './insightsUi';

// Insights' chart kit. Calm, plain marks: one solid colour per meaning (the
// roles in insightsUi.js, passed in by whoever draws the chart), thin lines,
// values in the text inks beside or above their marks, and a label on a fill
// only in an ink that reads on it. Every mark has a tip with its numbers, on
// hover and on keyboard focus (the arrow keys step from mark to mark); every
// value is also in the export. Each chart is in place within 450 ms; one the
// reader comes back to (Back), or one for a reader who asks for less motion,
// is simply there.

const clamp = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));

// ------------------------------------------------------------ motion

// One ease, a short stagger, no springs on data: duration + delay <= 0.45 s.
const INTRO = 0.32;
const lag = (i, step = 0.025) => Math.min(0.12, step * i);
const enter = (still, i = 0, step = 0.025) => (still ? { duration: 0 } : { duration: INTRO, delay: lag(i, step), ease: EASE });
// what fades in once its marks are drawn
const after = (still) => (still ? { duration: 0 } : { duration: 0.12, delay: 0.3, ease: EASE });
/** Whether a chart skips its entrance: the reader asks for less motion, or is coming back to the view. */
function useStill(reduce, returning) {
  const back = useContext(Returning.Context);
  return Boolean(reduce || (returning ?? back));
}

// ------------------------------------------------------------ ink on a fill

const lum = (hex) => {
  const m = /^#([0-9a-f]{6})$/i.exec(typeof hex === 'string' ? hex.trim() : '');
  if (!m) return null;
  const [r, g, b] = m[1].match(/../g).map((x) => { const c = parseInt(x, 16) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const x = lum(a); const y = lum(b); return x === null || y === null ? null : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/**
 * The ink for a label on a fill: the one asked for (tierText) when it reads
 * at 4.5:1, else whichever of white and near-black reads better. Fills that
 * are not plain hex are trusted to the ink asked for.
 */
const inkOn = (fill, ink) => {
  const c = contrast(ink, fill);
  if (c !== null && c >= 4.5) return ink;
  if (lum(fill) === null) return ink ?? 'var(--text)';
  return contrast('#FFFFFF', fill) >= contrast('#0F172A', fill) ? '#FFFFFF' : '#0F172A';
};

// ------------------------------------------------------------ tips

// Where an element sits in a box, in the box's own px (the app draws zoomed).
function within(box, el) {
  if (!box || !el) return null;
  const b = box.getBoundingClientRect(); const r = el.getBoundingClientRect();
  const k = box.offsetWidth ? b.width / box.offsetWidth : 1;
  return { x: (r.left + r.width / 2 - b.left) / k, right: (r.right - b.left) / k, top: (r.top - b.top) / k, bottom: (r.bottom - b.top) / k, w: box.offsetWidth };
}

/**
 * Hover and keys for a chart's marks. The pointer picks a mark; with the
 * chart focused from the keyboard, the arrow keys step through them
 * (starting at `from`), Home and End jump, Esc lets go. `place(i)`, when
 * given, measures where mark i's tip goes as it is picked.
 */
function useMarks(n, { from = 0, place } = {}) {
  const [pick, setPick] = useState(null);
  const [ring, setRing] = useState(false);
  const choose = (i) => setPick(i === null || i < 0 || i >= n ? null : { i, ...(place ? place(i) : null) });
  const keys = {
    tabIndex: 0,
    onFocus: (e) => {
      if (e.target !== e.currentTarget) return;
      const kbd = e.currentTarget.matches(':focus-visible');
      setRing(kbd);
      if (kbd && !pick) choose(from);
    },
    onBlur: () => { setRing(false); setPick(null); },
    onKeyDown: (e) => {
      const cur = pick ? pick.i : null;
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      let k = null;
      if (step) k = cur === null ? from : Math.max(0, Math.min(n - 1, cur + step));
      else if (e.key === 'Home') k = 0;
      else if (e.key === 'End') k = n - 1;
      else if (e.key === 'Escape') { setPick(null); return; }
      if (k === null) return;
      e.preventDefault(); e.stopPropagation();
      setRing(true); choose(k);
    },
    onMouseLeave: () => setPick(null),
  };
  return { pick, at: pick ? pick.i : null, choose, keys, focus: ring ? { outline: '2px solid var(--text)', outlineOffset: 3 } : null };
}

/** A small card that floats over a chart with a mark's numbers. */
export function Tip({ x, y, w, children, edge, below = false, style, id }) {
  const shift = x < w * 0.25 ? '0%' : x > w * 0.75 ? '-100%' : '-50%';
  return (
    <div role="tooltip" id={id} data-ins-tip style={{ position: 'absolute', zIndex: 20, left: x, top: y, transform: `translate(${shift}, ${below ? `${edge ?? 10}px` : `calc(-100% - ${edge ?? 10}px)`})`, pointerEvents: 'none', minWidth: 150, padding: '8px 11px', borderRadius: 12, background: 'var(--glass)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', border: '1px solid var(--hair-strong)', boxShadow: '0 16px 34px rgba(15,23,42,0.18)', whiteSpace: 'nowrap', color: 'var(--text)', ...style }}>
      {children}
    </div>
  );
}
const tipTitle = { fontSize: TYPE.body, fontWeight: 800, color: 'var(--text)' };
const tipLine = { ...small, marginTop: 3 };
// A tip's lines: a head, then rows whose value leads (a short key in the
// mark's colour, the name quieter), then notes.
function TipBody({ head, rows = [], notes = [] }) {
  return (
    <>
      {head && <div style={tipTitle}>{head}</div>}
      {rows.map((r, k) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, fontSize: TYPE.body, fontWeight: 600 }}>
          {r.color && <span aria-hidden style={{ flexShrink: 0, width: 10, height: 3, borderRadius: 2, background: r.color }} />}
          <span>{r.label}</span>
          <strong className="vs-rank" style={{ marginLeft: 'auto', paddingLeft: 14, fontWeight: 900 }}>{r.value}</strong>
        </div>
      ))}
      {notes.filter(Boolean).map((t) => <div key={t} style={tipLine}>{t}</div>)}
    </>
  );
}

/**
 * A tip for a small mark that lives inside other things (a gauge, a meter):
 * it opens on the page's sheet, so nothing round it clips it. It shows on
 * hover, and while the control the mark sits in has keyboard focus; a mark
 * in no control takes focus itself.
 */
function usePinnedTip(below = false) {
  const [el, setEl] = useState(null);
  const [at, setAt] = useState(null);
  const show = () => {
    const page = el?.closest('.ins-sheet');
    if (!page) return;
    const r = el.getBoundingClientRect(); const pr = page.getBoundingClientRect();
    const k = page.offsetWidth ? pr.width / page.offsetWidth : 1;
    setAt({ page, x: (r.left + r.width / 2 - pr.left) / k, y: ((below ? r.bottom : r.top) - pr.top) / k, w: page.offsetWidth });
  };
  const hide = () => setAt(null);
  const onHost = useEffectEvent((on) => (on ? show() : hide()));
  useEffect(() => {
    if (!el) return undefined;
    const host = el.parentElement?.closest('button, a[href], [tabindex]') || el;
    const own = host === el;
    if (own) el.setAttribute('tabindex', '0');
    const focus = () => onHost(host.matches(':focus-visible'));
    const blur = () => onHost(false);
    host.addEventListener('focus', focus);
    host.addEventListener('blur', blur);
    return () => {
      host.removeEventListener('focus', focus);
      host.removeEventListener('blur', blur);
      if (own) el.removeAttribute('tabindex');
    };
  }, [el]);
  const pin = (body) => (at ? createPortal(<Tip x={at.x} y={at.y} w={at.w} below={below} edge={6} style={{ zIndex: 60 }}>{body}</Tip>, at.page) : null);
  return { anchor: setEl, hover: { onMouseEnter: show, onMouseLeave: hide }, pin };
}

// ------------------------------------------------------------ cards

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
 * `id` names the pill so two switches never share it. One tab stop: the
 * arrow keys (and Home, End) move to the next choice and choose it, as
 * radio buttons and tabs do. With `tabs`, `panelId` names the panel the
 * chosen tab shows.
 */
export function Segmented({ id, label, value, options, onChange, reduce, tabs = false, panelId }) {
  const list = useRef(null);
  const at = options.findIndex((o) => o.id === value);
  const onKeyDown = (e) => {
    const all = [...(list.current?.querySelectorAll('[data-ins-option]') || [])];
    const from = all.indexOf(e.target);
    const n = options.length;
    const to = { ArrowRight: from + 1, ArrowDown: from + 1, ArrowLeft: from - 1, ArrowUp: from - 1, Home: 0, End: n - 1 }[e.key];
    if (from < 0 || to === undefined) return;
    e.preventDefault(); e.stopPropagation();
    const k = (to + n) % n;
    all[k]?.focus();
    if (options[k].id !== value) onChange(options[k].id);
  };
  return (
    <div ref={list} role={tabs ? 'tablist' : 'radiogroup'} aria-label={label} onKeyDown={onKeyDown} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2, padding: 2, borderRadius: 10, background: 'var(--track)' }}>
      {options.map((o, k) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role={tabs ? 'tab' : 'radio'}
            {...(tabs ? { 'aria-selected': on, id: `${id}-tab-${o.id}`, 'aria-controls': on && panelId ? panelId : undefined } : { 'aria-checked': on })}
            tabIndex={on || (at < 0 && k === 0) ? 0 : -1}
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

// ------------------------------------------------------------ gauges

/**
 * A ring gauge: the share of `max` as an arc over a quiet track, ticks
 * round the edge lit as far as the arc goes; what sits in the middle is
 * `children`. Hover (or focus) for `label`, and any `tip` lines.
 */
export function RingGauge({ value, max = 100, size = 64, stroke = 7, color, reduce, children, label, tip, returning }) {
  const still = useStill(reduce, returning);
  const { anchor, hover: onHover, pin } = usePinnedTip();
  const share = clamp(value / max);
  const r = (size - stroke) / 2 - 5;
  const c = 2 * Math.PI * r;
  const TICKS = 44;
  return (
    <span ref={anchor} role="img" aria-label={label} {...onHover} style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'inline-grid', placeItems: 'center', borderRadius: 999 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        {Array.from({ length: TICKS }, (_, k) => {
          const a = (k / TICKS) * Math.PI * 2;
          const r1 = size / 2 - 1.5; const r2 = size / 2 - 3.5;
          return <line key={k} x1={size / 2 + Math.cos(a) * r1} y1={size / 2 + Math.sin(a) * r1} x2={size / 2 + Math.cos(a) * r2} y2={size / 2 + Math.sin(a) * r2} stroke={k / TICKS < share ? color : 'var(--tick)'} strokeOpacity={k / TICKS < share ? 0.55 : 0.8} strokeWidth={1.4} strokeLinecap="round" />;
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: still ? c * (1 - share) : c }} animate={{ strokeDashoffset: c * (1 - share) }} transition={enter(still, 2)} />
      </svg>
      <span style={{ position: 'relative', textAlign: 'center', lineHeight: 1 }}>{children}</span>
      {pin(<TipBody head={label} notes={tip} />)}
    </span>
  );
}

/**
 * A half gauge, like a speedometer: the score's bands round a half circle
 * from 0 on the left to 100 on the right, quiet, then the stretch from 0 to
 * the score drawn solid in its band's colour with a marker at its end; the
 * number and "/ 100" sit inside. `bands` are { to, color } in order. Hover
 * (or focus the tile it sits in) for `label`, its band and any `tip` lines.
 */
export function BandGauge({ value, bands, size = 112, stroke = 9, reduce, label, glowing = 'none', tip, returning }) {
  const still = useStill(reduce, returning);
  const { anchor, hover: onHover, pin } = usePinnedTip(true);
  const r = (size - stroke) / 2 - 1; const cx = size / 2; const cy = r + stroke / 2 + 1;
  const h = cy + 4;
  const at = (v) => { const t = Math.PI * (1 - Math.max(0, Math.min(100, v)) / 100); return [cx + r * Math.cos(t), cy - r * Math.sin(t)]; };
  const arc = (a, b) => { const [x0, y0] = at(a); const [x1, y1] = at(b); return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`; };
  const v = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const spans = bands.map((b, k) => ({ ...b, from: k ? bands[k - 1].to : 0 }));
  const band = spans.find((b) => v < b.to) || spans.at(-1);
  const [mx, my] = at(v);
  return (
    <span ref={anchor} role="img" aria-label={label} {...onHover} style={{ position: 'relative', width: size, height: h, flexShrink: 0, display: 'block' }}>
      <svg width={size} height={h} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        {spans.map((b) => <path key={b.to} d={arc(b.from + (b.from ? 0.8 : 0), b.to - (b.to < 100 ? 0.8 : 0))} fill="none" stroke={b.color} strokeOpacity={0.3} strokeWidth={stroke} strokeLinecap="butt" />)}
        <motion.path d={arc(0, Math.max(v, 0.5))} fill="none" stroke={band.color} strokeWidth={stroke} strokeLinecap="round" initial={{ pathLength: still ? 1 : 0 }} animate={{ pathLength: 1 }} transition={enter(still, 1)} />
        <motion.circle cx={mx} cy={my} r={stroke / 2 + 1} fill="var(--base)" stroke={band.color} strokeWidth={2} initial={{ opacity: still ? 1 : 0, scale: still ? 1 : 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={after(still)} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      </svg>
      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0, textAlign: 'center', lineHeight: 1 }}>
        <span className="vs-rank" style={{ display: 'block', fontSize: onScale(size * 0.17), fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', textShadow: glowing }}>{Number.isFinite(value) ? value.toFixed(1) : '—'}</span>
        <span style={{ display: 'block', fontSize: TYPE.label, fontWeight: 800, color: 'var(--muted)', marginTop: 2 }}>/ 100</span>
      </span>
      {pin(<TipBody head={label} rows={spans.map((b) => ({ label: `${b.from} to ${b.to}${b === band ? ' · now' : ''}`, value: b === band && Number.isFinite(value) ? value.toFixed(1) : '', color: b.color }))} notes={tip} />)}
    </span>
  );
}

/**
 * A barcode meter: a field of thin lines, lit in `color` (growing stronger)
 * up to the share `value`, quiet after it, with a marker at the share.
 * Hover (or focus the tile it sits in) for `label`.
 */
export function BarcodeMeter({ value, color, n = 54, height = 24, reduce, label, tip, returning }) {
  const still = useStill(reduce, returning);
  const { anchor, hover: onHover, pin } = usePinnedTip(true);
  const at = Math.round(clamp(value) * n);
  // the lines are drawn once and revealed left to right by one clip, rather
  // than each line animating on its own
  return (
    <span ref={anchor} role="img" aria-label={label} {...onHover} style={{ position: 'relative', height, width: '100%', minWidth: 0, display: 'block', paddingTop: 8, boxSizing: 'border-box' }}>
      <motion.span initial={{ clipPath: still ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={enter(still, 2)} style={{ height: '100%', display: 'flex', alignItems: 'stretch', gap: 2 }}>
        {Array.from({ length: n }, (_, k) => (
          <span key={k} style={{ flex: '1 1 0', minWidth: 0, maxWidth: 3, borderRadius: 2, background: k < at ? color : 'var(--tick)', opacity: k < at ? 0.3 + 0.7 * ((k + 1) / Math.max(1, at)) : 1, transition: 'background-color .3s ease, opacity .3s ease' }} />
        ))}
      </motion.span>
      <motion.span aria-hidden initial={{ left: still ? `${(at / n) * 100}%` : '0%' }} animate={{ left: `${(at / n) * 100}%` }} transition={enter(still, 2)} style={{ position: 'absolute', top: 2, bottom: 0, width: 2, marginLeft: -1, borderRadius: 2, background: color }}>
        <span style={{ position: 'absolute', left: '50%', top: -4, width: 8, height: 8, marginLeft: -4, borderRadius: 999, background: color, boxShadow: '0 0 0 2px var(--plate)' }} />
      </motion.span>
      {pin(<TipBody head={label} notes={tip} />)}
    </span>
  );
}

/**
 * A sparkline: a short run of values (oldest first) as a thin line in the
 * quiet ink, the newest as a dot in `color`; for under a number, where a
 * bar would only restate it. Hover (or focus the tile it sits in) for every
 * value: `heads[i]` names each, `format` writes them.
 */
export function Sparkline({ values, color, height = 22, label, heads, format = (v) => `${v}`, reduce, returning }) {
  const [box, { w }] = useSize();
  const still = useStill(reduce, returning);
  const { anchor, hover: onHover, pin } = usePinnedTip(true);
  const ok = values.filter(Number.isFinite);
  const n = values.length; const last = n - 1;
  const lo = Math.min(...ok); const hi = Math.max(...ok);
  const pad = 4;
  const x = (i) => pad + (n > 1 ? ((w - 2 * pad) * i) / (n - 1) : (w - 2 * pad) / 2);
  const y = (v) => pad + (height - 2 * pad) * (1 - (hi > lo ? (v - lo) / (hi - lo) : 0.5));
  const d = values.map((v, i) => (Number.isFinite(v) ? `${i && Number.isFinite(values[i - 1]) ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}` : '')).join(' ');
  return (
    <span ref={anchor} role="img" aria-label={label} {...onHover} style={{ position: 'relative', display: 'block', width: '100%', minWidth: 0, height }}>
      <span ref={box} style={{ position: 'absolute', inset: 0 }}>
        {w > 0 && ok.length > 0 && (
          <svg width={w} height={height} style={{ display: 'block', overflow: 'visible' }}>
            <motion.path d={d} fill="none" stroke="var(--muted)" strokeOpacity={0.7} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" initial={{ pathLength: still ? 1 : 0 }} animate={{ pathLength: 1 }} transition={enter(still, 1)} />
            {Number.isFinite(values[last]) && <motion.circle cx={x(last)} cy={y(values[last])} r={3.5} fill={color} stroke="var(--plate)" strokeWidth={1.5} initial={{ opacity: still ? 1 : 0 }} animate={{ opacity: 1 }} transition={after(still)} />}
          </svg>
        )}
      </span>
      {pin(<TipBody head={label} rows={values.map((v, i) => ({ label: heads?.[i] ?? (i === last ? 'Now' : `${last - i} back`), value: Number.isFinite(v) ? format(v) : '—', color: i === last ? color : undefined }))} />)}
    </span>
  );
}

// ------------------------------------------------------------ over time

const monthOf = (t) => new Date(t).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
// a month's name, with its year when it is January ("Jan ’26")
const monthLabel = (t) => { const d = new Date(t); return d.getUTCMonth() === 0 ? `Jan ’${String(d.getUTCFullYear()).slice(2)}` : monthOf(t); };
const tickText = { fontSize: TYPE.label, fontWeight: 600, fill: 'var(--muted)', fontVariantNumeric: 'tabular-nums' };
const DAY_MS = 864e5;

// The risk levels' thresholds, drawn as faint rules on the Risk Score.
const RISK_RULES = [['moderate', 20], ['high', 35], ['critical', 60]].map(([k, v]) => ({ v, label: `${TIER_WORD[k]} from ${v}` }));
// A value axis on round steps, never finer than 5, so a small move looks small.
function axisOf(values) {
  const a = Math.min(...values); const b = Math.max(...values);
  const step = b - a <= 10 ? 5 : b - a <= 25 ? 10 : b - a <= 50 ? 20 : 25;
  let lo = Math.floor((a - step * 0.1) / step) * step;
  let hi = Math.ceil((b + step * 0.1) / step) * step;
  if (a >= 0) lo = Math.max(0, lo);
  if (hi - lo < 2 * step) {
    if (a - lo <= hi - b && (lo - step >= 0 || a < 0)) lo -= step; else hi += step;
  }
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}

/**
 * A level over time, month by month (the Risk Score): a line on a round
 * axis with the risk levels' thresholds as faint rules, the period shaded
 * (`lit`, the months in it). The period's own stretch of the line, its
 * first and its newest value carry the one change shown: the period's,
 * `better` (`down`) in `good`, worse in `bad`, none in `start`, the colour
 * of the rest of the line. A chip at the top says it with an arrow and a
 * sign. Hover or arrow keys for a month's numbers.
 * (Named for the staircase it once was; the props are unchanged.)
 */
export function Staircase({ at, values, lit, start, good, bad, format, reduce, tipHead, valueLabel = 'Risk Score', unit = 'pts', better = 'down', rules = RISK_RULES, returning }) {
  const [box, { w, h }] = useSize();
  const still = useStill(reduce, returning);
  const clip = `ins-line-${useId().replace(/[^a-z0-9]/gi, '')}`;
  const n = values.length; const last = n - 1;
  const marks = useMarks(n, { from: last });
  const hover = marks.at;
  // the period's change: from the month before its first to the newest,
  // worked out as the measures' change() works it out, so the two agree
  const first = lit.indexOf(true);
  const from = first > 0 ? first - 1 : -1;
  const d = from >= 0 ? values[last] - values[from] : null;
  const dir = d === null ? null : Math.abs(d) < 0.05 ? 'flat' : d > 0 ? 'up' : 'down';
  const c = dir && (dir === 'flat' ? { dir, shown: 'No change', good: null } : { dir, shown: `${Math.abs(d).toFixed(1)} ${unit}`, good: dir === better });
  const tone = !c || c.good === null ? start : c.good ? good : bad;
  const days = from >= 0 ? Math.round((at[last] - at[from]) / DAY_MS) : null;
  const L = 28; const R = Math.round(TYPE.strong * 2.6 + 12); const T = 30; const B = 20;
  const { lo, hi, ticks } = axisOf(values);
  const pw = Math.max(0, w - L - R); const ph = Math.max(0, h - T - B);
  const x = (i) => L + (n > 1 ? (pw * i) / (n - 1) : pw / 2);
  const y = (v) => T + ph - ((v - lo) / (hi - lo || 1)) * ph;
  const slot = n > 1 ? pw / (n - 1) : pw;
  const path = (a, b) => values.slice(a, b + 1).map((v, k) => `${k ? 'L' : 'M'}${x(a + k).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  // with two years of months, every third month is named, counting back
  // from the newest; January carries its year
  const every = n > 14 ? 3 : 1;
  const labelled = (i) => (last - i) % every === 0;
  const stepOf = (i) => (i ? values[i] - values[i - 1] : null);
  const inkOf = (i) => (from >= 0 && i >= from ? tone : start);
  // the period's first value sits on the side away from its neighbours
  const near = [values[from - 1], values[from + 1]].filter(Number.isFinite);
  const above = near.length ? near.reduce((a, v) => a + v, 0) / near.length <= values[from] : true;
  const said = c ? `; last ${days} days: ${dir === 'flat' ? 'no change' : `${dir} ${c.shown}`}` : '';
  const shownRules = rules.filter((r) => r.v > lo && r.v < hi);
  // a rule's name goes where the line keeps clear of it (left of the period,
  // above the rule, else below), so the two never cross
  const ruleSpot = (r) => {
    const ry = y(r.v); const wd = r.label.length * TYPE.label * 0.56 + 6; const lh = TYPE.label + 4;
    const end = from >= 0 ? x(from) - 6 : w - R;
    const clear = (x0, top, bottom) => {
      const sides = values.filter((v, i) => x(i) >= x0 - slot && x(i) <= x0 + wd + slot).map((v) => (y(v) < top - 3 ? -1 : y(v) > bottom + 3 ? 1 : 0));
      return sides.every((k) => k === -1) || sides.every((k) => k === 1);
    };
    for (let x0 = L + 4; x0 + wd <= end; x0 += Math.max(slot, 8)) {
      if (clear(x0, ry - lh, ry)) return { x: x0, y: ry - 4 };
      if (clear(x0, ry, ry + lh)) return { x: x0, y: ry + TYPE.label + 3 };
    }
    return { x: L + 4, y: ry - 4 };
  };
  return (
    <div ref={box} {...marks.keys} role="img" aria-label={`${valueLabel} by month, ${monthLabel(at[0])} to ${monthLabel(at[last])}: from ${format(values[0])} to ${format(values[last])}${said}`} style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0, borderRadius: 10, ...marks.focus }}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <clipPath id={clip}><motion.rect x={0} y={-8} height={h + 16} initial={{ width: still ? w : 0 }} animate={{ width: w }} transition={still ? { duration: 0 } : { duration: 0.36, ease: EASE }} /></clipPath>
          </defs>
          {/* each month: a hit area as tall as the chart, and its name */}
          {values.map((v, i) => (
            <g key={at[i]} onMouseEnter={() => marks.choose(i)}>
              <rect x={x(i) - slot / 2} y={T - 10} width={slot} height={ph + 10 + B} fill="transparent" />
              {labelled(i) && <text x={x(i)} y={h - 4} textAnchor="middle" style={{ fontSize: TYPE.label, fontWeight: lit[i] ? 800 : 600, fill: lit[i] ? 'var(--text)' : 'var(--muted)' }}>{monthLabel(at[i])}</text>}
            </g>
          ))}
          <g pointerEvents="none">
            {from >= 0 && <rect x={x(from)} y={T - 8} width={x(last) - x(from) + 10} height={ph + 8} rx={6} fill="var(--plate)" />}
            {ticks.map((v) => (
              <g key={v}>
                {!shownRules.some((r) => r.v === v) && <line x1={L} x2={w - R + 10} y1={y(v)} y2={y(v)} stroke="var(--grid)" />}
                <text x={L - 8} y={y(v) + 3} textAnchor="end" style={tickText}>{v}</text>
              </g>
            ))}
            {shownRules.map((r) => (
              <g key={r.v}>
                <line x1={L} x2={w - R + 10} y1={y(r.v)} y2={y(r.v)} stroke="var(--muted)" strokeOpacity={0.5} strokeDasharray="3 4" />
                <text {...ruleSpot(r)} style={{ ...tickText, paintOrder: 'stroke', stroke: 'var(--base)', strokeWidth: 3, strokeLinejoin: 'round' }}>{r.label}</text>
              </g>
            ))}
            <g clipPath={`url(#${clip})`}>
              <path d={path(0, last)} fill="none" stroke={start} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {from >= 0 && <path d={path(from, last)} fill="none" stroke={tone} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
            </g>
            <motion.g initial={{ opacity: still ? 1 : 0 }} animate={{ opacity: 1 }} transition={after(still)}>
              {from >= 0 && <circle cx={x(from)} cy={y(values[from])} r={4} fill="var(--base)" stroke={tone} strokeWidth={2} />}
              <circle cx={x(last)} cy={y(values[last])} r={4.5} fill={tone} stroke="var(--base)" strokeWidth={2} />
              {from >= 0 && from !== last && <text x={x(from)} y={above ? y(values[from]) - 10 : y(values[from]) + 10 + TYPE.small} textAnchor="middle" style={{ fontSize: TYPE.small, fontWeight: 700, fill: 'var(--text)', fontVariantNumeric: 'tabular-nums', paintOrder: 'stroke', stroke: 'var(--base)', strokeWidth: 3, strokeLinejoin: 'round' }}>{format(values[from])}</text>}
              <text x={x(last) + 9} y={y(values[last]) + TYPE.strong * 0.36} style={{ fontSize: TYPE.strong, fontWeight: 900, fill: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{format(values[last])}</text>
            </motion.g>
            {hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={T - 8} y2={T + ph} stroke="var(--hair-strong)" />
                <circle cx={x(hover)} cy={y(values[hover])} r={4} fill="var(--base)" stroke={inkOf(hover)} strokeWidth={2} />
              </g>
            )}
          </g>
        </svg>
      )}
      {w > 0 && c && (
        <motion.div initial={{ opacity: still ? 1 : 0 }} animate={{ opacity: 1 }} transition={after(still)} style={{ position: 'absolute', top: 0, right: 0, height: 20, display: 'flex', alignItems: 'center', gap: 7, pointerEvents: 'none' }}>
          <span style={{ ...small, whiteSpace: 'nowrap' }}>Last {days} days</span>
          <Delta c={c} ink={{ good, bad, context: start }} title={`From ${format(values[from])} to ${format(values[last])}`} />
        </motion.div>
      )}
      {hover !== null && w > 0 && (
        <Tip x={x(hover)} y={y(values[hover]) - 6} w={w}>
          <TipBody
            head={tipHead(at[hover])}
            rows={[{ label: valueLabel, value: format(values[hover]), color: inkOf(hover) }]}
            notes={[
              stepOf(hover) === null ? 'The first month shown' : Math.abs(stepOf(hover)) < 0.05 ? 'Level with the month before' : `${stepOf(hover) < 0 ? 'Down' : 'Up'} ${Math.abs(stepOf(hover)).toFixed(1)} on the month before`,
              hover === last && c ? `Last ${days} days: ${dir === 'flat' ? 'no change' : `${dir} ${c.shown}`}` : null,
            ]}
          />
        </Tip>
      )}
    </div>
  );
}

/**
 * The gap, step by step: for each step a column from the zero line (the
 * `base` series, e.g. the whole company) up when `values` sat above it, in
 * `bad`, or down when below, in `good`; the period (`lit`) shaded, the
 * newest gap on a bubble. Hover or arrow keys for a step's two scores.
 */
export function GapBars({ at, values, base, lit, good, bad, reduce, tipHead, valueLabel, baseLabel, unit = 'pts', returning }) {
  const [box, { w, h }] = useSize();
  const still = useStill(reduce, returning);
  const L = 34; const R = 4; const T = 30; const B = 20;
  const gaps = values.map((v, i) => v - base[i]);
  const lim = Math.max(0.5, Math.ceil(Math.max(...gaps.map((g) => Math.abs(g))) * 2 + 0.5) / 2);
  const n = gaps.length;
  const marks = useMarks(n, { from: n - 1 });
  const hover = marks.at;
  const pw = Math.max(0, w - L - R); const ph = Math.max(0, h - T - B);
  const slot = n ? pw / n : 0;
  const bw = Math.max(6, Math.min(24, slot * 0.5));
  const cx = (i) => L + slot * (i + 0.5);
  const y = (g) => T + ph / 2 - (g / lim) * (ph / 2);
  const zero = y(0);
  const last = n - 1;
  const first = lit.indexOf(true);
  const signed = (g) => `${g > 0.05 ? '+' : g < -0.05 ? '−' : ''}${Math.abs(g).toFixed(1)}`;
  const bar = (i) => {
    const g = gaps[i]; const top = Math.min(zero, y(g)); const ht = Math.max(2, Math.abs(y(g) - zero));
    const r = Math.min(4, bw / 2, ht);
    const x = cx(i) - bw / 2;
    // rounded at the far end only, square on the zero line
    return g >= 0
      ? `M${x},${zero} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${zero} Z`
      : `M${x},${zero} V${top + ht - r} Q${x},${top + ht} ${x + r},${top + ht} H${x + bw - r} Q${x + bw},${top + ht} ${x + bw},${top + ht - r} V${zero} Z`;
  };
  return (
    <div ref={box} {...marks.keys} role="img" aria-label={`${valueLabel} against ${baseLabel}, month by month: ${gaps.map((g) => signed(g)).join(', ')} ${unit}`} style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0, borderRadius: 10, ...marks.focus }}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
          {gaps.map((g, i) => (
            <g key={at[i]} onMouseEnter={() => marks.choose(i)}>
              <rect x={cx(i) - slot / 2} y={T - 10} width={slot} height={ph + 10 + B} rx={10} fill={hover === i ? 'var(--track)' : 'transparent'} />
              <text x={cx(i)} y={h - 4} textAnchor="middle" style={{ fontSize: TYPE.label, fontWeight: lit[i] ? 800 : 600, fill: lit[i] ? 'var(--text)' : 'var(--muted)' }}>{monthOf(at[i])}</text>
            </g>
          ))}
          <g pointerEvents="none">
            {first >= 0 && <rect x={cx(first) - slot / 2 + 2} y={T - 10} width={slot * (last - first + 1) - 4} height={ph + 10} rx={8} fill="var(--plate)" opacity={hover === null ? 1 : 0.6} />}
            {[lim, -lim].map((g) => (
              <g key={g}>
                <line x1={L} x2={w - R} y1={y(g)} y2={y(g)} stroke="var(--grid)" />
                <text x={L - 8} y={y(g) + 3} textAnchor="end" style={tickText}>{signed(g)}</text>
              </g>
            ))}
            {gaps.map((g, i) => (
              <motion.path
                key={at[i]}
                d={bar(i)}
                fill={g > 0 ? bad : good}
                initial={{ scaleY: still ? 1 : 0 }}
                animate={{ scaleY: 1 }}
                transition={enter(still, i, 0.012)}
                style={{ transformBox: 'fill-box', transformOrigin: g >= 0 ? 'bottom' : 'top' }}
              />
            ))}
            <line x1={L} x2={w - R} y1={zero} y2={zero} stroke="var(--text)" strokeWidth={1.5} />
            <text x={L - 8} y={zero + 3} textAnchor="end" style={{ fontSize: TYPE.label, fontWeight: 800, fill: 'var(--text)' }}>0</text>
          </g>
        </svg>
      )}
      {w > 0 && hover === null && (
        <motion.span initial={{ opacity: still ? 1 : 0 }} animate={{ opacity: 1 }} transition={after(still)} style={{ position: 'absolute', left: Math.min(cx(last), w - 44), top: gaps[last] >= 0 ? y(gaps[last]) - 8 : y(gaps[last]) + 8, transform: gaps[last] >= 0 ? 'translate(-50%, -100%)' : 'translate(-50%, 0)', height: 20, padding: '0 8px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', background: 'var(--ink)', color: 'var(--ink-on)', fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', boxShadow: '0 6px 14px rgba(15,23,42,0.18)', pointerEvents: 'none' }}>{signed(gaps[last])} {unit}</motion.span>
      )}
      {w > 0 && <span style={{ position: 'absolute', left: L + 6, top: zero + 4, ...small, fontSize: TYPE.label, fontWeight: 700, pointerEvents: 'none' }}>{baseLabel}</span>}
      {hover !== null && w > 0 && (
        <Tip x={cx(hover)} y={Math.min(zero, y(gaps[hover])) - 4} w={w}>
          <TipBody
            head={tipHead(at[hover])}
            rows={[{ label: valueLabel, value: values[hover].toFixed(1), color: gaps[hover] > 0 ? bad : good }, { label: baseLabel, value: base[hover].toFixed(1), color: 'var(--text)' }]}
            notes={[Math.abs(gaps[hover]) < 0.05 ? 'Level with it' : `${Math.abs(gaps[hover]).toFixed(1)} ${unit} ${gaps[hover] > 0 ? 'riskier' : 'safer'}`]}
          />
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

// ------------------------------------------------------------ parts of a whole

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

// How many lines a name wraps to at `cap` characters a line (a word longer
// than a line never fits).
function linesOf(text, cap) {
  if (cap < 3) return Infinity;
  let lines = 1; let len = 0;
  for (const word of String(text).split(/\s+/)) {
    if (word.length > cap) return Infinity;
    if (!len) len = word.length;
    else if (len + 1 + word.length <= cap) len += 1 + word.length;
    else { lines += 1; len = word.length; }
  }
  return lines;
}
const CHAR = 0.6; // a bold character's width, in ems

/**
 * A tile map: one rounded tile per item, its size its `weight`, its colour
 * from `fill(item)`, its full name (up to two lines) and number on it where
 * they fit, the number alone where only it fits, nothing on a tile too
 * small (its tip names it). Labels take `ink(item)` where it reads on the
 * fill, else the ink that does. Hover or focus lifts a tile and shows its
 * numbers; a click opens it. `tip(item)` gives the tooltip's lines.
 */
export function TileMap({ items, fill, ink, onOpen, reduce, tip, layoutIdOf, returning }) {
  const [box, { w, h }] = useSize();
  const still = useStill(reduce, returning);
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
    <div ref={box} style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0 }} onMouseLeave={() => setHover(null)}>
      {tiles.map((t, k) => {
        const tw = t.w - 4; const th = t.h - 4;
        const pad = tw < 60 ? 6 : 9;
        const numSize = tw > 92 && th > 58 ? TYPE.number : tw > 56 && th > 40 ? TYPE.figure : TYPE.strong;
        const numW = String(t.text).length * numSize * CHAR;
        const lineH = TYPE.small * 1.2;
        const hasNum = tw - 2 * pad >= numW && th - 2 * pad >= numSize;
        const cap = Math.floor((tw - 2 * pad) / (TYPE.small * CHAR));
        // a name over its number; or, on a short tile, beside it
        const stacked = hasNum && linesOf(t.label, cap) <= Math.min(2, Math.floor((th - 2 * pad - numSize - 3) / lineH));
        const besideCap = Math.floor((tw - 2 * pad - numW - 8) / (TYPE.small * CHAR));
        const beside = hasNum && !stacked && th - 2 * pad >= lineH && linesOf(t.label, besideCap) === 1;
        const name = stacked || beside;
        const lbl = inkOn(fill(t), ink(t));
        const on = hover === t.key;
        return (
          <motion.button
            key={t.key}
            type="button"
            layoutId={layoutIdOf?.(t)}
            data-ins-tile={t.key}
            aria-label={`${t.label}: ${t.text}. Open its profile`}
            onMouseEnter={() => setHover(t.key)}
            onFocus={() => setHover(t.key)}
            onBlur={() => setHover((x) => (x === t.key ? null : x))}
            onClick={(e) => { e.stopPropagation(); onOpen?.(t.key); }}
            className={still ? undefined : 'ins-pop-in'}
            animate={{ scale: on ? 1.035 : 1 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
            style={{ '--d': `${lag(k, 0.008)}s`, animationDuration: '0.3s', position: 'absolute', ...t.at, zIndex: on ? 3 : 1, overflow: 'hidden', display: 'flex', flexDirection: beside ? 'row' : 'column', justifyContent: hasNum && !name ? 'flex-end' : 'space-between', alignItems: beside ? 'center' : 'flex-start', gap: beside ? 8 : 0, padding: beside ? `0 ${pad}px` : pad, border: 'none', borderRadius: 10, background: fill(t), color: lbl, textAlign: 'left', cursor: 'pointer', boxShadow: on ? '0 14px 28px rgba(15,23,42,0.22)' : 'none' }}
          >
            {name && <span style={{ minWidth: 0, maxWidth: '100%', fontSize: TYPE.small, fontWeight: 800, lineHeight: 1.2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflowWrap: 'normal' }}>{t.label}</span>}
            {hasNum && <span className="vs-rank" style={{ flexShrink: 0, fontSize: numSize, fontWeight: 900, lineHeight: 1 }}>{t.text}</span>}
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
 * Hover a block, or focus the row and use the arrow keys, for its numbers.
 */
export function Blocks({ parts, reduce, height = 34, onDark = false, legendCols = 2, returning }) {
  const still = useStill(reduce, returning);
  const box = useRef(null);
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const marks = useMarks(parts.length, { place: (i) => within(box.current, box.current?.querySelectorAll('[data-ins-block]')[i]) });
  const pick = marks.pick;
  const p = pick && parts[pick.i];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div ref={box} {...marks.keys} style={{ position: 'relative', borderRadius: 10, ...marks.focus }}>
        <motion.div role="img" aria-label={parts.map((x) => `${x.label} ${Math.round((x.value / total) * 100)}%`).join(', ')} initial={{ clipPath: still ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={enter(still, 2)} style={{ display: 'flex', gap: 4, height }}>
          {parts.map((x, i) => (
            <span
              key={x.key}
              data-ins-block={x.key}
              onMouseEnter={() => marks.choose(i)}
              style={{ flex: `${x.value} 1 0`, minWidth: 8, borderRadius: 10, background: x.color, opacity: pick && pick.i !== i ? 0.45 : 1, transition: 'flex-grow .5s ease, opacity .15s ease' }}
            />
          ))}
        </motion.div>
        {p && pick.w > 0 && (
          <Tip x={pick.x} y={pick.top} w={pick.w} edge={8}>
            <TipBody head={p.label} rows={[{ label: `${p.text} of ${Math.round(total).toLocaleString('en-US')}`, value: pc1(p.value / total), color: p.color }]} />
          </Tip>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${legendCols}, minmax(0,1fr))`, gap: '8px 14px' }}>
        {parts.map((x) => (
          <span key={x.key} style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span aria-hidden style={{ alignSelf: 'center', flexShrink: 0, width: 8, height: 8, borderRadius: 3, background: x.color }} />
            <span className="vs-rank" style={{ fontSize: TYPE.figure, fontWeight: 900 }}>{Math.round((x.value / total) * 100)}%</span>
            <span style={{ fontSize: TYPE.small, fontWeight: 700, opacity: onDark ? 0.75 : 1, color: onDark ? 'inherit' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * A donut: each part an arc of the ring, as long as its share, with a gap
 * between; `children` sit in the middle, and a legend beside it gives each
 * part's number and share. Point anywhere on the ring (or at a legend row,
 * or focus it and use the arrow keys) to pick a part out and see its
 * numbers. Parts are { key, label, value, color, title }.
 */
export function Donut({ parts, label, children, reduce, returning }) {
  const [box, { w, h }] = useSize();
  const still = useStill(reduce, returning);
  const marks = useMarks(parts.length);
  const hover = marks.at;
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const size = Math.floor(Math.max(0, Math.min(h, w * 0.46, 220)));
  const stroke = Math.max(10, Math.round(size * 0.12));
  const r = (size - stroke) / 2 - 3;
  const c = 2 * Math.PI * r;
  const gap = parts.filter((p) => p.value > 0).length > 1 ? 3 : 0;
  const arcs = parts.map((p, k) => ({ ...p, start: (parts.slice(0, k).reduce((a, x) => a + x.value, 0) / total) * c, len: (p.value / total) * c }));
  // the part under the pointer, by its angle round the middle
  const pickAt = (e) => {
    const b = e.currentTarget.getBoundingClientRect();
    const turn = ((Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)) + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
    const k = arcs.findIndex((a) => a.len > 0 && turn * c < a.start + a.len);
    marks.choose(k < 0 ? null : k);
  };
  const a = hover === null ? null : arcs[hover];
  const mid = a && ((a.start + a.len / 2) / c) * 2 * Math.PI - Math.PI / 2;
  return (
    <div ref={box} {...marks.keys} role="img" aria-label={label} style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, borderRadius: 10, ...marks.focus }}>
      {size > 40 && (
        <span onMouseMove={pickAt} className={still ? undefined : 'ins-pop-in'} style={{ '--d': '0.04s', animationDuration: '0.3s', position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} aria-hidden style={{ display: 'block', transform: 'rotate(-90deg)', overflow: 'visible' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
            {arcs.map((x) => x.len > 0 && (
              <circle
                key={x.key}
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={x.color} strokeWidth={a && a.key === x.key ? stroke + 5 : stroke}
                strokeDasharray={`${Math.max(0.5, x.len - gap)} ${c}`} strokeDashoffset={-(x.start + gap / 2)}
                style={{ opacity: a && a.key !== x.key ? 0.35 : 1, transition: 'opacity .2s ease, stroke-width .15s ease', cursor: 'default' }}
              />
            ))}
          </svg>
          <span style={{ position: 'absolute', inset: stroke + 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none' }}>{children}</span>
          {a && (
            <Tip x={size / 2 + Math.cos(mid) * r} y={size / 2 + Math.sin(mid) * r - stroke / 2} w={size} edge={6}>
              <TipBody head={a.label} rows={[{ label: `${a.value.toLocaleString('en-US')} of ${Math.round(total).toLocaleString('en-US')}`, value: pc1(a.value / total), color: a.color }]} notes={[a.title]} />
            </Tip>
          )}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0, maxWidth: 250, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {parts.map((p, k) => (
          <div key={p.key} onMouseEnter={() => marks.choose(k)} className={still ? undefined : 'ins-in-x'} style={{ '--d': `${lag(k, 0.03)}s`, animationDuration: '0.3s', display: 'grid', gridTemplateColumns: '8px minmax(0,1fr) auto 38px', alignItems: 'center', gap: 9, height: 30, padding: '0 8px', borderRadius: 8, background: hover === k ? 'var(--track)' : 'none', opacity: hover !== null && hover !== k ? 0.55 : 1, transition: 'background .15s ease, opacity .2s ease' }}>
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
 * Pill columns: each item a column in its own rounded track, every bar in
 * the one `color` (the role the caller passes; rank never colours), its
 * value above it, to one decimal where the items' own text would round
 * near-equal values alike. Hover or focus outlines a column and shows its
 * numbers (`tip` lines, else its name and value); `lit` outlines the one
 * on show; a click opens it. `format(value)`, when given, writes the values.
 */
export function PillColumns({ items, color, reduce, onOpen, label, lit = null, format, returning }) {
  const still = useStill(reduce, returning);
  const [hover, setHover] = useState(null);
  const [box, { w }] = useSize();
  const max = Math.max(...items.map((x) => x.value || 0), 0.0001) * 1.25;
  const n = items.length;
  // "10%" from pc() says less than its value knows: say it to a decimal
  const textOf = (x) => (format ? format(x.value) : Number.isFinite(x.value) && x.text === pc(x.value) ? pc1(x.value) : x.text);
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0, display: 'flex', gap: 8, marginTop: 12 }} onMouseLeave={() => setHover(null)}>
      {items.map((x, i) => {
        const share = (x.value || 0) / max;
        const on = hover === i || x.key === lit;
        const Tag = onOpen ? 'button' : 'div';
        return (
          <Tag
            key={x.key}
            {...(onOpen ? { type: 'button', onClick: (e) => { e.stopPropagation(); onOpen(x.key); } } : { tabIndex: 0 })}
            className="ins-col"
            data-ins-col={x.key}
            aria-label={`${x.label}: ${textOf(x)} ${label}`}
            aria-current={x.key === lit ? 'true' : undefined}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7, padding: 0, border: 'none', background: 'none', color: 'var(--text)', cursor: onOpen ? 'pointer' : 'default' }}
          >
            <span style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', padding: 5, borderRadius: 14, background: 'var(--plate)' }}>
              <motion.span
                initial={{ scaleY: still ? 1 : 0 }}
                animate={{ scaleY: 1 }}
                transition={enter(still, i, 0.02)}
                style={{ display: 'block', width: '100%', maxWidth: 56, height: `${share * 100}%`, minHeight: 6, borderRadius: '9px 9px 4px 4px', transformOrigin: 'bottom', background: color, outline: on ? '2px solid var(--text)' : '2px solid transparent', outlineOffset: 2, transition: 'outline-color .15s ease, height .5s ease' }}
              />
              <motion.span
                initial={{ opacity: still ? 1 : 0 }}
                animate={{ opacity: 1 }}
                transition={after(still)}
                style={{ position: 'absolute', left: '50%', bottom: `calc((100% - 10px) * ${share} + 11px)`, marginLeft: -40, width: 80, display: 'flex', justifyContent: 'center', pointerEvents: 'none', transition: 'bottom .5s ease' }}
              >
                <span className="vs-rank" style={{ height: 20, padding: '0 7px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', background: 'var(--base)', color: 'var(--text)', boxShadow: '0 2px 6px rgba(15,23,42,0.10)', fontSize: TYPE.small, fontWeight: 800, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{textOf(x)}</span>
              </motion.span>
            </span>
            <span style={{ ...small, fontWeight: on ? 800 : 700, textAlign: 'center', color: on ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.label}</span>
          </Tag>
        );
      })}
      {hover !== null && w > 0 && (
        <Tip x={((hover + 0.5) / n) * w} y={0} w={w} edge={-2}>
          {(items[hover].tip || [items[hover].label, textOf(items[hover])]).map((line, k) => <div key={line} style={k ? tipLine : tipTitle}>{line}</div>)}
        </Tip>
      )}
    </div>
  );
}

/**
 * Rows of stacked parts on one scale: each row's parts side by side, as
 * long as their values, with a 2px gap and the value on a part wide enough
 * to hold it (in the part's `ink` where it reads on its colour, else the
 * ink that does); a row's total before its bar. Hover a part, or focus the
 * chart and use the arrow keys, for its numbers.
 */
export function MakeupBars({ rows, max, reduce, format, returning }) {
  const still = useStill(reduce, returning);
  const box = useRef(null);
  const [fit, { w }] = useSize();
  const all = rows.flatMap((r) => r.parts.map((pt) => ({ r, pt })));
  const marks = useMarks(all.length, { place: (i) => within(box.current, box.current?.querySelectorAll('[data-ins-part]')[i]) });
  const pick = marks.pick;
  const LABEL_W = 84;
  const barW = Math.max(0, w - LABEL_W - 12);
  const fits = (v) => (v / max) * barW >= format(v).length * TYPE.body * CHAR + 12;
  const offset = rows.map((r, k) => rows.slice(0, k).reduce((a, x) => a + x.parts.length, 0));
  return (
    <div ref={box} {...marks.keys} role="img" aria-label={rows.map((r) => `${r.label} ${format(r.total)}: ${r.parts.map((pt) => `${pt.label} ${format(pt.value)}`).join(', ')}`).join('; ')} style={{ position: 'relative', borderRadius: 10, ...marks.focus }}>
      <div ref={fit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((r, k) => (
          <div key={r.key} style={{ display: 'grid', gridTemplateColumns: `${LABEL_W}px minmax(0,1fr)`, alignItems: 'center', gap: 12 }}>
            <span>
              <span style={{ display: 'block', ...small }}>{r.label}</span>
              <span className="vs-rank" style={{ display: 'block', fontSize: TYPE.heading, fontWeight: 900, lineHeight: 1.1 }}>{format(r.total)}</span>
            </span>
            <span style={{ position: 'relative', height: 30, display: 'flex' }}>
              <motion.span initial={{ clipPath: still ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={enter(still, k, 0.05)} style={{ display: 'flex', gap: 2, height: '100%', width: `${(r.total / max) * 100}%`, overflow: 'hidden', transition: 'width .5s ease' }}>
                {r.parts.map((pt, j) => {
                  const i = offset[k] + j;
                  return (
                    <span key={pt.key} data-ins-part={`${r.key}:${pt.key}`} onMouseEnter={() => marks.choose(i)} style={{ flex: `${pt.value} 1 0`, minWidth: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: pt.color, color: inkOn(pt.color, pt.ink), fontSize: TYPE.body, fontWeight: 800, overflow: 'hidden', whiteSpace: 'nowrap', opacity: pick && pick.i !== i ? 0.45 : 1, transition: 'opacity .15s ease' }}>{w > 0 && fits(pt.value) ? format(pt.value) : ''}</span>
                  );
                })}
              </motion.span>
            </span>
          </div>
        ))}
      </div>
      {pick && pick.w > 0 && (
        <Tip x={pick.x} y={pick.top} w={pick.w} edge={6}>
          <TipBody head={all[pick.i].pt.label} rows={[{ label: all[pick.i].r.label, value: format(all[pick.i].pt.value), color: all[pick.i].pt.color }]} notes={[`${Math.round((all[pick.i].pt.value / (all[pick.i].r.total || 1)) * 100)}% of ${format(all[pick.i].r.total)}`]} />
        </Tip>
      )}
    </div>
  );
}

/**
 * Comparison bars: one rounded bar per row in its `color`, the value just
 * past the bar's end in the text's ink (never on the fill). Hover a bar, or
 * focus the chart and use the arrow keys, for its numbers.
 */
export function CompareBars({ rows, reduce, max, height = 30, returning }) {
  const still = useStill(reduce, returning);
  const box = useRef(null);
  const top = max ?? Math.max(...rows.map((r) => r.value || 0), 0.0001) * 1.08;
  const marks = useMarks(rows.length, { place: (i) => within(box.current, box.current?.querySelectorAll('[data-ins-cbar]')[i]) });
  const pick = marks.pick;
  // room past the longest bar for its value
  const room = Math.ceil(Math.max(...rows.map((r) => String(r.text).length)) * TYPE.title * CHAR) + 14;
  return (
    <div ref={box} {...marks.keys} role="img" aria-label={rows.map((r) => `${r.label}${r.sub ? ` (${r.sub})` : ''}: ${r.text}`).join('; ')} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, borderRadius: 10, ...marks.focus }}>
      {rows.map((r, k) => {
        const share = clamp((r.value || 0) / top);
        return (
          <div key={r.key}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: TYPE.body, fontWeight: 800 }}>{r.label}</span>
              {r.sub && <span style={{ ...small }}>{r.sub}</span>}
            </div>
            <div className="ins-cbar" onMouseEnter={() => marks.choose(k)} style={{ position: 'relative', height, borderRadius: 10, background: 'var(--plate)' }}>
              <motion.div data-ins-cbar={r.key} initial={{ clipPath: still ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }} animate={{ clipPath: 'inset(0 0% 0 0)' }} transition={enter(still, k, 0.06)} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `calc((100% - ${room}px) * ${share})`, minWidth: 8, borderRadius: 10, background: r.color, opacity: pick && pick.i !== k ? 0.45 : 1, transition: 'width .5s ease, opacity .15s ease' }} />
              <motion.span className="vs-rank" initial={{ opacity: still ? 1 : 0 }} animate={{ opacity: 1 }} transition={after(still)} style={{ position: 'absolute', top: 0, bottom: 0, left: `calc((100% - ${room}px) * ${share} + 8px)`, display: 'flex', alignItems: 'center', fontSize: TYPE.title, fontWeight: 900, color: 'var(--text)', whiteSpace: 'nowrap', transition: 'left .5s ease' }}>{r.text}</motion.span>
            </div>
          </div>
        );
      })}
      {pick && pick.w > 0 && (
        <Tip x={pick.right} y={pick.top} w={pick.w} edge={6}>
          <TipBody head={rows[pick.i].label} rows={[{ label: rows[pick.i].sub || '', value: rows[pick.i].text, color: rows[pick.i].color }]} notes={rows[pick.i].tip} />
        </Tip>
      )}
    </div>
  );
}

/**
 * A stepped funnel: a column per step, as tall as its people, joined to the
 * next by a soft band; its number over it and its share under it. Hover a
 * step, or focus the chart and use the arrow keys, for its numbers.
 */
export function StepFunnel({ steps, color, reduce, returning }) {
  const [box, { w, h }] = useSize();
  const still = useStill(reduce, returning);
  const n = steps.length;
  const marks = useMarks(n);
  const hover = marks.at;
  const first = steps[0]?.value || 1;
  const slot = n ? w / n : 0;
  const colW = Math.max(18, Math.min(slot * 0.5, 72));
  const cx = (i) => slot * (i + 0.5);
  const T = Math.ceil(TYPE.figure + 12); const B = Math.ceil(TYPE.body * 1.3 + TYPE.label * 1.3 + 6);
  const ph = Math.max(0, h - T - B);
  const base = T + ph;
  const yOf = (v) => T + ph - (v / first) * ph;
  const share = (s, i) => (i ? `${Math.round((s.value / first) * 100)}% of ${steps[0].label.toLowerCase()}` : 'people');
  const col = (i, y) => {
    const x = cx(i) - colW / 2; const r = Math.min(6, colW / 2, base - y);
    return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + colW - r} Q${x + colW},${y} ${x + colW},${y + r} V${base} Z`;
  };
  return (
    <div ref={box} {...marks.keys} role="img" aria-label={steps.map((s, i) => `${s.label} ${s.value.toLocaleString('en-US')}${i ? ` (${share(s, i)})` : ''}`).join(', ')} style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0, borderRadius: 10, ...marks.focus }}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} aria-hidden style={{ display: 'block', overflow: 'visible' }}>
          {steps.map((s, i) => {
            const y = yOf(s.value);
            return (
              <g key={s.key} onMouseEnter={() => marks.choose(i)}>
                <rect x={cx(i) - slot / 2} y={0} width={slot} height={h} rx={10} fill={hover === i ? 'var(--track)' : 'transparent'} />
                {i < n - 1 && <motion.path d={`M${cx(i) + colW / 2},${y} L${cx(i + 1) - colW / 2},${yOf(steps[i + 1].value)} L${cx(i + 1) - colW / 2},${base} L${cx(i) + colW / 2},${base} Z`} fill={color} pointerEvents="none" initial={{ opacity: still ? 0.14 : 0 }} animate={{ opacity: 0.14 }} transition={after(still)} />}
                <motion.path d={col(i, y)} fill={color} pointerEvents="none" initial={{ scaleY: still ? 1 : 0 }} animate={{ scaleY: 1 }} transition={enter(still, i, 0.04)} style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }} />
                <text x={cx(i)} y={y - 8} textAnchor="middle" className="vs-rank" pointerEvents="none" style={{ fontSize: TYPE.figure, fontWeight: 900, fill: 'var(--text)' }}>{s.value.toLocaleString('en-US')}</text>
                <text x={cx(i)} y={h - 4 - TYPE.label * 1.3} textAnchor="middle" pointerEvents="none" style={{ fontSize: TYPE.body, fontWeight: 800, fill: 'var(--text)' }}>{s.label}</text>
                <text x={cx(i)} y={h - 3} textAnchor="middle" pointerEvents="none" style={{ fontSize: TYPE.label, fontWeight: 600, fill: 'var(--muted)' }}>{share(s, i)}</text>
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && w > 0 && (
        <Tip x={cx(hover)} y={yOf(steps[hover].value) - TYPE.figure - 10} w={w}>
          <TipBody head={steps[hover].label} rows={[{ label: 'People', value: steps[hover].value.toLocaleString('en-US'), color }]} notes={[hover ? share(steps[hover], hover) : null, hover ? `${(steps[hover - 1].value - steps[hover].value).toLocaleString('en-US')} fewer than ${steps[hover - 1].label.toLowerCase()}` : null]} />
        </Tip>
      )}
    </div>
  );
}

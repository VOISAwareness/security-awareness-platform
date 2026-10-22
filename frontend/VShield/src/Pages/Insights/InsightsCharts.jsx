import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

import { useSize } from './useSize';
import { EASE, SPRING, TIER_RULE, TIER_WORD, cardTitle, rise, small } from './insightsUi';

// Insights' building blocks: the bento card, the sliding switch, and the
// charts (tick-bar sparkline, line chart, rounded columns, the people grid,
// how fast reports come in). Thin marks, hairline solid grids, a 2px surface
// ring on end dots, a legend wherever there is more than one series; every
// mark has a hover with its numbers, and every value is also in the tables
// and the export. Text stays in the text inks; colour sits on the marks.

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

/** A legend: a short line or dot in each series' colour, then its name. */
export function Legend({ items }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      {items.map((x) => (
        <span key={x.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
          <span aria-hidden style={{ width: x.line ? 14 : 8, height: x.line ? 3 : 8, borderRadius: 999, background: x.color, opacity: x.faint ? 0.45 : 1 }} />{x.label}
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
const tipRow = { display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 10, fontWeight: 700, color: 'var(--text)' };

/**
 * A sparkline of ticks, oldest to newest, in the quiet ink; the newest in
 * `color` with a dot on top. From zero, so a tick's height is its value.
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
const monthOf = (t) => new Date(t).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });

/**
 * Lines over time on one axis: each series { id, label, color, values }
 * (one value per point of `at`, null where there is none), the first with a
 * soft wash under it if `area`; the period on show (`from` on) as a band;
 * each line's newest value at its end. Hover a point for every series' value.
 * `format` writes a value; `top` is the axis' top, `ticks` its lines.
 */
export function LineChart({ at, series, from, days, format, top, ticks, area = false, reduce, isDark, tipHead }) {
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const L = 30; const R = 40; const T = 20; const B = 18;
  const pw = Math.max(0, w - L - R); const ph = Math.max(0, h - T - B);
  const step = at.length > 1 ? at[1] - at[0] : 1;
  const start = at[0] - step / 2; const end = at.at(-1);
  const x = (t) => L + ((t - start) / (end - start)) * pw;
  const y = (v) => T + ph - (Math.min(Math.max(v, 0), top) / top) * ph;
  const lines = series.map((s) => ({ ...s, pts: at.map((t, i) => (Number.isFinite(s.values[i]) ? [x(t), y(s.values[i]), i] : null)).filter(Boolean) }));
  const first = lines[0];
  const bandX = Math.max(L, x(from));
  const onMove = (e) => {
    const mx = e.clientX - e.currentTarget.getBoundingClientRect().left + L;
    let best = 0;
    at.forEach((t, i) => { if (Math.abs(x(t) - mx) < Math.abs(x(at[best]) - mx)) best = i; });
    setHover(best);
  };
  // end labels never sit on top of each other
  const ends = lines.filter((l) => l.pts.length).map((l) => ({ id: l.id, y: l.pts.at(-1)[1], text: format(l.values[l.pts.at(-1)[2]]) })).sort((a, b) => a.y - b.y);
  ends.forEach((e, i) => { if (i && e.y - ends[i - 1].y < 12) e.y = ends[i - 1].y + 12; });
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={series.map((s) => `${s.label}: ${format(s.values.at(-1))} in the newest`).join('; ')} style={{ display: 'block', overflow: 'visible' }}>
          {area && (
            <defs>
              <linearGradient id={`ins-wash-${first.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={first.color} stopOpacity={isDark ? 0.26 : 0.16} />
                <stop offset="100%" stopColor={first.color} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          <motion.rect initial={false} animate={{ x: bandX, width: Math.max(0, L + pw - bandX + 6) }} transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE }} y={T - 14} height={ph + 14} rx={8} fill="var(--band)" />
          <motion.text initial={false} animate={{ x: bandX + 8 }} transition={reduce ? { duration: 0 } : { duration: 0.6, ease: EASE }} y={T - 3} style={{ fontSize: 9, fontWeight: 800, fill: 'var(--muted)' }}>Last {days} days</motion.text>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={L + pw} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={1} />
              <text x={L - 7} y={y(v) + 3} textAnchor="end" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{format(v, true)}</text>
            </g>
          ))}
          {at.map((t, i) => (i === 0 || new Date(t).getUTCMonth() !== new Date(at[i - 1]).getUTCMonth()) && <text key={t} x={x(t)} y={h - 3} textAnchor="middle" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)' }}>{monthOf(t)}</text>)}
          {area && first.pts.length > 1 && <motion.path d={`${smooth(first.pts)} L${first.pts.at(-1)[0]},${T + ph} L${first.pts[0][0]},${T + ph} Z`} fill={`url(#ins-wash-${first.id})`} initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.5 }} />}
          {lines.map((l, k) => (
            <g key={l.id}>
              <motion.path d={smooth(l.pts)} fill="none" stroke={l.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : 0.1 + 0.12 * k, ease: EASE }} />
              {l.pts.length > 0 && <motion.circle cx={l.pts.at(-1)[0]} cy={l.pts.at(-1)[1]} r={4} fill={l.color} stroke="var(--base)" strokeWidth={2} initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 1.1 }} />}
            </g>
          ))}
          {ends.map((e) => <motion.text key={e.id} x={L + pw + 9} y={e.y + 3.5} initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 1.1 }} style={{ fontSize: 10, fontWeight: 800, fill: 'var(--text)' }}>{e.text}</motion.text>)}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(at[hover])} x2={x(at[hover])} y1={T} y2={T + ph} stroke="var(--muted)" strokeOpacity={0.35} strokeWidth={1} />
              {lines.map((l) => Number.isFinite(l.values[hover]) && <circle key={l.id} cx={x(at[hover])} cy={y(l.values[hover])} r={4} fill={l.color} stroke="var(--base)" strokeWidth={2} />)}
            </g>
          )}
          <rect x={L} y={T - 14} width={pw} height={ph + 14} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
        </svg>
      )}
      {hover !== null && (
        <Tip x={x(at[hover])} y={Math.min(...lines.map((l) => (Number.isFinite(l.values[hover]) ? y(l.values[hover]) : T + ph)))} w={w}>
          <div style={tipTitle}>{tipHead(at[hover], hover)}</div>
          {lines.map((l) => (
            <div key={l.id} style={tipRow}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: l.color }} />{l.label} <strong style={{ marginLeft: 'auto', paddingLeft: 12 }}>{format(l.values[hover])}</strong>
            </div>
          ))}
        </Tip>
      )}
    </div>
  );
}

/**
 * Columns, each in its own rounded track, the biggest first and in full
 * colour, the rest quieter: `items` are { key, label, value, text, tip }.
 * Hover for its numbers; a click opens it.
 */
export function Columns({ items, color, soft = 'var(--soft-bad)', reduce, onOpen, label }) {
  const [hover, setHover] = useState(null);
  const [box, { w }] = useSize();
  const max = Math.max(...items.map((x) => x.value || 0), 0.0001) * 1.22;
  const n = items.length;
  const Tag = onOpen ? 'button' : 'div';
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', gap: 8, marginTop: 12 }} onMouseLeave={() => setHover(null)}>
      {items.map((x, i) => {
        const hgt = `${((x.value || 0) / max) * 100}%`;
        return (
          <Tag
            key={x.key}
            {...(onOpen ? { type: 'button', onClick: () => onOpen(x.key) } : { tabIndex: 0 })}
            className="ins-col"
            data-ins-col={x.key}
            aria-label={`${x.label}: ${x.text} ${label}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            style={{ flex: '1 1 0', minWidth: 0, maxWidth: 104, display: 'flex', flexDirection: 'column', gap: 7, padding: 0, border: 'none', background: 'none', cursor: onOpen ? 'pointer' : 'default' }}
          >
            <span className="ins-track" style={{ position: 'relative', flex: 1, minHeight: 0, width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 4, borderRadius: 14, background: 'var(--plate)' }}>
              <motion.span
                initial={{ height: reduce ? hgt : '0%' }}
                animate={{ height: hgt }}
                transition={reduce ? { duration: 0 } : { ...SPRING, stiffness: 180, damping: 24, delay: 0.15 + 0.06 * i }}
                style={{ position: 'relative', display: 'block', minHeight: 6, borderRadius: 10, background: i === 0 ? color : soft }}
              />
              <span style={{ position: 'absolute', left: 0, right: 0, top: 8, textAlign: 'center', fontSize: 10.5, fontWeight: 800, color: 'var(--text)' }}>{x.text}</span>
            </span>
            <span style={{ ...small, fontSize: 9.5, fontWeight: 700, textAlign: 'center', color: i === 0 ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.label}</span>
          </Tag>
        );
      })}
      {hover !== null && w > 0 && items[hover].tip && (
        <Tip x={((hover + 0.5) / n) * w} y={30} w={w} edge={4}>
          <div style={tipTitle}>{items[hover].tip[0]}</div>
          {items[hover].tip.slice(1).map((line) => <div key={line} style={tipLine}>{line}</div>)}
        </Tip>
      )}
    </div>
  );
}

/**
 * Everyone as a hundred squares, filled by risk tier in order (low first),
 * each square one per cent of people. Hover a tier in the legend, or a
 * square, to pick its squares out.
 */
export function PeopleGrid({ tiers, counts, colors, reduce, picked, onPick, size = 'md' }) {
  const total = tiers.reduce((a, t) => a + (counts[t] || 0), 0) || 1;
  // a hundred squares shared out by the largest remainder, so they add up
  const raw = tiers.map((t) => ((counts[t] || 0) / total) * 100);
  const cells = raw.map(Math.floor);
  let left = 100 - cells.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { cells[i] += 1; left -= 1; } });
  const squares = tiers.flatMap((t, i) => Array.from({ length: cells[i] }, () => t));
  const gap = size === 'lg' ? 4 : 3;
  return (
    <div role="img" aria-label={tiers.map((t, i) => `${TIER_WORD[t]} ${cells[i]}%`).join(', ')} style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap, aspectRatio: '1', height: '100%', maxHeight: '100%', maxWidth: '100%' }}>
      {squares.map((t, k) => {
        const col = k % 10; const row = Math.floor(k / 10);
        return (
          <motion.span
            key={k}
            title={`${TIER_WORD[t]}: ${TIER_RULE[t].toLowerCase()}`}
            onMouseEnter={() => onPick?.(t)}
            onMouseLeave={() => onPick?.(null)}
            initial={{ scale: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
            animate={{ scale: 1, opacity: picked && picked !== t ? 0.25 : 1 }}
            transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.15 + 0.022 * (col + row), ease: EASE }}
            style={{ borderRadius: size === 'lg' ? 5 : 4, background: colors[t] }}
          />
        );
      })}
    </div>
  );
}

/**
 * How fast reports come in: the share of all the reports in, minute by
 * minute over the first two hours after the send, now (with a soft wash) and
 * the period before (fainter); the minute half were in marked. Hover for
 * the share in by any minute. `dark` draws it for the dark card, small.
 */
export function ArrivalChart({ now, before, color, reduce, isDark, mini = false, onDark = false }) {
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  const L = mini ? 0 : 34; const R = mini ? 0 : 12; const T = mini ? 6 : 14; const B = mini ? 2 : 18;
  const pw = Math.max(0, w - L - R); const ph = Math.max(0, h - T - B);
  const MAX = now.curve.length - 1;
  const x = (t) => L + (t / MAX) * pw;
  const y = (v) => T + ph - v * ph;
  const path = (c) => smooth(c.filter((p, i) => i % 3 === 0 || i === MAX).map((p) => [x(p.t), y(p.share)]));
  const ink = onDark ? (isDark ? '#0F172A' : '#FFFFFF') : color;
  const half = now.half;
  const onMove = (e) => setHover(Math.max(0, Math.min(MAX, Math.round(((e.clientX - e.currentTarget.getBoundingClientRect().left) / pw) * MAX))));
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label={`Half the reports were in by ${half} minutes; ${Math.round(now.by60 * 100)}% within the hour`} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={`ins-arrive-${mini ? 'm' : 'f'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ink} stopOpacity={onDark ? 0.28 : isDark ? 0.26 : 0.16} />
              <stop offset="100%" stopColor={ink} stopOpacity={0} />
            </linearGradient>
          </defs>
          {!mini && [0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={L} x2={L + pw} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={1} />
              <text x={L - 7} y={y(v) + 3} textAnchor="end" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{v * 100}%</text>
            </g>
          ))}
          {!mini && [0, 15, 30, 60, 90, 120].map((t) => <text key={t} x={x(t)} y={h - 3} textAnchor="middle" style={{ fontSize: 9, fontWeight: 600, fill: 'var(--muted)' }}>{t === 120 ? '2 h' : t === 60 ? '1 h' : `${t} min`}</text>)}
          {before && !mini && <motion.path d={path(before.curve)} fill="none" stroke="var(--muted)" strokeOpacity={0.55} strokeWidth={1.5} strokeLinecap="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 1.1, ease: EASE }} />}
          <motion.path d={`${path(now.curve)} L${x(MAX)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#ins-arrive-${mini ? 'm' : 'f'})`} initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.6 }} />
          <motion.path d={path(now.curve)} fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: reduce ? 0 : 1.2, delay: reduce ? 0 : 0.15, ease: EASE }} />
          {half !== null && (
            <motion.g initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 1.1 }}>
              <line x1={x(half)} x2={x(half)} y1={y(0.5)} y2={y(0)} stroke={ink} strokeOpacity={0.5} strokeWidth={1} />
              <circle cx={x(half)} cy={y(0.5)} r={4.5} fill={ink} stroke={onDark ? (isDark ? '#FFFFFF' : '#111217') : 'var(--base)'} strokeWidth={2} />
              {!mini && <text x={x(half) + 9} y={y(0.5) + 4} style={{ fontSize: 10, fontWeight: 800, fill: 'var(--text)' }}>Half in by {half} min</text>}
            </motion.g>
          )}
          {!mini && hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={T} y2={T + ph} stroke="var(--muted)" strokeOpacity={0.35} strokeWidth={1} />
              <circle cx={x(hover)} cy={y(now.curve[hover].share)} r={4} fill={ink} stroke="var(--base)" strokeWidth={2} />
            </g>
          )}
          {!mini && <rect x={L} y={T} width={pw} height={ph} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />}
        </svg>
      )}
      {!mini && hover !== null && (
        <Tip x={x(hover)} y={y(now.curve[hover].share)} w={w}>
          <div style={tipTitle}>By {hover} min after the send</div>
          <div style={tipRow}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: ink }} />This period <strong style={{ marginLeft: 'auto', paddingLeft: 12 }}>{Math.round(now.curve[hover].share * 100)}% in</strong></div>
          {before && <div style={tipRow}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--muted)', opacity: 0.6 }} />The period before <strong style={{ marginLeft: 'auto', paddingLeft: 12 }}>{Math.round(before.curve[hover].share * 100)}% in</strong></div>}
        </Tip>
      )}
    </div>
  );
}

import { createElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownUp, ChevronLeft, ChevronRight } from 'lucide-react';

import { Chip, Pager } from '../Leaderboard/BigPictureTables';
import { useFitRows } from '../Leaderboard/useFitRows';
import { EASE, HEALTH_RULE, STEADY_INK, heads, healthInk, lureIcon, mins, num, pc, pc1, slide, small, times } from './missionUi';

// Mission Control's three lenses past the overview, each a full page in the
// sheet's base:
//   - The lures: each kind of lure, the most convincing first; one opens to
//     its campaigns;
//   - The response: each campaign as a race over its first ten minutes,
//     first click against first report, then how long until half the
//     reports were in;
//   - The learning: the learning moments after a click, by lure; the
//     training funnel; and each training programme.
// They report; they never say what to do. Every bar has its number beside it
// and every colour its word.

const ROW_GAP = 6;

// Column names over a list, lined up with its rows (1px border + 12px padding).
function Heads({ cols, children }) {
  return <div role="row" style={{ flexShrink: 0, height: 28, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 14, padding: '0 13px', borderBottom: '1px solid var(--hair)', ...heads }}>{children}</div>;
}

// A number over a bar that grows in from nothing.
function Meter({ value, max, color, label, sub, delay = 0, reduce, height = 6 }) {
  const w = `${Math.max(0, Math.min(1, max > 0 ? (value || 0) / max : 0)) * 100}%`;
  return (
    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
        <span className="vs-rank" style={{ fontSize: 13.5, fontWeight: 900, lineHeight: 1, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{label}</span>
        {sub && <span style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
      </span>
      <span aria-hidden style={{ height, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
        <motion.span initial={{ width: reduce ? w : 0 }} animate={{ width: w }} transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : delay, ease: EASE }} style={{ display: 'block', height: '100%', borderRadius: 999, background: color }} />
      </span>
    </span>
  );
}

// A number with a word under it.
function Figure({ value, sub }) {
  return (
    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, whiteSpace: 'nowrap' }}>
      <span className="vs-rank" style={{ fontSize: 13.5, fontWeight: 900, lineHeight: 1, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <span style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>
    </span>
  );
}

// Clicks against reports as a tug of war: red for clicks, teal for reports,
// with reports for every click above it.
function Tug({ clicked, reported, ink, delay, reduce }) {
  const all = clicked + reported;
  const share = all ? reported / all : 0;
  const w = `${share * 100}%`;
  return (
    <span title={`${num(reported)} reports, ${num(clicked)} clicks`} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
        <span className="vs-rank" style={{ fontSize: 13.5, fontWeight: 900, lineHeight: 1, color: 'var(--text)' }}>{times(clicked ? reported / clicked : null)}</span>
        <span style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis' }}>reports per click</span>
      </span>
      <span aria-hidden style={{ height: 6, display: 'flex', gap: 2, borderRadius: 999, overflow: 'hidden' }}>
        <span style={{ flex: 1, background: ink.bad, borderRadius: '999px 0 0 999px' }} />
        <motion.span initial={{ width: reduce ? w : '0%' }} animate={{ width: w }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : delay, ease: EASE }} style={{ flexShrink: 0, background: ink.good, borderRadius: '0 999px 999px 0' }} />
      </span>
    </span>
  );
}

export function HealthChip({ h, ink, width = 92 }) {
  if (!h) return <span style={small}>—</span>;
  return <Chip color={healthInk(h.word, ink)} width={width} title={`Reported ${pc(h.reportRate)} of emails · clicked ${pc(h.clickRate)}. ${HEALTH_RULE}`}>{h.word}</Chip>;
}

// A slim header for an opened view: back, then what it is.
function BackBar({ label, onBack, children }) {
  return (
    <div style={{ flexShrink: 0, height: 34, display: 'flex', alignItems: 'center', gap: 12 }}>
      <button type="button" className="bp-row" onClick={onBack} data-mc-back style={{ height: 30, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 10px 0 6px', borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--base)', color: 'var(--text)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
        <ChevronLeft size={14} strokeWidth={2.6} aria-hidden /> {label}
      </button>
      <span aria-hidden style={{ width: 1, height: 18, background: 'var(--hair)' }} />
      {children}
    </div>
  );
}

// A small segmented switch, styled as the tabs are.
function Segments({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: 2, borderRadius: 10, background: 'var(--track)' }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on} data-mc-segment={o.id} onClick={() => onChange(o.id)} style={{ height: 24, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 10px', borderRadius: 8, border: 'none', cursor: on ? 'default' : 'pointer', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', background: on ? 'var(--base)' : 'transparent', color: on ? 'var(--text)' : 'var(--muted)', boxShadow: on ? '0 1px 3px rgba(15,23,42,0.12)' : 'none' }}>
            {o.Icon && <o.Icon size={11} strokeWidth={2.6} aria-hidden />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

const rowStyle = (on) => ({ position: 'relative', boxSizing: 'border-box', display: 'grid', alignItems: 'center', gap: 14, padding: '0 12px', borderRadius: 12, border: `1px solid ${on ? 'var(--mc-edge)' : 'var(--row-hair)'}`, background: on ? 'var(--mc-soft)' : 'var(--row)', color: 'var(--text)', textAlign: 'left' });
const enter = (i, reduce) => ({ initial: { opacity: 0, y: reduce ? 0 : 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.03 * i, ease: EASE } });

// A lure's own icon.
const LureIcon = ({ type, ...props }) => createElement(lureIcon(type), props);

// A lure's name, with its icon and how much of it there was.
function LureName({ type, sub }) {
  return (
    <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span aria-hidden style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--plate)', color: 'var(--text)' }}>
        <LureIcon type={type} size={15} strokeWidth={2.3} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{type}</span>
        <span style={{ display: 'block', ...small, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------- the lures

const LURE_COLS = 'minmax(0,1.3fr) minmax(0,1fr) 88px 88px minmax(0,1.15fr) 96px 14px';
const CAMPAIGN_COLS = 'minmax(0,1.7fr) 64px 84px minmax(0,1fr) minmax(0,1fr) 96px';

export function LuresLens({ m, view, onView, ink, reduce }) {
  const open = view.lure ? m.lures.find((l) => l.type === view.lure) : null;
  return (
    <AnimatePresence mode="wait" initial={false}>
      {open
        ? <motion.div key={`lure-${open.type}`} {...slide(reduce, 1)} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <LureDetail m={m} lure={open} page={view.lurePage} onPage={(lurePage) => onView({ lurePage })} onBack={() => onView({ lure: null, lureFocus: open.type })} ink={ink} reduce={reduce} />
        </motion.div>
        : <motion.div key="lures" {...slide(reduce, -1)} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <LureTable m={m} focus={view.lureFocus} onOpen={(lure) => onView({ lure, lurePage: 0 })} ink={ink} reduce={reduce} />
        </motion.div>}
    </AnimatePresence>
  );
}

function LureTable({ m, focus, onOpen, ink, reduce }) {
  const max = Math.max(...m.lures.map((l) => l.hooked || 0), 0.0001);
  if (!m.lures.length) return <p style={{ ...small, fontSize: 11 }}>No campaigns in this period.</p>;
  return (
    <section aria-label="The lures" data-mc-lures style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Heads cols={LURE_COLS}>
        <span>Lure · most convincing first</span><span>Hook Rate</span><span>Gave details</span><span>Reported</span><span>Clicks against reports</span><span style={{ textAlign: 'center' }}>Health</span><span />
      </Heads>
      <div role="rowgroup" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: ROW_GAP, paddingTop: 8 }}>
        {m.lures.map((l, i) => (
          <motion.button
            key={l.type}
            type="button"
            className="bp-row"
            data-mc-lure={l.type}
            aria-label={`${l.type}: Hook Rate ${pc1(l.hooked)}, ${pc(l.gaveOfClicks)} of clicks gave details, reported ${pc(l.reportRate)}, ${times(l.perClick)} reports per click, ${l.health?.word}. See its campaigns`}
            onClick={() => onOpen(l.type)}
            {...enter(i, reduce)}
            style={{ ...rowStyle(focus === l.type), flex: '1 1 0', minHeight: 0, maxHeight: 76, gridTemplateColumns: LURE_COLS, cursor: 'pointer' }}
          >
            <LureName type={l.type} sub={`${l.campaigns} ${l.campaigns === 1 ? 'campaign' : 'campaigns'} · ${num(l.delivered)} emails`} />
            <Meter value={l.hooked} max={max} color={ink.bad} label={pc1(l.hooked)} sub="clicked" delay={0.1 + 0.04 * i} reduce={reduce} />
            <Figure value={pc(l.gaveOfClicks)} sub="of clicks" />
            <Figure value={pc(l.reportRate)} sub="of emails" />
            <Tug clicked={l.clicked} reported={l.reported} ink={ink} delay={0.15 + 0.04 * i} reduce={reduce} />
            <span style={{ display: 'flex', justifyContent: 'center' }}><HealthChip h={l.health} ink={ink} /></span>
            <ChevronRight size={14} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />
          </motion.button>
        ))}
      </div>
    </section>
  );
}

function StatStrip({ cells }) {
  return (
    <div style={{ flexShrink: 0, height: 62, display: 'grid', gridTemplateColumns: `repeat(${cells.length}, minmax(0,1fr))`, alignItems: 'center', borderRadius: 14, background: 'var(--plate)' }}>
      {cells.map((c, i) => (
        <div key={c.label} style={{ minWidth: 0, padding: '0 16px', borderLeft: i ? '1px solid var(--hair)' : 'none' }}>
          <div style={{ ...heads, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 5, whiteSpace: 'nowrap' }}>
            {c.node || <span className="vs-rank" style={{ fontSize: 17, fontWeight: 900, lineHeight: 1, color: 'var(--text)' }}>{c.value}</span>}
            {c.sub && <span style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.sub}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

const ROW_H = 46;

function LureDetail({ m, lure, page, onPage, onBack, ink, reduce }) {
  const rows = m.response.filter((c) => c.type === lure.type);
  const [fit, size] = useFitRows(ROW_H, 3, ROW_GAP);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const at = Math.min(page, pages - 1);
  const shown = rows.slice(at * size, at * size + size);
  const max = Math.max(...m.lures.map((l) => l.hooked || 0), 0.0001);
  return (
    <section aria-label={lure.type} data-mc-lure-detail={lure.type} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <BackBar label="All lures" onBack={onBack}>
        <LureIcon type={lure.type} size={15} strokeWidth={2.4} aria-hidden />
        <span style={{ fontSize: 12.5, fontWeight: 800 }}>{lure.type}</span>
        <span style={small}>{lure.campaigns} {lure.campaigns === 1 ? 'campaign' : 'campaigns'} in the last {m.basis.days} days</span>
      </BackBar>
      <StatStrip cells={[
        { label: 'Hook Rate', value: pc1(lure.hooked), sub: 'clicked' },
        { label: 'Gave details', value: pc(lure.gaveOfClicks), sub: 'of clicks' },
        { label: 'Reported', value: pc(lure.reportRate), sub: 'of emails' },
        { label: 'Reports per click', value: times(lure.perClick) },
        { label: 'Learning moments', value: pc(lure.learned), sub: 'of clicks trained' },
        { label: 'Health', node: <HealthChip h={lure.health} ink={ink} /> },
      ]} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Heads cols={CAMPAIGN_COLS}><span>Campaign</span><span>Started</span><span>Delivered</span><span>Hook Rate</span><span>Clicks against reports</span><span style={{ textAlign: 'center' }}>Health</span></Heads>
        <div ref={fit} role="rowgroup" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: ROW_GAP, paddingTop: 8 }}>
          {shown.map((c, i) => (
            <motion.div key={c.id} role="row" {...enter(i, reduce)} style={{ ...rowStyle(false), height: ROW_H, flexShrink: 0, gridTemplateColumns: CAMPAIGN_COLS }}>
              <span style={{ minWidth: 0, fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              <span style={{ ...small, fontSize: 10.5 }}>{c.started}</span>
              <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{num(c.delivered)}</span>
              <Meter value={c.hooked} max={max} color={ink.bad} label={pc1(c.hooked)} delay={0.1 + 0.03 * i} reduce={reduce} height={5} />
              <Tug clicked={c.clicked} reported={c.reported} ink={ink} delay={0.12 + 0.03 * i} reduce={reduce} />
              <span style={{ display: 'flex', justifyContent: 'center' }}><HealthChip h={c.health} ink={ink} /></span>
            </motion.div>
          ))}
        </div>
        <Pager page={at} pages={pages} total={rows.length} size={size} onPage={onPage} what="campaigns" />
      </div>
    </section>
  );
}

// -------------------------------------------------------------- the response

const RACE = 10; // the race shows each campaign's first ten minutes
const TICKS = [0, 2, 4, 6, 8, 10];
const RESP_COLS = 'minmax(0,1.15fr) minmax(0,1.55fr) 108px minmax(0,0.95fr) 62px';
const at = (t) => `${(Math.min(t, RACE) / RACE) * 100}%`;

// One runner: a line from the send to its minute, and a dot with the minute in it.
function Lane({ top, t, color, label, delay, reduce }) {
  const x = at(t);
  return (
    <>
      <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: top + 5, height: 3, borderRadius: 999, background: 'var(--track)' }} />
      <motion.span aria-hidden initial={{ width: reduce ? x : '0%' }} animate={{ width: x }} transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : delay, ease: EASE }} style={{ position: 'absolute', left: 0, top: top + 5, height: 3, borderRadius: 999, background: color, opacity: 0.45 }} />
      <motion.span title={`${label}: ${t} min after the send`} initial={{ left: reduce ? x : '0%' }} animate={{ left: x }} transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : delay, ease: EASE }} style={{ position: 'absolute', top: top - 1, width: 16, height: 16, marginLeft: -8, borderRadius: 999, display: 'grid', placeItems: 'center', background: color, boxShadow: '0 0 0 2px var(--row)', color: '#FFFFFF', fontSize: 8.5, fontWeight: 900, lineHeight: 1 }}>
        {t > RACE ? '10+' : t}
      </motion.span>
    </>
  );
}

function Who({ c, ink }) {
  if (c.firstReport === c.firstClick) return <Chip color={STEADY_INK} width={100}>Same minute</Chip>;
  return c.beatClick
    ? <Chip color={ink.good} width={100} title="The first report came in before anyone clicked">Report first</Chip>
    : <Chip color={ink.bad} width={100} title="Someone clicked before the first report came in">Click first</Chip>;
}

const SHOW = [{ id: 'all', label: 'All' }, { id: 'first', label: 'Reported first' }, { id: 'click', label: 'Clicked first' }];
const SORT = [{ id: 'newest', label: 'Newest' }, { id: 'fastest', label: 'Fastest report', Icon: ArrowDownUp }];

export function ResponseLens({ m, view, onView, ink, reduce }) {
  const keep = view.show === 'first' ? (c) => c.beatClick : view.show === 'click' ? (c) => !c.beatClick && c.firstClick !== c.firstReport : () => true;
  const filtered = m.response.filter(keep);
  const rows = view.sort === 'fastest' ? [...filtered].sort((a, b) => a.firstReport - b.firstReport || a.medianReport - b.medianReport) : filtered;
  const halfMax = Math.max(60, Math.ceil(Math.max(0, ...m.response.map((c) => c.medianReport)) / 10) * 10);
  const [fit, size] = useFitRows(ROW_H, 3, ROW_GAP);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const focusAt = view.campaign ? rows.findIndex((c) => c.id === view.campaign) : -1;
  const page = Math.min(pages - 1, view.page ?? (focusAt >= 0 ? Math.floor(focusAt / size) : 0));
  const shown = rows.slice(page * size, page * size + size);
  const dot = (color) => <span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, background: color }} />;
  return (
    <section aria-label="The response" data-mc-response style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', rowGap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...small, fontWeight: 700, color: 'var(--text)' }}>{dot(ink.bad)} First click</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...small, fontWeight: 700, color: 'var(--text)' }}>{dot(ink.good)} First report</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...small, fontWeight: 700, color: 'var(--text)' }}><span aria-hidden style={{ width: 14, height: 5, borderRadius: 999, background: STEADY_INK }} /> Half the reports in</span>
        <span style={small}>Minutes after the send · the number in each dot</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Segments label="Show" value={view.show} options={SHOW} onChange={(show) => onView({ show, page: 0, campaign: null })} />
          <Segments label="Order" value={view.sort} options={SORT} onChange={(sort) => onView({ sort, page: 0, campaign: null })} />
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Heads cols={RESP_COLS}>
          <span>Campaign</span>
          <span style={{ position: 'relative', height: '100%', marginRight: 8 }}>
            {TICKS.map((t) => <span key={t} style={{ position: 'absolute', left: at(t), top: '50%', transform: 'translate(-50%,-50%)' }}>{t === RACE ? '10 min' : t}</span>)}
          </span>
          <span style={{ textAlign: 'center' }}>Who was first</span>
          <span>Half the reports in</span>
          <span style={{ textAlign: 'right' }}>Per click</span>
        </Heads>
        <div ref={fit} role="rowgroup" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: ROW_GAP, paddingTop: 8 }}>
          {shown.length === 0 && <p style={{ ...small, fontSize: 11, margin: '10px 2px' }}>No campaign in this period went that way.</p>}
          {shown.map((c, i) => (
            <motion.div key={c.id} role="row" data-mc-campaign={c.id} {...enter(i, reduce)} style={{ ...rowStyle(view.campaign === c.id), height: ROW_H, flexShrink: 0, gridTemplateColumns: RESP_COLS }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                <span style={{ display: 'block', ...small, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.type} · {c.started}</span>
              </span>
              <span role="img" aria-label={`First click after ${c.firstClick} min, first report after ${c.firstReport} min`} style={{ position: 'relative', height: 30, marginRight: 8 }}>
                {TICKS.map((t) => <span key={t} aria-hidden style={{ position: 'absolute', left: at(t), top: 0, bottom: 0, width: 1, background: 'var(--hair)' }} />)}
                <Lane top={0} t={c.firstClick} color={ink.bad} label="First click" delay={0.1 + 0.03 * i} reduce={reduce} />
                <Lane top={16} t={c.firstReport} color={ink.good} label="First report" delay={0.18 + 0.03 * i} reduce={reduce} />
              </span>
              <span style={{ display: 'flex', justifyContent: 'center' }}><Who c={c} ink={ink} /></span>
              <Meter value={c.medianReport} max={halfMax} color={STEADY_INK} label={mins(c.medianReport)} delay={0.15 + 0.03 * i} reduce={reduce} height={5} />
              <span style={{ textAlign: 'right', fontSize: 11.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{times(c.perClick)}</span>
            </motion.div>
          ))}
        </div>
        <Pager page={page} pages={pages} total={rows.length} size={size} onPage={(p) => onView({ page: p })} what="campaigns" />
      </div>
    </section>
  );
}

// -------------------------------------------------------------- the learning

const PROG_COLS = 'minmax(0,1.5fr) minmax(0,1fr) 56px 56px 100px';
const PROG_H = 38;
const STATUS = { Good: 'good', Average: 'steady', 'Needs Work': 'bad' };
const STATUS_WORD = { Good: 'Good', Average: 'Average', 'Needs Work': 'Needs work' };

function Pane({ title, sub, children }) {
  return (
    <section aria-label={title} style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--hair)', borderRadius: 14, padding: '12px 14px 10px' }}>
      <header style={{ flexShrink: 0, marginBottom: 6 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>{title}</span>
        {sub && <span style={{ display: 'block', ...small, marginTop: 2 }}>{sub}</span>}
      </header>
      {children}
    </section>
  );
}

export function LearningLens({ m, training, view, onView, ink, reduce }) {
  const byLure = [...m.lures].filter((l) => l.learned !== null).sort((a, b) => b.learned - a.learned);
  const first = training.funnel[0]?.value || 0;
  const [fit, size] = useFitRows(PROG_H, 3, 0);
  const progs = training.programmes;
  const pages = Math.max(1, Math.ceil(progs.length / size));
  const page = Math.min(view.progPage, pages - 1);
  return (
    <section aria-label="The learning" data-mc-learning style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* the training funnel: everyone assigned training, step by step */}
      <div data-mc-funnel style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: `repeat(${training.funnel.length}, minmax(0,1fr))`, borderRadius: 14, background: 'var(--plate)', padding: '12px 0' }}>
        {training.funnel.map((s, i) => {
          const prev = training.funnel[i - 1];
          return (
            <div key={s.name} style={{ position: 'relative', minWidth: 0, padding: '0 18px', borderLeft: i ? '1px solid var(--hair)' : 'none' }}>
              {prev && <span title={`${num(prev.value - s.value)} fewer than ${prev.name.toLowerCase()}`} style={{ position: 'absolute', left: -1, top: 0, transform: 'translateX(-50%)', height: 18, padding: '0 6px', borderRadius: 999, background: 'var(--base)', border: '1px solid var(--hair)', display: 'inline-flex', alignItems: 'center', ...small, fontSize: 8.5, fontWeight: 800, whiteSpace: 'nowrap' }}>−{num(prev.value - s.value)}</span>}
              <div style={{ ...heads, paddingLeft: prev ? 22 : 0 }}>{s.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                <span className="vs-rank" style={{ fontSize: 20, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text)' }}>{num(s.value)}</span>
                <span style={small}>{i ? `${pc(first ? s.value / first : null)} of assigned` : 'people'}</span>
              </div>
              <span aria-hidden style={{ display: 'block', height: 6, marginTop: 9, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
                <motion.span initial={{ width: reduce ? `${(s.value / first) * 100}%` : 0 }} animate={{ width: `${(s.value / first) * 100}%` }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.1 + 0.08 * i, ease: EASE }} style={{ display: 'block', height: '100%', borderRadius: 999, background: ink.good, opacity: 1 - i * 0.16 }} />
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,0.85fr) minmax(0,1.3fr)', gap: 14 }}>
        <Pane title="Learning moments by lure" sub={`Of those who clicked, how many finished the training that followed · last ${m.basis.days} days`}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {byLure.map((l, i) => (
              <motion.div key={l.type} {...enter(i, reduce)} style={{ flex: '1 1 0', minHeight: 0, maxHeight: 62, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', alignItems: 'center', gap: 14, borderTop: i ? '1px solid var(--hair)' : 'none' }}>
                <LureName type={l.type} sub={`${num(l.trained)} of ${num(l.clicked)} who clicked`} />
                <Meter value={l.learned} max={1} color={ink.good} label={pc(l.learned)} sub="trained" delay={0.1 + 0.04 * i} reduce={reduce} />
              </motion.div>
            ))}
          </div>
        </Pane>
        <Pane title="Programmes" sub="Each training programme, all assigned training">
          <Heads cols={PROG_COLS}><span>Programme</span><span>Completion</span><span>Pass</span><span>Score</span><span style={{ textAlign: 'center' }}>Status</span></Heads>
          <div ref={fit} role="rowgroup" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {progs.slice(page * size, page * size + size).map((p, i) => (
              <motion.div key={p.program} role="row" {...enter(i, reduce)} style={{ height: PROG_H, flexShrink: 0, display: 'grid', gridTemplateColumns: PROG_COLS, alignItems: 'center', gap: 14, padding: '0 13px', borderBottom: '1px solid var(--hair)' }}>
                <span style={{ minWidth: 0, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.program}</span>
                <Meter value={p.completion} max={100} color={ink.good} label={`${p.completion}%`} delay={0.1 + 0.03 * i} reduce={reduce} height={5} />
                <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.pass}%</span>
                <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.score}</span>
                <span style={{ display: 'flex', justifyContent: 'center' }}>
                  <Chip color={STATUS[p.status] === 'steady' ? STEADY_INK : ink[STATUS[p.status]]} width={96}>{STATUS_WORD[p.status] || p.status}</Chip>
                </span>
              </motion.div>
            ))}
          </div>
          <Pager page={page} pages={pages} total={progs.length} size={size} onPage={(progPage) => onView({ progPage })} what="programmes" />
        </Pane>
      </div>
    </section>
  );
}

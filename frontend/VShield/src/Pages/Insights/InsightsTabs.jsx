import { createElement, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownUp } from 'lucide-react';

import { Chip, Pager } from '../Leaderboard/BigPictureTables';
import { useFitRows } from '../Leaderboard/useFitRows';
import { Card, Segmented } from './InsightsCharts';
import { useSize } from './useSize';
import { EASE, HEALTH_RULE, STEADY_INK, change, eyebrow, heads, healthInk, lureIcon, mins, num, pc, pc1, rise, small, swap, times } from './insightsUi';

// Insights' three tabs past the overview, each a bento of cards:
//   - Lures: every kind of lure in a table, the most convincing first; the
//     one picked opens beside it with its campaigns;
//   - Response: each campaign's first ten minutes as a race, first click
//     against first report; beside it, who was first and how many minutes
//     the first report took;
//   - Learning: the training funnel; the learning moments after a click, by
//     lure; and each training programme.
// They report; they never say what to do.

const ROW_GAP = 6;
const enter = (i, reduce) => ({ initial: { opacity: 0, y: reduce ? 0 : 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.03 * i, ease: EASE } });

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
        <span className="vs-rank" style={{ fontSize: 13, fontWeight: 900, lineHeight: 1, color: 'var(--text)' }}>{label}</span>
        {sub && <span style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
      </span>
      <span aria-hidden style={{ height, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
        <motion.span initial={{ width: reduce ? w : 0 }} animate={{ width: w }} transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : delay, ease: EASE }} style={{ display: 'block', height: '100%', borderRadius: 999, background: color }} />
      </span>
    </span>
  );
}

// Clicks against reports as a tug of war: red for clicks, teal for reports.
function Tug({ clicked, reported, ink, delay, reduce }) {
  const all = clicked + reported;
  const w = `${(all ? reported / all : 0) * 100}%`;
  return (
    <span title={`${num(reported)} reports, ${num(clicked)} clicks`} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
        <span className="vs-rank" style={{ fontSize: 13, fontWeight: 900, lineHeight: 1, color: 'var(--text)' }}>{times(clicked ? reported / clicked : null)}</span>
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

const LureIcon = ({ type, ...props }) => createElement(lureIcon(type), props);
function LureTile({ type, size = 32 }) {
  return (
    <span aria-hidden style={{ flexShrink: 0, width: size, height: size, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--plate)', color: 'var(--text)' }}>
      <LureIcon type={type} size={Math.round(size * 0.47)} strokeWidth={2.3} />
    </span>
  );
}

// A change against something, on a small chip: its arrow, its size, better or worse.
export function Delta({ c, ink, title }) {
  if (!c) return null;
  const color = c.good === null ? STEADY_INK : c.good ? ink.good : ink.bad;
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 20, padding: '0 8px', borderRadius: 999, background: 'var(--chip)', fontSize: 9.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ fontSize: 9, color }}>{c.dir === 'up' ? '▲' : c.dir === 'down' ? '▼' : '●'}</span>{c.shown}
    </span>
  );
}

// ---------------------------------------------------------------- lures

const LURE_COLS = 'minmax(0,1.35fr) minmax(0,1fr) 78px 78px minmax(0,1.15fr) 96px';
const ROW_H = 46;

export function LuresTab({ m, view, onView, ink, reduce }) {
  const pick = m.lures.find((l) => l.type === view.lure) || m.lures[0];
  const max = Math.max(...m.lures.map((l) => l.hooked || 0), 0.0001);
  if (!pick) return <p style={{ ...small, fontSize: 11 }}>No campaigns in this period.</p>;
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gap: 14 }}>
      <Card i={0} reduce={reduce} title="Every lure" sub="The most convincing first · pick one to see its campaigns" style={{ gridColumn: 'span 8' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 10 }}>
          <Heads cols={LURE_COLS}><span>Lure</span><span>Hook Rate</span><span>Gave details</span><span>Reported</span><span>Clicks against reports</span><span style={{ textAlign: 'center' }}>Health</span></Heads>
          <div role="rowgroup" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: ROW_GAP, paddingTop: 8 }}>
            {m.lures.map((l, i) => {
              const on = l.type === pick.type;
              return (
                <motion.button
                  key={l.type}
                  type="button"
                  className="ins-row"
                  aria-pressed={on}
                  data-ins-lure={l.type}
                  onClick={() => onView({ lure: l.type, lurePage: 0 })}
                  {...enter(i, reduce)}
                  style={{ flex: '1 1 0', minHeight: 0, maxHeight: 78, boxSizing: 'border-box', display: 'grid', gridTemplateColumns: LURE_COLS, alignItems: 'center', gap: 14, padding: '0 12px', borderRadius: 12, border: `1px solid ${on ? 'var(--sel-edge)' : 'var(--row-hair)'}`, background: on ? 'var(--sel)' : 'var(--row)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <LureTile type={l.type} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.type}</span>
                      <span style={{ display: 'block', ...small, marginTop: 2, whiteSpace: 'nowrap' }}>{l.campaigns} {l.campaigns === 1 ? 'campaign' : 'campaigns'} · {num(l.delivered)} emails</span>
                    </span>
                  </span>
                  <Meter value={l.hooked} max={max} color={ink.bad} label={pc1(l.hooked)} delay={0.1 + 0.04 * i} reduce={reduce} />
                  <span><span className="vs-rank" style={{ fontSize: 13, fontWeight: 900 }}>{pc(l.gaveOfClicks)}</span><span style={{ display: 'block', ...small, marginTop: 3 }}>of clicks</span></span>
                  <span><span className="vs-rank" style={{ fontSize: 13, fontWeight: 900 }}>{pc(l.reportRate)}</span><span style={{ display: 'block', ...small, marginTop: 3 }}>of emails</span></span>
                  <Tug clicked={l.clicked} reported={l.reported} ink={ink} delay={0.15 + 0.04 * i} reduce={reduce} />
                  <span style={{ display: 'flex', justifyContent: 'center' }}><HealthChip h={l.health} ink={ink} /></span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </Card>
      <Card i={1} reduce={reduce} style={{ gridColumn: 'span 4', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pick.type} {...swap(reduce)} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <LureDetail m={m} lure={pick} page={view.lurePage} onPage={(lurePage) => onView({ lurePage })} ink={ink} reduce={reduce} />
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
}

function LureDetail({ m, lure, page, onPage, ink, reduce }) {
  const rows = m.campaigns.filter((c) => c.type === lure.type);
  const [fit, size] = useFitRows(40, 2, 0);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const at = Math.min(page, pages - 1);
  const max = Math.max(...m.campaigns.map((c) => c.hooked || 0), 0.0001);
  const vsAll = change(lure.hooked, m.now.hooked, { kind: 'pct', better: 'down' });
  return (
    <>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <LureTile type={lure.type} size={36} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>{lure.type}</span>
          <span style={{ display: 'block', ...small, marginTop: 2 }}>{lure.campaigns} {lure.campaigns === 1 ? 'campaign' : 'campaigns'} · {num(lure.delivered)} emails</span>
        </span>
        <span style={{ marginLeft: 'auto' }}><HealthChip h={lure.health} ink={ink} /></span>
      </div>
      <div style={{ flexShrink: 0, marginTop: 16 }}>
        <div style={eyebrow}>Hook Rate</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <span className="vs-rank" style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{pc1(lure.hooked)}</span>
          {vsAll && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Delta c={vsAll} ink={ink} title="Against every lure together" /><span style={small}>vs every lure</span></span>}
        </div>
      </div>
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginTop: 14 }}>
        {[['Gave details', pc(lure.gaveOfClicks), 'of clicks'], ['Reported', pc(lure.reportRate), 'of emails'], ['Learning', pc(lure.learned), 'of clicks trained']].map(([k, v, s]) => (
          <span key={k} style={{ minWidth: 0, padding: '9px 10px', borderRadius: 12, background: 'var(--plate)' }}>
            <span style={{ display: 'block', ...eyebrow, fontSize: 8 }}>{k}</span>
            <span className="vs-rank" style={{ display: 'block', fontSize: 16, fontWeight: 900, marginTop: 4 }}>{v}</span>
            <span style={{ display: 'block', ...small, fontSize: 9, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</span>
          </span>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 14, padding: '10px 12px 8px', borderRadius: 14, background: 'var(--base)', border: '1px solid var(--hair)', boxShadow: 'var(--lift)' }}>
        <span style={{ flexShrink: 0, ...eyebrow }}>Its campaigns · newest first</span>
        <div ref={fit} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          {rows.slice(at * size, at * size + size).map((c, i) => (
            <motion.div key={c.id} {...enter(i, reduce)} style={{ height: 40, flexShrink: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 92px 10px', alignItems: 'center', gap: 12, borderTop: i ? '1px solid var(--hair)' : 'none' }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                <span style={{ display: 'block', ...small, fontSize: 9, marginTop: 1 }}>Started {c.started} · {times(c.perClick)} reports per click</span>
              </span>
              <Meter value={c.hooked} max={max} color={ink.bad} label={pc1(c.hooked)} delay={0.1 + 0.03 * i} reduce={reduce} height={4} />
              <span aria-hidden title={c.health?.word} style={{ width: 8, height: 8, borderRadius: 999, background: healthInk(c.health?.word, ink) }} />
            </motion.div>
          ))}
        </div>
        {pages > 1 && <Pager page={at} pages={pages} total={rows.length} size={size} onPage={onPage} what="campaigns" />}
      </div>
      <div style={{ flexShrink: 0, marginTop: 14 }}>
        <span style={eyebrow}>Hook Rate against the other lures</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {m.lures.map((l, i) => {
            const on = l.type === lure.type;
            return (
              <div key={l.type} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0,1fr) 40px', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9.5, fontWeight: on ? 800 : 600, color: on ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.type}</span>
                <span aria-hidden style={{ height: 6, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
                  <motion.span initial={{ width: reduce ? `${(l.hooked / max) * 100}%` : 0 }} animate={{ width: `${(l.hooked / max) * 100}%` }} transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.2 + 0.04 * i, ease: EASE }} style={{ display: 'block', height: '100%', borderRadius: 999, background: on ? ink.bad : 'var(--soft-bad)' }} />
                </span>
                <span style={{ fontSize: 9.5, fontWeight: on ? 800 : 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: on ? 'var(--text)' : 'var(--muted)' }}>{pc1(l.hooked)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- response

const RACE = 10; // the race shows each campaign's first ten minutes
const TICKS = [0, 2, 4, 6, 8, 10];
const RESP_COLS = 'minmax(0,1.1fr) minmax(0,1.6fr) 104px minmax(0,0.85fr) 56px';
const at = (t) => `${(Math.min(t, RACE) / RACE) * 100}%`;

// One runner: a line from the send to its minute, and a dot with the minute in it.
function Lane({ top, t, color, label, delay, reduce }) {
  const x = at(t);
  return (
    <>
      <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: top + 6, height: 3, borderRadius: 999, background: 'var(--track)' }} />
      <motion.span aria-hidden initial={{ width: reduce ? x : '0%' }} animate={{ width: x }} transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : delay, ease: EASE }} style={{ position: 'absolute', left: 0, top: top + 6, height: 3, borderRadius: 999, background: color, opacity: 0.45 }} />
      <motion.span title={`${label}: ${t} min after the send`} initial={{ left: reduce ? x : '0%' }} animate={{ left: x }} transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : delay, ease: EASE }} style={{ position: 'absolute', top, width: 16, height: 16, marginLeft: -8, borderRadius: 999, display: 'grid', placeItems: 'center', background: color, boxShadow: '0 0 0 2px var(--row)', color: '#FFFFFF', fontSize: 8.5, fontWeight: 900, lineHeight: 1 }}>
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
const SORT = [{ id: 'newest', label: 'Newest' }, { id: 'fastest', label: 'Fastest', Icon: ArrowDownUp, title: 'Fastest first report first' }];

export function ResponseTab({ m, view, onView, ink, reduce }) {
  const keep = view.show === 'first' ? (c) => c.beatClick : view.show === 'click' ? (c) => !c.beatClick && c.firstClick !== c.firstReport : () => true;
  const filtered = m.campaigns.filter(keep);
  const rows = view.sort === 'fastest' ? [...filtered].sort((a, b) => a.firstReport - b.firstReport || a.medianReport - b.medianReport) : filtered;
  const halfMax = Math.max(60, Math.ceil(Math.max(0, ...m.campaigns.map((c) => c.medianReport)) / 10) * 10);
  const [fit, size] = useFitRows(ROW_H, 3, ROW_GAP);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const focusAt = view.campaign ? rows.findIndex((c) => c.id === view.campaign) : -1;
  const page = Math.min(pages - 1, view.page ?? (focusAt >= 0 ? Math.floor(focusAt / size) : 0));
  const dot = (color) => <span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, background: color }} />;
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gap: 14 }}>
      <Card
        i={0}
        reduce={reduce}
        title="The race to the first report"
        sub="Each campaign's first ten minutes: the first click against the first report"
        action={<span style={{ display: 'flex', gap: 8 }}><Segmented id="ins-show" label="Show" value={view.show} options={SHOW} onChange={(show) => onView({ show, page: 0, campaign: null })} reduce={reduce} /><Segmented id="ins-sort" label="Order" value={view.sort} options={SORT} onChange={(sort) => onView({ sort, page: 0, campaign: null })} reduce={reduce} /></span>}
        style={{ gridColumn: 'span 8' }}
        data-ins-race
      >
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
          {[[ink.bad, 'First click'], [ink.good, 'First report']].map(([c, l]) => <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...small, fontWeight: 700, color: 'var(--text)' }}>{dot(c)} {l}</span>)}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...small, fontWeight: 700, color: 'var(--text)' }}><span aria-hidden style={{ width: 14, height: 5, borderRadius: 999, background: STEADY_INK }} /> Half the reports in</span>
          <span style={small}>Minutes after the send, in each dot</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
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
            {rows.length === 0 && <p style={{ ...small, fontSize: 11, margin: '10px 2px' }}>No campaign in this period went that way.</p>}
            {rows.slice(page * size, page * size + size).map((c, i) => {
              const on = view.campaign === c.id;
              return (
                <motion.div key={c.id} role="row" data-ins-campaign={c.id} {...enter(i, reduce)} style={{ height: ROW_H, flexShrink: 0, boxSizing: 'border-box', display: 'grid', gridTemplateColumns: RESP_COLS, alignItems: 'center', gap: 14, padding: '0 12px', borderRadius: 12, border: `1px solid ${on ? 'var(--sel-edge)' : 'var(--row-hair)'}`, background: on ? 'var(--sel)' : 'var(--row)' }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                    <span style={{ display: 'block', ...small, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.type} · {c.started}</span>
                  </span>
                  <span role="img" aria-label={`First click after ${c.firstClick} min, first report after ${c.firstReport} min`} style={{ position: 'relative', height: 32, marginRight: 8 }}>
                    {TICKS.map((t) => <span key={t} aria-hidden style={{ position: 'absolute', left: at(t), top: 0, bottom: 0, width: 1, background: 'var(--hair)' }} />)}
                    <Lane top={0} t={c.firstClick} color={ink.bad} label="First click" delay={0.1 + 0.03 * i} reduce={reduce} />
                    <Lane top={16} t={c.firstReport} color={ink.good} label="First report" delay={0.18 + 0.03 * i} reduce={reduce} />
                  </span>
                  <span style={{ display: 'flex', justifyContent: 'center' }}><Who c={c} ink={ink} /></span>
                  <Meter value={c.medianReport} max={halfMax} color={STEADY_INK} label={mins(c.medianReport)} delay={0.15 + 0.03 * i} reduce={reduce} height={5} />
                  <span style={{ textAlign: 'right', fontSize: 11.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{times(c.perClick)}</span>
                </motion.div>
              );
            })}
          </div>
          <Pager page={page} pages={pages} total={rows.length} size={size} onPage={(p) => onView({ page: p })} what="campaigns" />
        </div>
      </Card>
      <div style={{ gridColumn: 'span 4', minHeight: 0, display: 'grid', gridTemplateRows: 'auto minmax(0,1fr)', gap: 14 }}>
        <WhoFirst m={m} ink={ink} reduce={reduce} />
        <FirstReportDots m={m} ink={ink} reduce={reduce} />
      </div>
    </div>
  );
}

// Who was first, as one bar split three ways, with how many under it.
function WhoFirst({ m, ink, reduce }) {
  const n = m.campaigns.length || 1;
  const parts = [
    { id: 'report', label: 'Report first', count: m.campaigns.filter((c) => c.beatClick).length, color: ink.good },
    { id: 'same', label: 'Same minute', count: m.campaigns.filter((c) => c.firstReport === c.firstClick).length, color: STEADY_INK },
    { id: 'click', label: 'Click first', count: m.campaigns.filter((c) => !c.beatClick && c.firstReport !== c.firstClick).length, color: ink.bad },
  ];
  return (
    <Card i={1} reduce={reduce} title="Who was first" sub="The first report against the first click">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
        <span className="vs-rank" style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{parts[0].count}<span style={{ fontSize: 16, color: 'var(--muted)' }}> of {m.campaigns.length}</span></span>
        <span style={{ ...small, fontSize: 10 }}>reported before anyone clicked</span>
      </div>
      <div aria-hidden style={{ display: 'flex', gap: 2, height: 10, marginTop: 12, borderRadius: 999, overflow: 'hidden' }}>
        {parts.filter((p) => p.count).map((p, i) => (
          <motion.span key={p.id} initial={{ flexGrow: reduce ? p.count : 0 }} animate={{ flexGrow: p.count }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.2 + 0.1 * i, ease: EASE }} style={{ flexBasis: 0, minWidth: 4, background: p.color }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 9, flexWrap: 'wrap' }}>
        {parts.map((p) => (
          <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: p.color }} />{p.label} <span style={small}>{p.count} · {pc(p.count / n)}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}

// Minutes to the first report: one dot per campaign, stacked over its minute,
// as large as the card lets them be.
function FirstReportDots({ m, ink, reduce }) {
  const [hover, setHover] = useState(null);
  const [box, { w, h }] = useSize();
  const cols = Array.from({ length: RACE }, (_, k) => m.campaigns.filter((c) => Math.min(c.firstReport, RACE) === k + 1));
  const tallest = Math.max(1, ...cols.map((c) => c.length));
  const gap = 4;
  const dot = Math.max(6, Math.min(28, (w - gap * (RACE - 1)) / RACE - 6, (h - gap * (tallest - 1)) / tallest));
  const middle = m.now.firstReport;
  const shown = hover ? m.campaigns.find((c) => c.id === hover) : null;
  return (
    <Card i={2} reduce={reduce} title="Minutes to the first report" sub={shown ? `${shown.name}: ${shown.firstReport} min` : `One dot per campaign · the middle campaign took ${mins(middle)}`}>
      <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-end', gap, marginTop: 12 }} onMouseLeave={() => setHover(null)}>
        {cols.map((list, k) => (
          <div key={k} style={{ flex: '1 1 0', minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap }}>
            {list.map((c, r) => (
              <motion.span
                key={c.id}
                title={`${c.name}: first report after ${c.firstReport} min`}
                onMouseEnter={() => setHover(c.id)}
                initial={{ scale: reduce ? 1 : 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.2 + 0.04 * k + 0.03 * r, ease: EASE }}
                style={{ flexShrink: 0, width: dot, height: dot, borderRadius: 999, background: c.beatClick ? ink.good : 'var(--soft-good)', opacity: hover && hover !== c.id ? 0.35 : 1, transition: 'opacity .15s ease', cursor: 'default' }}
              />
            ))}
          </div>
        ))}
      </div>
      <div aria-hidden style={{ flexShrink: 0, display: 'flex', gap, marginTop: 6 }}>
        {cols.map((_, k) => <span key={k} style={{ flex: '1 1 0', textAlign: 'center', ...small, fontSize: 9, fontWeight: k + 1 === Math.round(middle) ? 800 : 600, color: k + 1 === Math.round(middle) ? 'var(--text)' : 'var(--muted)' }}>{k + 1 === RACE ? '10+' : k + 1}</span>)}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 14, marginTop: 6, ...small, fontSize: 9 }}>
        <span>Minutes after the send</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: ink.good }} />Reported before a click</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--soft-good)' }} />After a click</span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- learning

const PROG_COLS = 'minmax(0,1.5fr) minmax(0,1fr) 52px 52px 100px';
const PROG_H = 38;
const STATUS = { Good: 'good', Average: 'steady', 'Needs Work': 'bad' };
const STATUS_WORD = { Good: 'Good', Average: 'Average', 'Needs Work': 'Needs work' };

export function LearningTab({ m, training, view, onView, ink, reduce }) {
  const byLure = [...m.lures].filter((l) => l.learned !== null).sort((a, b) => b.learned - a.learned);
  const first = training.funnel[0]?.value || 0;
  const [fit, size] = useFitRows(PROG_H, 3, 0);
  const progs = training.programmes;
  const pages = Math.max(1, Math.ceil(progs.length / size));
  const page = Math.min(view.progPage, pages - 1);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gridTemplateRows: 'auto minmax(0,1fr)', gap: 14 }}>
      {/* the training funnel: everyone assigned training, step by step */}
      <div data-ins-funnel style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: `repeat(${training.funnel.length}, minmax(0,1fr))`, gap: 14 }}>
        {training.funnel.map((s, i) => {
          const prev = training.funnel[i - 1];
          return (
            <motion.div key={s.name} {...rise(reduce, i)} className="ins-card" style={{ position: 'relative', minWidth: 0, padding: '12px 16px 14px', borderRadius: 16, border: '1px solid var(--hair)', background: 'var(--base)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={eyebrow}>{s.name}</span>
                {prev && <span title={`${num(prev.value - s.value)} fewer than ${prev.name.toLowerCase()}`} style={{ ...small, fontSize: 9, fontWeight: 800 }}>−{num(prev.value - s.value)} from {prev.name.toLowerCase()}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
                <span className="vs-rank" style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{num(s.value)}</span>
                <span style={small}>{i ? `${pc(first ? s.value / first : null)} of assigned` : 'people assigned'}</span>
              </div>
              <span aria-hidden style={{ display: 'block', height: 6, marginTop: 10, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
                <motion.span initial={{ width: reduce ? `${(s.value / first) * 100}%` : 0 }} animate={{ width: `${(s.value / first) * 100}%` }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.15 + 0.08 * i, ease: EASE }} style={{ display: 'block', height: '100%', borderRadius: 999, background: ink.good }} />
              </span>
            </motion.div>
          );
        })}
      </div>

      <Card i={4} reduce={reduce} title="Learning moments by lure" sub={`Of those who clicked, how many finished the training that followed · last ${m.basis.days} days`} style={{ gridColumn: 'span 5' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          {byLure.map((l, i) => (
            <motion.div key={l.type} {...enter(i, reduce)} style={{ flex: '1 1 0', minHeight: 0, maxHeight: 64, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', alignItems: 'center', gap: 14, borderTop: i ? '1px solid var(--hair)' : 'none' }}>
              <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <LureTile type={l.type} size={30} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.type}</span>
                  <span style={{ display: 'block', ...small, marginTop: 2, whiteSpace: 'nowrap' }}>{num(l.trained)} of {num(l.clicked)} who clicked</span>
                </span>
              </span>
              <Meter value={l.learned} max={1} color={ink.good} label={pc(l.learned)} sub="trained" delay={0.1 + 0.04 * i} reduce={reduce} />
            </motion.div>
          ))}
        </div>
      </Card>
      <Card i={5} reduce={reduce} title="Programmes" sub="Each training programme · all assigned training" style={{ gridColumn: 'span 7' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          <Heads cols={PROG_COLS}><span>Programme</span><span>Completion</span><span>Pass</span><span>Score</span><span style={{ textAlign: 'center' }}>Status</span></Heads>
          <div ref={fit} role="rowgroup" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {progs.slice(page * size, page * size + size).map((p, i) => (
              <motion.div key={p.program} role="row" {...enter(i, reduce)} style={{ flex: '1 1 0', minHeight: PROG_H, maxHeight: 50, display: 'grid', gridTemplateColumns: PROG_COLS, alignItems: 'center', gap: 14, padding: '0 13px', borderBottom: '1px solid var(--hair)' }}>
                <span style={{ minWidth: 0, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.program}</span>
                <Meter value={p.completion} max={100} color={ink.good} label={`${p.completion}%`} delay={0.1 + 0.03 * i} reduce={reduce} height={4} />
                <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.pass}%</span>
                <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.score}</span>
                <span style={{ display: 'flex', justifyContent: 'center' }}>
                  <Chip color={STATUS[p.status] === 'steady' ? STEADY_INK : ink[STATUS[p.status]]} width={96}>{STATUS_WORD[p.status] || p.status}</Chip>
                </span>
              </motion.div>
            ))}
          </div>
          {pages > 1 && <Pager page={page} pages={pages} total={progs.length} size={size} onPage={(progPage) => onView({ progPage })} what="programmes" />}
        </div>
      </Card>
    </div>
  );
}

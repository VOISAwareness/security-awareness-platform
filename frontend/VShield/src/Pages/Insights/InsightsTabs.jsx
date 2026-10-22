import { createElement, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, CalendarClock, FileX, MailX, MousePointerClick } from 'lucide-react';

import { Chip, Pager } from '../Leaderboard/BigPictureTables';
import { useFitRows } from '../Leaderboard/useFitRows';
import { ArrivalChart, Card, Columns, Legend, LineChart, PeopleGrid } from './InsightsCharts';
import { EASE, HEALTH_RULE, STEADY_INK, TIER_RULE, TIER_WORD, change, day, eyebrow, heads, healthInk, lureIcon, lureShort, mins, num, openInk, pc, pc1, small, swap, tierInk, times } from './insightsUi';

// Insights' tabs past the overview, each a bento of cards:
//   - People & risk: the risk score over the year; where everyone stands
//     by risk tier; each department, the riskiest first; what drives the
//     risk;
//   - Campaigns: from send to report; opened, clicked and reported over
//     time; how fast reports come in; each campaign; what works on people;
//   - Lures: every kind of lure in a table, the most convincing first; the
//     one picked opens beside it with its campaigns;
//   - Learning: the training funnel and its scores; quiz scores beside
//     reporting; each department; the learning moments after a click, by
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

// ---------------------------------------------------------------- people

const DAY = 86400000;
const DEPT_COLS = 'minmax(0,1.25fr) minmax(0,1.15fr) 104px minmax(0,1.1fr)';
const DEPT_H = 44;
const scoreText = (v, tick) => (Number.isFinite(v) ? (tick ? `${v}` : v.toFixed(1)) : '—');

// Where people stand: the hundred squares, and beside them each tier with
// its rule, how many, and its change since the start of the period.
function WhereTheyStand({ p, ink, isDark, reduce, i, style, compact = false }) {
  const colors = tierInk(isDark);
  const [picked, setPicked] = useState(null);
  const n = p.now;
  const b = p.before;
  return (
    <Card i={i} reduce={reduce} title="Where people stand" sub={`${num(n.people)} people by risk tier · each square is 1%`} style={style} data-ins-people>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', alignItems: 'center', gap: compact ? 14 : 20, marginTop: 12 }}>
        <div style={{ height: '100%', minHeight: 0, display: 'flex', alignItems: 'center' }}>
          <PeopleGrid tiers={p.tiers} counts={n.tiers} colors={colors} reduce={reduce} picked={picked} onPick={setPicked} size={compact ? 'md' : 'lg'} />
        </div>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: compact ? 6 : 9 }}>
          {[...p.tiers].reverse().map((t) => {
            const c = change(n.tiers[t] / n.people, b ? b.tiers[t] / b.people : null, { kind: 'pct', better: t === 'low' ? 'up' : 'down' });
            return (
              <div key={t} onMouseEnter={() => setPicked(t)} onMouseLeave={() => setPicked(null)} style={{ display: 'grid', gridTemplateColumns: '10px minmax(0,1fr) auto', alignItems: 'center', gap: 8, padding: '3px 6px', margin: '0 -6px', borderRadius: 8, background: picked === t ? 'var(--track)' : 'transparent', transition: 'background .15s ease' }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: colors[t] }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800 }}>{TIER_WORD[t]} <span style={{ ...small, fontWeight: 700 }}>· {num(n.tiers[t])}</span></span>
                  {!compact && <span style={{ display: 'block', ...small, fontSize: 9, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{TIER_RULE[t]}</span>}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="vs-rank" style={{ fontSize: 12.5, fontWeight: 900 }}>{pc(n.tiers[t] / n.people)}</span>
                  {!compact && <Delta c={c} ink={ink} title="Share of people, against the start of the period" />}
                </span>
              </div>
            );
          })}
          <span style={{ ...small, fontSize: 9.5, marginTop: 2 }}>
            <strong style={{ color: 'var(--text)' }}>{num(n.improved)}</strong> moved to a lower tier · <strong style={{ color: 'var(--text)' }}>{num(n.slipped)}</strong> to a higher one
          </span>
        </div>
      </div>
    </Card>
  );
}

// The risk score, thirty days at a time over the year, the period marked.
function RiskOverTime({ p, ink, reduce, isDark, i, style, title = 'Risk score over the year' }) {
  const top = Math.max(10, Math.ceil(Math.max(...p.trend.map((s) => s.score)) / 5) * 5 + 5);
  const ticks = Array.from({ length: Math.floor(top / 10) + 1 }, (_, k) => k * 10);
  const c = change(p.now.score, p.before?.score, { kind: 'times', better: 'down' });
  return (
    <Card i={i} reduce={reduce} title={title} sub="Everyone's risk tier on 0 to 100, averaged · lower is safer" action={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><span className="vs-rank" style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{scoreText(p.now.score)}</span><Delta c={c && { ...c, shown: c.shown.replace('×', ' pts') }} ink={ink} title="Against the start of the period" /></span>} style={style} data-ins-risk>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
        <LineChart at={p.trend.map((s) => s.to)} series={[{ id: 'score', label: 'Risk score', color: ink.bad, values: p.trend.map((s) => s.score) }]} from={p.basis.end - p.basis.days * DAY} days={p.basis.days} format={scoreText} top={top} ticks={ticks} area reduce={reduce} isDark={isDark} tipHead={(t) => `Thirty days to ${day(t)}`} />
      </div>
    </Card>
  );
}

const DRIVERS = [
  { id: 'repeatClickers', label: 'Repeat clickers', sub: 'Clicked more than once', Icon: MousePointerClick },
  { id: 'neverReported', label: 'Never reported', sub: 'Not one report, ever', Icon: MailX },
  { id: 'overdueTraining', label: 'Overdue training', sub: 'Assigned, past its date', Icon: CalendarClock },
  { id: 'quizFailures', label: 'Failed the quiz again', sub: 'More than one fail', Icon: FileX },
];

export function PeopleTab({ m, p, view, onView, ink, reduce, isDark }) {
  const [fit, size] = useFitRows(DEPT_H, 3, ROW_GAP);
  const rows = p.departments;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const focusAt = view.dept ? rows.findIndex((d) => d.name === view.dept) : -1;
  const page = Math.min(pages - 1, view.deptPage ?? (focusAt >= 0 ? Math.floor(focusAt / size) : 0));
  const maxScore = Math.max(...rows.map((d) => d.score), 1) * 1.1;
  const camp = Object.fromEntries(m.departments.map((d) => [d.name, d]));
  const maxDriver = Math.max(...DRIVERS.map((d) => p.now.drivers[d.id]), 1);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gridTemplateRows: 'minmax(0,1fr) minmax(0,1.15fr)', gap: 14 }}>
      <RiskOverTime i={0} p={p} ink={ink} reduce={reduce} isDark={isDark} style={{ gridColumn: 'span 7' }} />
      <WhereTheyStand i={1} p={p} ink={ink} isDark={isDark} reduce={reduce} style={{ gridColumn: 'span 5' }} />
      <Card i={2} reduce={reduce} title="Departments" sub="The riskiest first · risk score, people at high risk, and how they handled the period's emails" style={{ gridColumn: 'span 7' }} data-ins-depts>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 10 }}>
          <Heads cols={DEPT_COLS}><span>Department</span><span>Risk score</span><span>At high risk</span><span>Clicks against reports</span></Heads>
          <div ref={fit} role="rowgroup" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: ROW_GAP, paddingTop: 8 }}>
            {rows.slice(page * size, page * size + size).map((d, k) => {
              const on = view.dept === d.name;
              const c = camp[d.name];
              const dc = change(d.score, d.scoreBefore, { kind: 'times', better: 'down' });
              return (
                <motion.div key={d.name} role="row" data-ins-dept={d.name} {...enter(k, reduce)} style={{ height: DEPT_H, flexShrink: 0, boxSizing: 'border-box', display: 'grid', gridTemplateColumns: DEPT_COLS, alignItems: 'center', gap: 14, padding: '0 12px', borderRadius: 12, border: `1px solid ${on ? 'var(--sel-edge)' : 'var(--row-hair)'}`, background: on ? 'var(--sel)' : 'var(--row)' }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                    <span style={{ display: 'block', ...small, marginTop: 2 }}>{num(d.people)} people</span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ flex: 1, minWidth: 0 }}><Meter value={d.score} max={maxScore} color={ink.bad} label={scoreText(d.score)} delay={0.1 + 0.03 * k} reduce={reduce} height={5} /></span>
                    <Delta c={dc && { ...dc, shown: dc.shown.replace('×', '') }} ink={ink} title="Against the start of the period" />
                  </span>
                  <span>
                    <span className="vs-rank" style={{ fontSize: 13, fontWeight: 900 }}>{num(d.highRisk)}</span>
                    <span style={{ display: 'block', ...small, marginTop: 2 }}>{pc(d.highRisk / d.people)} of them</span>
                  </span>
                  {c ? <Tug clicked={c.clicked} reported={c.reported} ink={ink} delay={0.12 + 0.03 * k} reduce={reduce} /> : <span style={small}>No emails in the period</span>}
                </motion.div>
              );
            })}
          </div>
          <Pager page={page} pages={pages} total={rows.length} size={size} onPage={(deptPage) => onView({ deptPage })} what="departments" />
        </div>
      </Card>
      <Card i={3} reduce={reduce} title="What drives the risk" sub={`People behind it, as things stand · against the start of the last ${p.basis.days} days`} style={{ gridColumn: 'span 5' }} data-ins-drivers>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 6 }}>
          {DRIVERS.map((dr, k) => {
            const v = p.now.drivers[dr.id];
            const c = change(v, p.before?.drivers[dr.id], { kind: 'min', better: 'down' });
            return (
              <motion.div key={dr.id} {...enter(k, reduce)} style={{ flex: '1 1 0', minHeight: 0, maxHeight: 72, display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) minmax(0,0.9fr) auto', alignItems: 'center', gap: 12, borderTop: k ? '1px solid var(--hair)' : 'none' }}>
                <span aria-hidden style={{ width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'var(--plate)', color: 'var(--text)' }}><dr.Icon size={16} strokeWidth={2.3} /></span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800 }}>{dr.label}</span>
                  <span style={{ display: 'block', ...small, marginTop: 2 }}>{dr.sub}</span>
                </span>
                <Meter value={v} max={maxDriver} color={ink.bad} label={num(v)} sub={`${pc1(v / p.now.people)} of people`} delay={0.15 + 0.05 * k} reduce={reduce} height={5} />
                <Delta c={c && { ...c, shown: c.shown.replace(' min', '') }} ink={ink} title="People, against the start of the period" />
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- campaigns

const CAMP_COLS = 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) 62px 62px 96px';
const CAMP_H = 40;
const pcAxis = (v, tick) => (Number.isFinite(v) ? (tick ? `${Math.round(v * 100)}%` : pc(v)) : '—');

// From send to report: each step of the period's emails, its number and
// its share of those delivered, the bars falling away left to right.
function EmailFlow({ m, ink, reduce }) {
  const n = m.now;
  const steps = [
    { id: 'sent', label: 'Sent', value: n.sent, share: null, color: 'var(--text)' },
    { id: 'delivered', label: 'Delivered', value: n.delivered, share: n.deliveryRate, of: 'of sent', color: 'var(--text)' },
    { id: 'opened', label: 'Opened', value: n.opened, share: n.openRate, color: openInk(false) },
    { id: 'clicked', label: 'Clicked', value: n.clicked, share: n.hooked, color: ink.bad },
    { id: 'gave', label: 'Gave details', value: n.compromised, share: n.compromised / n.delivered, color: ink.bad },
    { id: 'reported', label: 'Reported', value: n.reported, share: n.reportRate, color: ink.good },
    { id: 'complained', label: 'Complaints', value: n.complained, share: n.complaintRate, color: STEADY_INK, exact: true },
  ];
  return (
    <div data-ins-flow style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0,1fr))`, gap: 10 }}>
      {steps.map((st, k) => (
        <motion.div key={st.id} initial={{ opacity: 0, y: reduce ? 0 : 12, scale: reduce ? 1 : 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.05 * k, ease: EASE }} style={{ minWidth: 0, padding: '10px 14px 11px', borderRadius: 14, background: 'var(--plate)' }}>
          <div style={{ ...eyebrow, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 6, whiteSpace: 'nowrap' }}>
            <span className="vs-rank" style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{num(st.value)}</span>
            <span style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.share === null ? 'emails' : `${st.exact ? `${(st.share * 100).toFixed(2)}%` : pc1(st.share)} ${st.of || ''}`}</span>
          </div>
          <span aria-hidden style={{ display: 'block', height: 4, marginTop: 9, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
            <motion.span initial={{ width: reduce ? `${(st.value / n.sent) * 100}%` : 0 }} animate={{ width: `${Math.max(1.5, (st.value / n.sent) * 100)}%` }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.2 + 0.06 * k, ease: EASE }} style={{ display: 'block', height: '100%', borderRadius: 999, background: st.color }} />
          </span>
        </motion.div>
      ))}
    </div>
  );
}

export function CampaignsTab({ m, view, onView, ink, reduce, isDark }) {
  const [fit, size] = useFitRows(CAMP_H, 3, ROW_GAP);
  const rows = m.campaigns;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const focusAt = view.campaign ? rows.findIndex((c) => c.id === view.campaign) : -1;
  const page = Math.min(pages - 1, view.page ?? (focusAt >= 0 ? Math.floor(focusAt / size) : 0));
  const maxRate = Math.max(...rows.map((c) => Math.max(c.hooked || 0, c.reportRate || 0)), 0.01);
  const a = m.arrival.now;
  const months = m.months;
  const top = Math.min(1, Math.ceil(Math.max(...months.flatMap((x) => [x.openRate || 0, x.reportRate || 0, x.hooked || 0])) * 10 + 1) / 10);
  const series = [
    { id: 'open', label: 'Opened', color: openInk(isDark), values: months.map((x) => x.openRate) },
    { id: 'report', label: 'Reported', color: ink.good, values: months.map((x) => x.reportRate) },
    { id: 'click', label: 'Clicked', color: ink.bad, values: months.map((x) => x.hooked) },
  ];
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gridTemplateRows: 'auto minmax(0,0.85fr) minmax(0,1.15fr)', gap: 14 }}>
      <EmailFlow m={m} ink={ink} reduce={reduce} />
      <Card i={1} reduce={reduce} title="Opened, clicked and reported" sub="Of the emails delivered, thirty days at a time over six months" action={<Legend items={series.map((x) => ({ label: x.label, color: x.color, line: true }))} />} style={{ gridColumn: 'span 7' }} data-ins-engagement>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
          <LineChart at={months.map((x) => x.to)} series={series} from={m.basis.from} days={m.basis.days} format={pcAxis} top={top} ticks={Array.from({ length: Math.round(top * 5) + 1 }, (_, k) => k * 0.2).filter((v) => v <= top + 1e-9)} reduce={reduce} isDark={isDark} tipHead={(t) => `Thirty days to ${day(t)}`} />
        </div>
      </Card>
      <Card i={2} reduce={reduce} title="How fast reports come in" sub={`Of all the reports, how many were in by each minute after the send · ${pc(a.by15)} in 15 minutes, ${pc(a.by60)} within the hour`} action={<Legend items={[{ label: 'This period', color: ink.good, line: true }, { label: 'The period before', color: 'var(--muted)', line: true, faint: true }]} />} style={{ gridColumn: 'span 5' }} data-ins-arrival>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 10 }}>
          <ArrivalChart now={a} before={m.arrival.before} color={ink.good} reduce={reduce} isDark={isDark} />
        </div>
      </Card>
      <Card i={3} reduce={reduce} title="Campaign by campaign" sub="Newest first · how many clicked and reported, and how fast the reports came" style={{ gridColumn: 'span 7' }} data-ins-camps>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 10 }}>
          <Heads cols={CAMP_COLS}><span>Campaign</span><span>Hook Rate</span><span>Report Rate</span><span>First report</span><span>Half in</span><span style={{ textAlign: 'center' }}>Health</span></Heads>
          <div ref={fit} role="rowgroup" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: ROW_GAP, paddingTop: 8 }}>
            {rows.slice(page * size, page * size + size).map((c, k) => {
              const on = view.campaign === c.id;
              return (
                <motion.div key={c.id} role="row" data-ins-campaign={c.id} {...enter(k, reduce)} style={{ height: CAMP_H, flexShrink: 0, boxSizing: 'border-box', display: 'grid', gridTemplateColumns: CAMP_COLS, alignItems: 'center', gap: 14, padding: '0 12px', borderRadius: 12, border: `1px solid ${on ? 'var(--sel-edge)' : 'var(--row-hair)'}`, background: on ? 'var(--sel)' : 'var(--row)' }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                    <span style={{ display: 'block', ...small, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.type} · {c.started}</span>
                  </span>
                  <Meter value={c.hooked} max={maxRate} color={ink.bad} label={pc1(c.hooked)} delay={0.1 + 0.03 * k} reduce={reduce} height={5} />
                  <Meter value={c.reportRate} max={maxRate} color={ink.good} label={pc1(c.reportRate)} delay={0.14 + 0.03 * k} reduce={reduce} height={5} />
                  <span style={{ fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{mins(c.firstReport)}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{mins(c.medianReport)}</span>
                  <span style={{ display: 'flex', justifyContent: 'center' }}><HealthChip h={c.health} ink={ink} /></span>
                </motion.div>
              );
            })}
          </div>
          <Pager page={page} pages={pages} total={rows.length} size={size} onPage={(p) => onView({ page: p })} what="campaigns" />
        </div>
      </Card>
      <Card i={4} reduce={reduce} title="What works on people" sub="Hook Rate by what the email leaned on, the strongest first" style={{ gridColumn: 'span 5' }} data-ins-motivators>
        <Columns
          items={m.motivators.map((x) => ({ key: x.motivator, label: x.motivator, value: x.hooked, text: pc(x.hooked), tip: [x.motivator, `Hook Rate ${pc1(x.hooked)} · reported ${pc(x.reportRate)}`, `${x.campaigns} ${x.campaigns === 1 ? 'campaign' : 'campaigns'} · ${num(x.delivered)} emails`] }))}
          color={ink.bad}
          reduce={reduce}
          label="clicked"
        />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- learning

const PROG_COLS = 'minmax(0,1.5fr) minmax(0,1fr) 44px 44px 100px';
const PROG_H = 36;
const STATUS = { Good: 'good', Average: 'steady', 'Needs Work': 'bad' };
const STATUS_WORD = { Good: 'Good', Average: 'Average', 'Needs Work': 'Needs work' };
const LDEPT_COLS = 'minmax(0,1.3fr) minmax(0,1.1fr) 44px 52px 60px';

export function LearningTab({ m, p, training, view, onView, ink, reduce, isDark }) {
  const t = p.now.training;
  const tb = p.before?.training;
  const byLure = [...m.lures].filter((l) => l.learned !== null).sort((a, b) => b.learned - a.learned);
  const [fitP, sizeP] = useFitRows(PROG_H, 2, 0);
  const progs = training.programmes;
  const pagesP = Math.max(1, Math.ceil(progs.length / sizeP));
  const pageP = Math.min(view.progPage, pagesP - 1);
  const depts = [...p.departments].sort((a, b) => (b.training.completion ?? 0) - (a.training.completion ?? 0));
  const [fitD, sizeD] = useFitRows(PROG_H, 2, 0);
  const pagesD = Math.max(1, Math.ceil(depts.length / sizeD));
  const pageD = Math.min(view.ldeptPage ?? 0, pagesD - 1);
  const funnel = [['Assigned', t.assigned, 'assigned'], ['Started', t.started, 'started'], ['Completed', t.completed, 'completed'], ['Passed', t.passed, 'passed']];
  const quiz = p.trend.slice(-m.months.length);
  const series = [
    { id: 'quiz', label: 'Quiz score', color: openInk(isDark), values: quiz.map((s) => s.quizScore / 100) },
    { id: 'report', label: 'Report Rate', color: ink.good, values: m.months.map((x) => x.reportRate) },
  ];
  const tiles = [
    ...funnel.map(([label, v, key], k) => ({ id: key, label, value: num(v), sub: k ? `${pc(t.assigned ? v / t.assigned : null)} of assigned` : 'people', bar: t.assigned ? v / t.assigned : 0, c: change(k ? v / t.assigned : v, tb ? (k ? tb[key] / tb.assigned : tb[key]) : null, { kind: k ? 'pct' : 'min', better: 'up' }) })),
    { id: 'quiz', label: 'Quiz score', value: Number.isFinite(t.quizScore) ? t.quizScore.toFixed(1) : '—', sub: 'average, of 100', bar: (t.quizScore || 0) / 100, c: change(t.quizScore, tb?.quizScore, { kind: 'times', better: 'up' }) },
    { id: 'badges', label: 'Badges · points', value: num(t.badges), sub: `${num(t.points)} points earned`, bar: null, c: change(t.badges, tb?.badges, { kind: 'min', better: 'up' }) },
  ];
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gridTemplateRows: 'auto minmax(0,0.85fr) minmax(0,1.15fr)', gap: 14 }}>
      <div data-ins-funnel style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: `repeat(${tiles.length}, minmax(0,1fr))`, gap: 10 }}>
        {tiles.map((x, k) => (
          <motion.div key={x.id} initial={{ opacity: 0, y: reduce ? 0 : 12, scale: reduce ? 1 : 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.05 * k, ease: EASE }} style={{ minWidth: 0, padding: '10px 14px 11px', borderRadius: 14, background: 'var(--plate)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ ...eyebrow, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.label}</span>
              <span style={{ marginLeft: 'auto' }}><Delta c={x.c && { ...x.c, shown: x.c.shown.replace(' min', '').replace('×', '') }} ink={ink} title="Against the period before" /></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 6, whiteSpace: 'nowrap' }}>
              <span className="vs-rank" style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{x.value}</span>
              <span style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.sub}</span>
            </div>
            {x.bar !== null
              ? <span aria-hidden style={{ display: 'block', height: 4, marginTop: 9, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}><motion.span initial={{ width: reduce ? `${x.bar * 100}%` : 0 }} animate={{ width: `${x.bar * 100}%` }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.2 + 0.06 * k, ease: EASE }} style={{ display: 'block', height: '100%', borderRadius: 999, background: x.id === 'quiz' ? openInk(isDark) : ink.good }} /></span>
              : <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7, ...small, fontSize: 9 }}><Award size={11} strokeWidth={2.4} aria-hidden /> Badges awarded</span>}
          </motion.div>
        ))}
      </div>
      <Card i={1} reduce={reduce} title="Quiz scores and reporting" sub="Does learning show up as reporting? Thirty days at a time" action={<Legend items={series.map((x) => ({ label: x.label, color: x.color, line: true }))} />} style={{ gridColumn: 'span 6' }} data-ins-quiz>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
          <LineChart at={m.months.map((x) => x.to)} series={series} from={m.basis.from} days={m.basis.days} format={pcAxis} top={1} ticks={[0, 0.25, 0.5, 0.75, 1]} reduce={reduce} isDark={isDark} tipHead={(at) => `Thirty days to ${day(at)}`} />
        </div>
      </Card>
      <Card i={2} reduce={reduce} title="Learning moments by lure" sub="Of those who clicked, how many finished the training that followed" style={{ gridColumn: 'span 6' }} data-ins-learned>
        <Columns
          items={byLure.map((l) => ({ key: l.type, label: lureShort(l.type), value: l.learned, text: pc(l.learned), tip: [l.type, `${num(l.trained)} of ${num(l.clicked)} who clicked finished the training`] }))}
          color={ink.good}
          soft="var(--soft-good)"
          reduce={reduce}
          label="of those who clicked finished the training"
        />
      </Card>
      <Card i={3} reduce={reduce} title="Departments" sub={`Training in the last ${p.basis.days} days, the most complete first`} style={{ gridColumn: 'span 6' }} data-ins-ldepts>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          <Heads cols={LDEPT_COLS}><span>Department</span><span>Completed</span><span>Quiz</span><span>Badges</span><span>Points</span></Heads>
          <div ref={fitD} role="rowgroup" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {depts.slice(pageD * sizeD, pageD * sizeD + sizeD).map((d, k) => (
              <motion.div key={d.name} role="row" {...enter(k, reduce)} style={{ flex: '1 1 0', minHeight: PROG_H, maxHeight: 48, display: 'grid', gridTemplateColumns: LDEPT_COLS, alignItems: 'center', gap: 14, padding: '0 13px', borderBottom: '1px solid var(--hair)' }}>
                <span style={{ minWidth: 0, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                <Meter value={d.training.completion} max={1} color={ink.good} label={pc(d.training.completion)} delay={0.1 + 0.03 * k} reduce={reduce} height={4} />
                <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{Number.isFinite(d.training.quizScore) ? d.training.quizScore.toFixed(0) : '—'}</span>
                <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{num(d.training.badges)}</span>
                <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{num(d.training.points)}</span>
              </motion.div>
            ))}
          </div>
          {pagesD > 1 && <Pager page={pageD} pages={pagesD} total={depts.length} size={sizeD} onPage={(ldeptPage) => onView({ ldeptPage })} what="departments" />}
        </div>
      </Card>
      <Card i={4} reduce={reduce} title="Programmes" sub="Each training programme, since it began" style={{ gridColumn: 'span 6' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          <Heads cols={PROG_COLS}><span>Programme</span><span>Completion</span><span>Pass</span><span>Score</span><span style={{ textAlign: 'center' }}>Status</span></Heads>
          <div ref={fitP} role="rowgroup" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {progs.slice(pageP * sizeP, pageP * sizeP + sizeP).map((pr, k) => (
              <motion.div key={pr.program} role="row" {...enter(k, reduce)} style={{ flex: '1 1 0', minHeight: PROG_H, maxHeight: 48, display: 'grid', gridTemplateColumns: PROG_COLS, alignItems: 'center', gap: 14, padding: '0 13px', borderBottom: '1px solid var(--hair)' }}>
                <span style={{ minWidth: 0, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pr.program}</span>
                <Meter value={pr.completion} max={100} color={ink.good} label={`${pr.completion}%`} delay={0.1 + 0.03 * k} reduce={reduce} height={4} />
                <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{pr.pass}%</span>
                <span style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{pr.score}</span>
                <span style={{ display: 'flex', justifyContent: 'center' }}>
                  <Chip color={STATUS[pr.status] === 'steady' ? STEADY_INK : ink[STATUS[pr.status]]} width={96}>{STATUS_WORD[pr.status] || pr.status}</Chip>
                </span>
              </motion.div>
            ))}
          </div>
          {pagesP > 1 && <Pager page={pageP} pages={pagesP} total={progs.length} size={sizeP} onPage={(progPage) => onView({ progPage })} what="programmes" />}
        </div>
      </Card>
    </div>
  );
}

export { RiskOverTime, WhereTheyStand };

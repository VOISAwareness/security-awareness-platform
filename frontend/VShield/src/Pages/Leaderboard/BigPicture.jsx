import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Award, Building2, Check, Coins, Copy, Mail, MessageSquareQuote, RotateCcw, TrendingUp, TriangleAlert, X } from 'lucide-react';

import { REPORT_INK } from './reportInk';

// The Big Picture: the leaderboard's reporting view for leaders and admins.
//
// It reports what the board shows and what could happen next; it never says
// what to do. Leaders read it and plan for themselves. Nothing here repeats
// the Dashboard: it is about movement on the board (levels climbed and
// slipped, points gained and lost) and how that splits by level, lure, team
// and message style.
//
// Along the top, what moved. Four cards, each a question with its answer and
// the number behind it; click one and it turns over to the full breakdown,
// with why it matters. Along the bottom, who is one step from a change.
//
// Colours: teal for climbing, reporting and gaining points; red for slipping,
// clicking and losing them. Checked for colour-blind separation on both
// themes, and every coloured mark has its number beside it.

const pc = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);
const num = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;

const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };
const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };

// Two counts side by side in one bar (climbed vs slipped, gained vs lost).
function Split({ a, b, aLabel, bLabel, ink }) {
  const sum = Math.max(1, a + b);
  return (
    <div>
      <div role="img" aria-label={`${a} ${aLabel}, ${b} ${bLabel}`} style={{ display: 'flex', gap: 2, height: 7 }}>
        {a > 0 && <span style={{ flex: a / sum, background: ink.good, borderRadius: b > 0 ? '4px 0 0 4px' : 4 }} />}
        {b > 0 && <span style={{ flex: b / sum, background: ink.bad, borderRadius: a > 0 ? '0 4px 4px 0' : 4 }} />}
        {!a && !b && <span style={{ flex: 1, background: 'var(--track)', borderRadius: 4 }} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6, ...small }}>
        <span><strong style={{ color: 'var(--text)' }}>{num(a)}</strong> {aLabel}</span>
        <span><strong style={{ color: 'var(--text)' }}>{num(b)}</strong> {bLabel}</span>
      </div>
    </div>
  );
}

// A rate against a comparison: a thin bar with a 4px end, a tick at the comparison.
function Meter({ value, avg, color, label, avgLabel, compact = false, max: scale = null }) {
  const max = scale ?? Math.max(0.05, value ?? 0, avg ?? 0) * 1.25;
  return (
    <div>
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, ...small, fontWeight: 700, marginBottom: 6 }}>
          <span>{label}</span>
          <span style={{ whiteSpace: 'nowrap' }}><strong style={{ color: 'var(--text)' }}>{pc(value)}</strong>{avg !== null && avg !== undefined && <> · {avgLabel} {pc(avg)}</>}</span>
        </div>
      )}
      <div role="img" aria-label={`${label} ${pc(value)}${avg !== null && avg !== undefined ? `, ${avgLabel} ${pc(avg)}` : ''}`} style={{ position: 'relative', height: compact ? 5 : 7 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(1, (value ?? 0) / max) * 100}%`, background: color, borderRadius: '0 4px 4px 0' }} />
        </div>
        {avg !== null && avg !== undefined && <span aria-hidden style={{ position: 'absolute', left: `calc(${Math.min(1, avg / max) * 100}% - 1px)`, top: -3, bottom: -3, width: 2, borderRadius: 1, background: 'var(--text)' }} />}
      </div>
    </div>
  );
}

// One cell of a click-rate heat map: deeper red, more clicks; the number is always written.
function Heat({ value, max, rgb, h = 26 }) {
  if (value === null || value === undefined) {
    return <span style={{ height: h, display: 'grid', placeItems: 'center', borderRadius: 6, background: 'var(--track)', ...small }} title="Not sent to this level">—</span>;
  }
  const a = 0.1 + 0.8 * (value / Math.max(0.01, max));
  return (
    <span style={{ height: h, display: 'grid', placeItems: 'center', borderRadius: 6, background: `rgba(${rgb},${a.toFixed(2)})`, color: a > 0.55 ? '#FFFFFF' : 'var(--text)', fontSize: 9.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
      {pc(value)}
    </span>
  );
}

// A bar either side of zero (slipped | climbed, lost | gained), its number at the end.
function Diverge({ value, max, ink, left = false }) {
  const w = `${(Math.min(1, Math.abs(value) / Math.max(1, max)) * 100).toFixed(1)}%`;
  return (
    <span style={{ display: 'flex', justifyContent: left ? 'flex-end' : 'flex-start', alignItems: 'center', gap: 5, minWidth: 0 }}>
      {left && <span style={{ ...small, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value ? num(Math.abs(value)) : ''}</span>}
      <span style={{ height: 7, width: value ? w : 0, minWidth: value ? 3 : 0, background: left ? ink.bad : ink.good, borderRadius: left ? '4px 0 0 4px' : '0 4px 4px 0' }} />
      {!left && <span style={{ ...small, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value ? num(Math.abs(value)) : ''}</span>}
    </span>
  );
}

// --- the four questions -------------------------------------------------------

function cardsFor(r, campaign, ink, rgb) {
  const org = !campaign;
  // 1. levels: who moved
  const mover = [...r.groups].sort((a, b) => b.climbed - a.climbed || a.label.localeCompare(b.label))[0];
  const maxMove = Math.max(1, ...r.groups.map((g) => Math.max(g.climbed, g.slipped)));
  // 2. lures: what catches each level (by Phish Catchers and Champions)
  const sticky = [...r.lures].sort((a, b) => (b.cells.strong ?? -1) - (a.cells.strong ?? -1))[0];
  const maxHeat = Math.max(0.01, ...r.lures.flatMap((l) => Object.values(l.cells).filter((v) => v !== null)));
  // 3. teams: points gained and lost
  const topTeam = r.teams[0];
  const lowTeam = r.teams.at(-1);
  const maxNet = Math.max(1, ...r.teams.map((t) => Math.abs(t.net)));
  const gained = r.teams.filter((t) => t.net > 0).length;
  // 4. messages
  const mt = r.messages.teams[0];
  const styleAvg = org ? r.messages.styles.find((s) => s.style === mt?.best)?.rate ?? null : r.messages.overall;
  const maxRate = Math.max(0.05, ...r.messages.teams.map((t) => t.rate ?? 0));

  const strip = (lure) => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 3 }}>
        {r.groups.map((g) => <Heat key={g.id} value={lure?.cells[g.id] ?? null} max={maxHeat} rgb={rgb} h={22} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 3, marginTop: 4 }}>
        {r.groups.map((g) => <span key={g.id} style={{ ...small, fontSize: 8.5, textAlign: 'center', whiteSpace: 'nowrap' }}>{g.short}</span>)}
      </div>
    </div>
  );

  return [
    {
      id: 'moved', n: 1, title: 'Who moved', Icon: TrendingUp,
      answer: mover.label,
      note: org ? 'Climbed the most in the last 30 days' : 'Climbed the most in this campaign',
      hero: num(mover.climbed), caption: `of them climbed a level, from ${num(mover.people)} who started here`,
      mini: <Split a={mover.climbed} b={mover.slipped} aLabel="climbed" bLabel="slipped" ink={ink} />,
      what: 'Climbed and slipped a level, by the level people started at.',
      why: 'Movement shows whether behaviour is changing, not only where it stands.',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span style={{ textAlign: 'right', paddingRight: 6 }}>Slipped</span><span style={{ paddingLeft: 6 }}>Climbed</span>
          </div>
          {r.groups.map((g) => (
            <div key={g.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
                <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.label}</span>
                <span style={{ ...small, flexShrink: 0 }}>{num(g.people)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2px 1fr', alignItems: 'center' }}>
                <Diverge value={g.slipped} max={maxMove} ink={ink} left />
                <span style={{ height: 14, background: 'var(--hair)' }} />
                <Diverge value={g.climbed} max={maxMove} ink={ink} />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'lures', n: 2, title: 'What catches each level', Icon: Mail,
      answer: sticky?.type || '—',
      note: org ? `${pc(sticky?.cells.low)} of New Joiners and below clicked it` : 'The lure this campaign used',
      hero: pc(sticky?.cells.strong), caption: org ? 'of Phish Catchers and Champions clicked it, more than any other lure' : 'of Phish Catchers and Champions clicked it',
      mini: strip(sticky),
      what: org ? 'How often each lure got a click, at each level.' : 'How each level handled this lure: clicked and reported.',
      why: 'Shows which tricks still work on people who usually spot them.',
      body: org ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) repeat(4, minmax(0,1fr))', gap: 3, alignItems: 'center' }}>
            <span />
            {r.groups.map((g) => <span key={g.id} style={{ ...small, fontSize: 8.5, fontWeight: 800, textAlign: 'center', whiteSpace: 'nowrap' }}>{g.short}</span>)}
            {r.lures.map((l) => [
              <span key={`${l.type}-n`} title={l.type} style={{ fontSize: 9.5, fontWeight: 700, lineHeight: 1.15, paddingRight: 4, overflowWrap: 'anywhere' }}>{l.type.replace(/ lure$/, '')}</span>,
              ...r.groups.map((g) => <Heat key={`${l.type}-${g.id}`} value={l.cells[g.id]} max={maxHeat} rgb={rgb} />),
            ])}
          </div>
          <div style={{ ...small, marginTop: 8 }}>Click rate by lure (rows) and level (columns) · deeper red, more clicks</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {r.groups.map((g) => (
            <div key={g.id}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '52px minmax(0,1fr) 30px', alignItems: 'center', gap: 6, ...small }}>
                <span>Clicked</span><Meter compact value={g.click} color={ink.bad} label="Clicked" /><strong style={{ color: 'var(--text)', textAlign: 'right' }}>{pc(g.click)}</strong>
                <span>Reported</span><Meter compact value={g.report} color={ink.good} label="Reported" /><strong style={{ color: 'var(--text)', textAlign: 'right' }}>{pc(g.report)}</strong>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'teams', n: 3, title: 'Which teams gained ground', Icon: Building2,
      answer: topTeam?.name || '—',
      note: lowTeam ? `${lowTeam.name} ${lowTeam.net < 0 ? 'lost the most' : 'gained the least'}: ${signed(lowTeam.net)} pts` : '',
      hero: signed(topTeam?.net || 0), caption: 'points, the most of any team',
      mini: <Split a={gained} b={r.teams.length - gained} aLabel="teams gained" bLabel="lost or held" ink={ink} />,
      what: 'Points each team gained or lost, reports less clicks.',
      why: 'Points are the board’s record of behaviour: reporting earns them, clicking costs them.',
      body: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {r.teams.map((t) => (
            <div key={t.name}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2px 1fr', alignItems: 'center' }}>
                <Diverge value={Math.min(0, t.net)} max={maxNet} ink={ink} left />
                <span style={{ height: 12, background: 'var(--hair)' }} />
                <Diverge value={Math.max(0, t.net)} max={maxNet} ink={ink} />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'messages', n: 4, title: 'Which message lands where', Icon: MessageSquareQuote,
      answer: org ? mt?.name || '—' : r.messages.style,
      note: org ? `Clicked most when an email used ${mt?.best?.toLowerCase()}` : 'The message style this campaign used',
      hero: pc(mt?.rate), caption: org ? 'the highest click rate of any team and style' : `of ${mt?.name} clicked it, the most of any team`,
      mini: <Meter value={mt?.rate} avg={styleAvg} color={ink.bad} label={org ? `${mt?.best} emails` : 'This campaign'} avgLabel={org ? 'all teams' : 'everyone'} />,
      what: org ? 'Each team’s most-clicked message style, and how often it worked.' : 'How often each team clicked this campaign’s message.',
      why: 'The pressure that works differs from team to team.',
      body: (
        <div>
          {org && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {r.messages.styles.map((s) => (
                <span key={s.style} style={{ padding: '3px 7px', borderRadius: 999, background: 'var(--track)', ...small, fontSize: 9 }}>{s.style} <strong style={{ color: 'var(--text)' }}>{pc(s.rate)}</strong></span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {r.messages.teams.map((t) => (
              <div key={t.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 10, fontWeight: 700, marginBottom: 3 }}>
                  <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                  <span style={{ flexShrink: 0, ...small }}>{org && <>{t.best} · </>}<strong style={{ color: 'var(--text)' }}>{pc(t.rate)}</strong></span>
                </div>
                <Meter compact value={t.rate} avg={org ? null : r.messages.overall} color={ink.bad} label={t.name} max={maxRate * 1.1} />
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];
}

// The front of a card: the answer, the number behind it, and a small picture of it.
function Front({ c, open, onTurn }) {
  return (
    <button
      type="button"
      inert={open}
      data-bp-card={c.id}
      className="bp-card"
      onClick={onTurn}
      aria-expanded={open}
      aria-label={`${c.title}: ${c.answer}. See the breakdown`}
      style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: '16px 18px', borderRadius: 16, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)' }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden style={{ width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center', background: 'var(--bp-soft)', color: 'var(--bp-ink)' }}><c.Icon size={12} strokeWidth={2.6} /></span>
        <span style={eyebrow}>{c.title}</span>
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={`${c.answer}-${c.hero}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginTop: 14 }}>
          <span className="vs-rank" style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{c.answer}</span>
          <span style={{ ...small, fontSize: 10, lineHeight: 1.45, marginTop: 5 }}>{c.note}</span>
          <span style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 0' }}>
            <span className="vs-rank" style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{c.hero}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.4, marginTop: 6 }}>{c.caption}</span>
          </span>
          <span style={{ display: 'block' }}>{c.mini}</span>
        </motion.span>
      </AnimatePresence>
      <span className="bp-turn" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 10, fontWeight: 800, color: 'var(--muted)' }}>
        See the breakdown <ArrowRight size={12} strokeWidth={2.6} aria-hidden />
      </span>
    </button>
  );
}

// The back of a card: what it shows, why it matters, the full breakdown.
function Back({ c, open, flat, onClose }) {
  const close = useRef(null);
  useEffect(() => { if (open) close.current?.focus(); }, [open]);
  return (
    <div
      data-bp-back={c.id}
      inert={!open}
      aria-hidden={!open}
      style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: flat ? 'none' : 'rotateY(180deg)', display: 'flex', flexDirection: 'column', padding: '14px 12px 12px 18px', borderRadius: 16, border: '1.5px solid var(--bp-accent)', background: 'var(--rail)', color: 'var(--text)', boxShadow: '0 12px 28px rgba(15,23,42,0.12)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingRight: 4 }}>
        <span style={{ ...eyebrow, color: 'var(--bp-ink)' }}>{c.title}</span>
        <button ref={close} type="button" onClick={onClose} aria-label="Close the breakdown" style={{ marginLeft: 'auto', width: 24, height: 24, display: 'grid', placeItems: 'center', borderRadius: 8, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
          <X size={13} strokeWidth={2.6} />
        </button>
      </div>
      <p style={{ margin: '6px 6px 0 0', fontSize: 10.5, fontWeight: 700, lineHeight: 1.45, flexShrink: 0 }}>{c.what}</p>
      <p style={{ margin: '3px 6px 12px 0', ...small, lineHeight: 1.45, flexShrink: 0 }}>{c.why}</p>
      <div className="lb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: 6 }}>{c.body}</div>
    </div>
  );
}

// One card that turns over (with reduced motion, it swaps instead).
function Card({ c, open, onTurn, reduce }) {
  const front = <Front c={c} open={open} onTurn={onTurn} />;
  const back = <Back c={c} open={open} flat={reduce} onClose={onTurn} />;
  if (reduce) return <div style={{ position: 'relative', minWidth: 0, minHeight: 0 }}>{open ? back : front}</div>;
  return (
    <div style={{ position: 'relative', minWidth: 0, minHeight: 0, perspective: 1400 }}>
      <motion.div initial={false} animate={{ rotateY: open ? 180 : 0 }} transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }} style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
        {front}
        {back}
      </motion.div>
    </div>
  );
}

/** The picture as plain text, for "Copy summary". */
function summaryText(r, title) {
  const m = r.moved;
  const lines = [
    title,
    `${num(m.climbed)} climbed a level, ${num(m.slipped)} slipped, ${num(m.belowZero)} fell below zero, ${num(m.backAbove)} came back above zero.`,
    `Points: +${num(r.points.earned)} earned, −${num(r.points.lost)} lost.`,
    `Team that gained most: ${r.teams[0]?.name} (${signed(r.teams[0]?.net || 0)}); least: ${r.teams.at(-1)?.name} (${signed(r.teams.at(-1)?.net || 0)}).`,
    `Next: ${num(r.edge.nearUp)} one report from a level up; ${num(r.edge.nearSlip)} one click from a level down; ${num(r.edge.nearZero)} one click from going below zero.`,
  ];
  if (r.outlook) lines.push(`At this pace: ${num(r.outlook.strongNext)} at Phish Catcher or above in 30 days (${num(r.outlook.strongNow)} today).`);
  return lines.join('\n');
}

/**
 * The Big Picture, in the board's L shape: a colour tile top left naming what
 * it covers; what moved along the arm; the four cards below, and who is one
 * step from a change.
 */
export function BigPictureSheet({ r, campaign, isDark, shell }) {
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  const rgb = isDark ? '232,99,95' : '229,72,77';
  const reduce = useReducedMotion();
  const { CAP_W, CAP_H, L_GAP, L_R, FILLET, PASTEL_INK } = shell;
  const scopeKey = campaign ? campaign.id : 'org';
  const [state, setState] = useState({ scope: scopeKey, open: null });
  const open = state.scope === scopeKey ? state.open : null; // a new scope starts with every card closed
  const [copied, setCopied] = useState(false);
  const turn = (id) => setState({ scope: scopeKey, open: open === id ? null : id });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setState((s) => ({ ...s, open: null })); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const title = campaign ? `The big picture: ${campaign.name}` : 'The big picture: the organisation, last 30 days';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText(r, title));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const tokens = isDark
    ? { '--bp-accent': '#5EEAD4', '--bp-soft': 'rgba(94,234,212,0.14)', '--bp-ink': '#5EEAD4' }
    : { '--bp-accent': '#0F766E', '--bp-soft': '#D5F5F0', '--bp-ink': '#0F766E' };
  const m = r.moved;
  const ratio = m.slipped ? m.climbed / m.slipped : null;
  const moves = [
    { Icon: ArrowUpRight, tone: ink.good, value: m.climbed, label: 'climbed a level' },
    { Icon: ArrowDownRight, tone: ink.bad, value: m.slipped, label: 'slipped a level' },
    { Icon: TriangleAlert, tone: ink.bad, value: m.belowZero, label: 'fell below zero' },
    { Icon: RotateCcw, tone: ink.good, value: m.backAbove, label: 'came back above zero' },
  ];
  const next = [
    { Icon: Award, value: num(r.edge.nearUp), label: 'one report from a level up', note: 'A report is worth enough to lift them' },
    { Icon: ArrowDownRight, value: num(r.edge.nearSlip), label: 'one click from a level down', note: 'Just above their level’s floor' },
    { Icon: TriangleAlert, value: num(r.edge.nearZero), label: 'one click from below zero', note: 'Fewer points than a click costs' },
    r.outlook
      ? { Icon: TrendingUp, value: num(r.outlook.strongNext), label: 'at Phish Catcher or above', note: `In 30 days at this pace · ${num(r.outlook.strongNow)} today` }
      : { Icon: Coins, value: `+${num(r.points.earned)}`, label: 'points earned', note: `−${num(r.points.lost)} lost in this campaign` },
  ];
  const cards = cardsFor(r, campaign, ink, rgb);

  return (
    <div data-lb-reports={campaign ? 'campaign' : 'org'} style={{ ...tokens, flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...(isDark ? PASTEL_INK : null), position: 'absolute', top: 0, left: 0, width: CAP_W, height: CAP_H, zIndex: 2, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, background: 'var(--cap-reports)', borderRadius: L_R, overflow: 'hidden' }}>
        <div style={{ ...eyebrow, color: 'var(--t-reports)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {campaign ? <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A' }} /> : <Building2 size={12} strokeWidth={2.6} aria-hidden />}
          The big picture
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.16, color: 'var(--text)' }}>{campaign ? campaign.name : 'The organisation'}</div>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.35, maxWidth: 196 }}>
          {campaign ? `${campaign.type} · started ${campaign.started} · ${num(r.basis.people)} recipients` : `Last 30 days · ${r.basis.campaigns} campaigns · ${num(r.basis.population)} people on the board`}
        </div>
      </div>
      <svg aria-hidden width={FILLET} height={FILLET} viewBox={`0 0 ${FILLET} ${FILLET}`} style={{ position: 'absolute', top: CAP_H - L_R, left: CAP_W - L_R, zIndex: 1, display: 'block' }}>
        <path d={`M 0 ${FILLET} A ${FILLET} ${FILLET} 0 0 0 ${FILLET} 0 V ${FILLET} H 0 Z`} fill="var(--base)" />
      </svg>

      {/* the arm: what moved on the board */}
      <div data-bp-moved style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px', background: 'var(--base)', borderTop: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderRadius: `${L_R}px ${L_R}px 0 0` }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={eyebrow}>{campaign ? 'What this campaign did to the board' : 'What moved on the board'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginTop: 10 }}>
            {moves.map((x) => (
              <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span aria-hidden style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--track)', color: x.tone }}><x.Icon size={16} strokeWidth={2.6} /></span>
                <span style={{ minWidth: 0 }}>
                  <span className="vs-rank" style={{ display: 'block', fontSize: 24, fontWeight: 900, lineHeight: 1, color: 'var(--text)' }}>{num(x.value)}</span>
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.label}</span>
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text)', marginTop: 12 }}>
            {ratio === null ? 'Nobody slipped a level.' : ratio >= 1 ? `For every person who slipped a level, ${ratio.toFixed(1)} climbed one.` : `More slipped than climbed: ${(1 / ratio).toFixed(1)} slipped for every one who climbed.`}
          </div>
        </div>
        <button type="button" data-bp-copy onClick={copy} style={{ flexShrink: 0, alignSelf: 'flex-start', marginTop: 26, height: 34, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 14px', borderRadius: 10, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--text)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
          {copied ? <Check size={14} strokeWidth={2.8} aria-hidden /> : <Copy size={14} strokeWidth={2.4} aria-hidden />}
          {copied ? 'Copied' : 'Copy summary'}
        </button>
      </div>

      {/* the base: four questions, then who is one step from a change */}
      <div data-bp-body style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16, padding: '18px 24px 20px', background: 'var(--base)', borderLeft: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', borderRadius: `${L_R}px 0 ${L_R}px ${L_R}px` }}>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14 }}>
          {cards.map((c) => <Card key={`${scopeKey}-${c.id}`} c={c} reduce={reduce} open={open === c.id} onTurn={() => turn(c.id)} />)}
        </div>
        <div data-bp-next style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'auto repeat(4, minmax(0,1fr))', alignItems: 'center', padding: '12px 4px 0', borderTop: '1px solid var(--hair)' }}>
          <div style={{ ...eyebrow, paddingRight: 22, lineHeight: 1.5 }}>What can<br />happen next</div>
          {next.map((o, i) => (
            <div key={o.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderLeft: i ? '1px solid var(--hair)' : 'none', minWidth: 0 }}>
              <span aria-hidden style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--track)', color: 'var(--text)' }}><o.Icon size={15} strokeWidth={2.3} /></span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
                  <span className="vs-rank" style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>{o.value}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
                </span>
                <span style={{ display: 'block', ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.note}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Staff see this where colleagues see How to earn points: the last 30 days, in four lines. */
export function BigPictureTeaser({ r, isDark, onOpen }) {
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  const rows = [
    { Icon: ArrowUpRight, tone: ink.good, label: 'Climbed a level', value: r.moved.climbed },
    { Icon: ArrowDownRight, tone: ink.bad, label: 'Slipped a level', value: r.moved.slipped },
    { Icon: TriangleAlert, tone: ink.bad, label: 'Fell below zero', value: r.moved.belowZero },
    { Icon: Award, tone: 'var(--text)', label: 'One report from a level up', value: r.edge.nearUp },
  ];
  return (
    <div data-bp-teaser style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--rail)', border: '1px solid var(--hair)', borderRadius: 16, padding: '14px 16px' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>The big picture</span>
      <span style={{ ...small, marginTop: 2 }}>Last 30 days on the board</span>
      <div style={{ flex: 1, minHeight: 0, maxHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', marginTop: 6 }}>
        {rows.map((x) => (
          <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--hair)' }}>
            <span aria-hidden style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--track)', color: x.tone }}><x.Icon size={14} strokeWidth={2.6} /></span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 10.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.label}</span>
            <span className="vs-rank" style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>{num(x.value)}</span>
          </div>
        ))}
      </div>
      <button type="button" data-bp-open onClick={onOpen} style={{ marginTop: 10, alignSelf: 'stretch', height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--track)', color: 'var(--text)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
        Open the big picture <ArrowRight size={13} strokeWidth={2.6} aria-hidden />
      </button>
    </div>
  );
}

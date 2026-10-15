import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Award, Building2, Check, Copy, Gauge, Goal, Mail, MessageSquareQuote, Rocket, Search, Users, X } from 'lucide-react';

import { DIFFICULTY, RANKED, WHY, briefText, nextMove } from '../../services/nextMove';
import { REPORT_INK } from './reportInk';

// Next Move: the leaderboard's planning view for leaders and admins.
//
// The Dashboard already says how the programme is doing; this says what to do
// about it. It reads the campaigns and the board and writes the brief for the
// next campaign: who to send it to, which lure, which message style, how hard.
// Each answer is a card with its evidence. Click a card and it turns over to
// show the other options, ranked; pick one and the brief rewrites itself.
// Underneath, what running it could do on the board.
//
// Planned for the organisation (the last campaigns, everyone on the board) or
// as a follow-up to one campaign, which puts the people who clicked in it
// first.

const pc = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);
const num = (n) => Math.round(n).toLocaleString('en-US');

const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };

// The four questions, in the order the brief reads them.
const ASKS = [
  { key: 'who', n: 1, title: 'Who to target', Icon: Users },
  { key: 'what', n: 2, title: 'What to test', Icon: Mail },
  { key: 'how', n: 3, title: 'How to say it', Icon: MessageSquareQuote },
  { key: 'hard', n: 4, title: 'How hard', Icon: Gauge },
];

// An option's click rate against its comparison: a thin bar with a 4px end,
// and a tick where the average sits. Text in text colours, never the bar's.
function Meter({ label, value, avg, avgLabel = 'avg', ink, small = false }) {
  const max = Math.max(0.05, value, avg || 0) * 1.25;
  return (
    <div>
      {!small && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
          <span>{label}</span>
          <span style={{ whiteSpace: 'nowrap' }}>
            <strong style={{ color: 'var(--text)' }}>{pc(value)}</strong>
            {avg !== null && avg !== undefined && <> · {avgLabel} {pc(avg)}</>}
          </span>
        </div>
      )}
      <div role="img" aria-label={`${label} ${pc(value)}${avg ? `, ${avgLabel} ${pc(avg)}` : ''}`} style={{ position: 'relative', height: small ? 5 : 7 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(1, value / max) * 100}%`, background: ink.bad, borderRadius: '0 4px 4px 0' }} />
        </div>
        {avg !== null && avg !== undefined && (
          <span aria-hidden style={{ position: 'absolute', left: `calc(${Math.min(1, avg / max) * 100}% - 1px)`, top: -3, bottom: -3, width: 2, borderRadius: 1, background: 'var(--text)' }} />
        )}
      </div>
    </div>
  );
}

// Easy, Medium, Hard as three steps, the chosen one filled.
function Steps({ chosen, onPick }) {
  return (
    <div role={onPick ? 'radiogroup' : 'img'} aria-label={`Difficulty: ${chosen}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 3 }}>
      {['Easy', 'Medium', 'Hard'].map((d, i) => {
        const on = d === chosen;
        const Tag = onPick ? 'button' : 'span';
        return (
          <Tag
            key={d}
            {...(onPick ? { type: 'button', role: 'radio', 'aria-checked': on, onClick: () => onPick(d) } : null)}
            style={{
              height: 24, display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 800, cursor: onPick ? 'pointer' : 'default',
              border: 'none', borderRadius: i === 0 ? '8px 3px 3px 8px' : i === 2 ? '3px 8px 8px 3px' : 3,
              background: on ? 'var(--nm-accent)' : 'var(--track)', color: on ? 'var(--nm-on)' : 'var(--muted)',
            }}
          >
            {d}
          </Tag>
        );
      })}
    </div>
  );
}

// The front of a card: the answer, its evidence, and its measure.
function Front({ ask, option, ink, onTurn, open }) {
  const cohort = ask.key === 'who' && option.kind === 'cohort';
  return (
    <button
      type="button"
      inert={open}
      data-nm-card={ask.key}
      className="nm-card"
      onClick={onTurn}
      aria-expanded={open}
      aria-label={`${ask.title}: ${option.label}. See the other options`}
      style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: '16px 18px', borderRadius: 16, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)' }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden style={{ width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center', background: 'var(--nm-soft)', color: 'var(--nm-ink)', fontSize: 10.5, fontWeight: 900 }}>{ask.n}</span>
        <span style={eyebrow}>{ask.title}</span>
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={option.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, marginTop: 14 }}
        >
          <span className="vs-rank" style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.01em' }}>{option.label}</span>
          <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.45, color: 'var(--muted)', marginTop: 5 }}>{option.note}</span>
          {/* the one number behind the answer */}
          <span style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 0' }}>
            <span className="vs-rank" style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text)' }}>{option.hero.value}</span>
            <span style={{ fontSize: 10.5, fontWeight: 700, lineHeight: 1.4, marginTop: 6 }}>{option.hero.caption}</span>
          </span>
          <span>
            {ask.key === 'who' && !cohort && <Meter label="Click rate" value={option.value} avg={option.avg} ink={ink} />}
            {cohort && <span style={{ display: 'block', fontSize: 10, fontWeight: 600, lineHeight: 1.45, color: 'var(--muted)' }}>A second chance, while it is fresh</span>}
            {ask.key === 'what' && <Meter label="Click rate on this lure" value={option.value} avg={option.avg} avgLabel="all lures" ink={ink} />}
            {ask.key === 'how' && <Meter label="Click rate with this style" value={option.value} avg={option.avg} avgLabel="all styles" ink={ink} />}
            {ask.key === 'hard' && <Steps chosen={option.id} />}
          </span>
        </motion.span>
      </AnimatePresence>
      <span className="nm-turn" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 10, fontWeight: 800, color: 'var(--muted)' }}>
        Other options <ArrowRight size={12} strokeWidth={2.6} aria-hidden />
      </span>
    </button>
  );
}

// The back of a card: why the choice matters, and the options ranked.
function Back({ ask, options, chosen, ink, onPick, onClose, open, flat }) {
  const close = useRef(null);
  useEffect(() => { if (open) close.current?.focus(); }, [open]);
  const best = options[0]?.id;
  return (
    <div
      data-nm-back={ask.key}
      inert={!open}
      aria-hidden={!open}
      style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: flat ? 'none' : 'rotateY(180deg)', display: 'flex', flexDirection: 'column', padding: '14px 14px 12px 18px', borderRadius: 16, border: '1.5px solid var(--nm-accent)', background: 'var(--rail)', color: 'var(--text)', boxShadow: '0 12px 28px rgba(15,23,42,0.12)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ ...eyebrow, color: 'var(--nm-ink)' }}>{ask.title}</span>
        <button ref={close} type="button" onClick={onClose} aria-label="Close options" style={{ marginLeft: 'auto', width: 24, height: 24, display: 'grid', placeItems: 'center', borderRadius: 8, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>
          <X size={13} strokeWidth={2.6} />
        </button>
      </div>
      <p style={{ margin: '6px 4px 0 0', fontSize: 10.5, fontWeight: 700, lineHeight: 1.45, flexShrink: 0 }}>{WHY[ask.key]}</p>
      <p style={{ margin: '4px 0 10px', fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', flexShrink: 0 }}>{RANKED[ask.key]}</p>
      {ask.key === 'hard' ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Steps chosen={chosen} onPick={onPick} />
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, lineHeight: 1.45, color: 'var(--muted)' }}>{DIFFICULTY[chosen]}</p>
          <Mix mix={options[0].mix} best={best} />
        </div>
      ) : (
        <div className="lb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
          {options.map((o) => {
            const on = o.id === chosen;
            const cohort = o.kind === 'cohort';
            return (
              <button
                key={o.id}
                type="button"
                data-nm-option={o.id}
                aria-pressed={on}
                onClick={() => onPick(o.id)}
                className="nm-option"
                style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '14px minmax(0,1fr) 54px 30px', alignItems: 'center', gap: 8, textAlign: 'left', padding: '6px 6px', borderRadius: 9, border: 'none', cursor: 'pointer', background: on ? 'var(--nm-soft)' : 'transparent', color: 'var(--text)' }}
              >
                <span aria-hidden style={{ width: 14, height: 14, borderRadius: 999, display: 'grid', placeItems: 'center', border: on ? 'none' : '1.5px solid var(--hair)', background: on ? 'var(--nm-accent)' : 'transparent', color: 'var(--nm-on)' }}>
                  {on && <Check size={9} strokeWidth={3.4} />}
                </span>
                <span style={{ minWidth: 0, fontSize: 10.5, fontWeight: on ? 800 : 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {o.label}
                  {o.id === best && <span style={{ marginLeft: 6, fontSize: 8, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--nm-ink)' }}>Best</span>}
                </span>
                <Meter small label={o.label} value={cohort ? o.gave : o.value} avg={cohort ? null : o.avg} ink={ink} />
                <span style={{ fontSize: 9.5, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pc(cohort ? o.gave : o.value)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Where the audience's people stand, low to high: why the suggested difficulty.
function Mix({ mix, best }) {
  if (!mix) return <p style={{ margin: 'auto 0 0', fontSize: 10, fontWeight: 700, lineHeight: 1.45 }}>Suggested: {best}. They clicked last time, so start with signs they can spot.</p>;
  if (!mix.people) return <p style={{ margin: 'auto 0 0', fontSize: 10, fontWeight: 700, lineHeight: 1.45 }}>Suggested: {best}. No one from here is on the board yet.</p>;
  const parts = [
    { key: 'low', label: 'New or below zero', color: 'var(--nm-mix-1)' },
    { key: 'mid', label: 'Aware User, Safe Handler', color: 'var(--nm-mix-2)' },
    { key: 'high', label: 'Phish Catcher and up', color: 'var(--nm-mix-3)' },
  ];
  return (
    <div style={{ marginTop: 'auto' }}>
      <div style={{ ...eyebrow, marginBottom: 6 }}>Where their {mix.people} on the board stand</div>
      <div role="img" aria-label={parts.map((p) => `${pc(mix[p.key])} ${p.label}`).join(', ')} style={{ display: 'flex', gap: 2, height: 10 }}>
        {parts.filter((p) => mix[p.key] > 0).map((p, i, all) => (
          <span key={p.key} style={{ flex: mix[p.key], background: p.color, borderRadius: all.length === 1 ? 4 : i === 0 ? '4px 0 0 4px' : i === all.length - 1 ? '0 4px 4px 0' : 0 }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
        {parts.map((p) => (
          <span key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
            <span style={{ flex: 1 }}>{p.label}</span>
            <strong style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{pc(mix[p.key])}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

// One card that turns over (with reduced motion, it swaps instead).
function Card({ ask, m, ink, open, onTurn, onPick, reduce }) {
  const front = <Front ask={ask} option={m.choice[ask.key]} ink={ink} open={open} onTurn={onTurn} />;
  const back = <Back ask={ask} options={m[ask.key]} chosen={m.choice[ask.key].id} ink={ink} onPick={onPick} onClose={onTurn} open={open} flat={reduce} />;
  if (reduce) return <div style={{ position: 'relative', minWidth: 0, minHeight: 0 }}>{open ? back : front}</div>;
  return (
    <div style={{ position: 'relative', minWidth: 0, minHeight: 0, perspective: 1400 }}>
      <motion.div
        initial={false}
        animate={{ rotateY: open ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}
      >
        {front}
        {back}
      </motion.div>
    </div>
  );
}

// A word in the brief that came from a card: it fades in anew when the card changes.
const Pick = ({ children, n }) => (
  <motion.span
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.22 }}
    title={`From card ${n}`}
    style={{ display: 'inline-block', padding: '0 7px', borderRadius: 7, background: 'var(--nm-soft)', color: 'var(--nm-ink)', lineHeight: 1.45 }}
  >
    {children}
  </motion.span>
);

// "Credential theft" reads "credential theft" mid-sentence; "IT lure" stays.
const inline = (s) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const an = (s) => (/^([aeiou]|HR\b)/i.test(s) ? 'an' : 'a');

/**
 * Next Move, in the board's L shape: a colour tile top left naming what the
 * plan is for; the brief along the arm with its actions; the four cards below
 * and what the campaign could do on the board.
 */
export function NextMoveSheet({ items, board, focus, campaign, isDark, canStart, onStart, shell }) {
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  const reduce = useReducedMotion();
  const { CAP_W, CAP_H, L_GAP, L_R, FILLET, PASTEL_INK } = shell;
  const scopeKey = focus || 'org';
  const [state, setState] = useState({ scope: scopeKey, pick: {}, open: null });
  const current = state.scope === scopeKey ? state : { scope: scopeKey, pick: {}, open: null }; // a new scope starts fresh
  const { pick, open } = current;
  const m = useMemo(() => nextMove(items, board, { focus, pick }), [items, board, focus, pick]);
  const [copied, setCopied] = useState(false);

  const turn = (key) => setState({ ...current, open: open === key ? null : key });
  const choose = (key, id) => setState({ ...current, pick: { ...pick, [key]: id }, open: null });

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

  const c = m.choice;
  const title = campaign ? `Next move after ${campaign.name}` : 'Next move for the organisation';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(briefText(m, title));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const tokens = isDark
    ? { '--nm-accent': '#5EEAD4', '--nm-on': '#0F172A', '--nm-soft': 'rgba(94,234,212,0.14)', '--nm-ink': '#5EEAD4', '--nm-mix-1': '#0F766E', '--nm-mix-2': '#14B8A6', '--nm-mix-3': '#99F6E4' }
    : { '--nm-accent': '#0F766E', '--nm-on': '#FFFFFF', '--nm-soft': '#D5F5F0', '--nm-ink': '#0F766E', '--nm-mix-1': '#5EEAD4', '--nm-mix-2': '#14B8A6', '--nm-mix-3': '#0F766E' };
  const outcome = [
    { Icon: Users, value: num(m.outcome.audience), label: 'people get it', note: c.who.kind === 'cohort' ? 'Everyone who clicked last time' : `Everyone in ${c.who.label}` },
    { Icon: Award, value: num(m.outcome.oneReportAway), label: 'near a new level', note: 'One report would get them there' },
    { Icon: Goal, value: pc(m.outcome.goal), label: 'should report it', note: c.who.kind === 'cohort' ? 'None of them reported last time' : `${pc(m.outcome.lastReport)} did last time` },
    { Icon: Rocket, value: num(m.outcome.pointsOnOffer), label: 'points on offer', note: 'If everyone reports it' },
  ];

  return (
    <div data-lb-reports={campaign ? 'campaign' : 'org'} style={{ ...tokens, flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...(isDark ? PASTEL_INK : null), position: 'absolute', top: 0, left: 0, width: CAP_W, height: CAP_H, zIndex: 2, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, background: 'var(--cap-reports)', borderRadius: L_R, overflow: 'hidden' }}>
        <div style={{ ...eyebrow, color: 'var(--t-reports)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {campaign ? <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A' }} /> : <Building2 size={12} strokeWidth={2.6} aria-hidden />}
          {campaign ? 'Follow-up to' : 'Next move'}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.16, color: 'var(--text)' }}>{campaign ? campaign.name : 'The organisation'}</div>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.35, maxWidth: 196 }}>
          {campaign ? `${campaign.type} · started ${campaign.started}` : `From the last ${m.basis.campaigns} campaigns and ${num(m.basis.people)} people on the board`}
        </div>
      </div>
      <svg aria-hidden width={FILLET} height={FILLET} viewBox={`0 0 ${FILLET} ${FILLET}`} style={{ position: 'absolute', top: CAP_H - L_R, left: CAP_W - L_R, zIndex: 1, display: 'block' }}>
        <path d={`M 0 ${FILLET} A ${FILLET} ${FILLET} 0 0 0 ${FILLET} 0 V ${FILLET} H 0 Z`} fill="var(--base)" />
      </svg>

      {/* the arm: the brief in one sentence, and what to do with it */}
      <div data-nm-brief style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 28, padding: '0 28px', background: 'var(--base)', borderTop: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderRadius: `${L_R}px ${L_R}px 0 0` }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={eyebrow}>The brief</div>
          <p aria-live="polite" style={{ margin: '8px 0 0', fontSize: 17, fontWeight: 800, lineHeight: 1.6, letterSpacing: '-0.01em', color: 'var(--text)' }}>
            Send <Pick key={`1-${c.who.id}`} n={1}>{c.who.kind === 'cohort' ? 'everyone who clicked' : c.who.label}</Pick> {an(c.what.label)}
            {' '}<Pick key={`2-${c.what.id}`} n={2}>{inline(c.what.label)}</Pick> email that uses <Pick key={`3-${c.how.id}`} n={3}>{inline(c.how.label)}</Pick>,
            {' '}at {an(c.hard.label)} <Pick key={`4-${c.hard.id}`} n={4}>{inline(c.hard.label)}</Pick> level.
          </p>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginTop: 6 }}>
            Suggested from {m.basis.campaigns === 1 ? 'this campaign' : `${m.basis.campaigns} campaigns`} and the board. Click a card to change any part.
          </div>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, width: 176 }}>
          {canStart && (
            <button type="button" data-nm-start onClick={() => onStart(m)} style={{ height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 10, border: 'none', background: 'var(--ink)', color: 'var(--ink-on)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
              <Rocket size={14} strokeWidth={2.4} aria-hidden /> Start this campaign
            </button>
          )}
          <button type="button" data-nm-copy onClick={copy} style={{ height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 10, border: canStart ? '1px solid var(--hair)' : 'none', background: canStart ? 'transparent' : 'var(--ink)', color: canStart ? 'var(--text)' : 'var(--ink-on)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
            {copied ? <Check size={14} strokeWidth={2.8} aria-hidden /> : <Copy size={14} strokeWidth={2.4} aria-hidden />}
            {copied ? 'Copied' : 'Copy the brief'}
          </button>
        </div>
      </div>

      {/* the base: the four cards, then what it could do */}
      <div data-nm-body style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16, padding: '18px 24px 20px', background: 'var(--base)', borderLeft: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', borderRadius: `${L_R}px 0 ${L_R}px ${L_R}px` }}>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14 }}>
          {ASKS.map((ask) => (
            <Card key={`${scopeKey}-${ask.key}`} ask={ask} m={m} ink={ink} reduce={reduce} open={open === ask.key} onTurn={() => turn(ask.key)} onPick={(id) => choose(ask.key, id)} />
          ))}
        </div>
        <div data-nm-outcome style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'auto repeat(4, minmax(0,1fr))', alignItems: 'center', gap: 0, padding: '12px 4px 0', borderTop: '1px solid var(--hair)' }}>
          <div style={{ ...eyebrow, paddingRight: 22, lineHeight: 1.5 }}>If you<br />run it</div>
          {outcome.map((o, i) => (
            <div key={o.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', borderLeft: i ? '1px solid var(--hair)' : 'none', minWidth: 0 }}>
              <span aria-hidden style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--track)', color: 'var(--text)' }}><o.Icon size={15} strokeWidth={2.3} /></span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, minWidth: 0 }}>
                  <span className="vs-rank" style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>{o.value}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
                </span>
                <span style={{ display: 'block', fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.note}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- the rail -----------------------------------------------------------------

/**
 * A searchable list of campaigns for the rail. `meta(c)` is the second line;
 * with `org`, an Organisation row comes first.
 */
export function CampaignList({ campaigns, selected, onSelect, meta, isDark, tint, org, label }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q ? campaigns.filter((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)) : campaigns;
  const pick = (sel) => ({
    ...(sel && isDark ? { '--text': '#0F172A', '--muted': '#475569', '--track': 'rgba(15,23,42,0.08)' } : null),
    border: sel ? `1.5px solid ${tint.edge}` : '1px solid var(--hair)',
    background: sel ? (isDark ? '#FFFFFF' : tint.fill) : 'var(--rail)',
    boxShadow: sel ? `0 4px 12px ${tint.glow}` : 'none',
  });
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, padding: '2px 4px 6px' }}>
        <span style={{ ...eyebrow, fontSize: 9 }}>{label}</span>
      </div>
      <label style={{ flexShrink: 0, position: 'relative', display: 'block', margin: '0 4px 8px 0' }}>
        <span className="sr-only">Search campaigns</span>
        <Search size={13} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${campaigns.length} campaigns`}
          style={{ width: '100%', boxSizing: 'border-box', height: 32, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)', padding: '0 10px 0 30px', fontSize: 10.5, fontWeight: 600, outline: 'none' }}
        />
      </label>
      <div className="lb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px 12px 0' }}>
        {org && !q && (
          <button type="button" onClick={() => onSelect('org')} aria-pressed={selected === 'org'} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '9px 12px', color: 'var(--text)', ...pick(selected === 'org') }}>
            <span aria-hidden style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--track)', color: 'var(--text)' }}><Building2 size={14} strokeWidth={2.4} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800 }}>{org.title}</span>
              <span style={{ display: 'block', fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' }}>{org.sub}</span>
            </span>
          </button>
        )}
        {org && !q && <div style={{ ...eyebrow, fontSize: 8.5, padding: '6px 4px 0' }}>{org.listLabel}</div>}
        {shown.map((c) => {
          const sel = c.id === selected;
          return (
            <button key={c.id} type="button" onClick={() => onSelect(c.id)} aria-pressed={sel} style={{ flexShrink: 0, textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '8px 12px', color: 'var(--text)', ...pick(sel) }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 800, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
              </span>
              <span style={{ display: 'block', marginTop: 3, paddingLeft: 14, fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta(c)}</span>
            </button>
          );
        })}
        {!shown.length && <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', padding: '10px 4px' }}>No campaign matches “{query}”.</div>}
      </div>
    </div>
  );
}

/** Staff see this where colleagues see How to earn points: the next move, in four lines. */
export function NextMoveTeaser({ m, isDark, onOpen }) {
  const c = m.choice;
  const rows = [
    { Icon: Users, label: 'Who', value: c.who.label },
    { Icon: Mail, label: 'What', value: c.what.label },
    { Icon: MessageSquareQuote, label: 'How', value: c.how.label },
    { Icon: Gauge, label: 'Level', value: c.hard.label },
  ];
  const accent = isDark ? '#5EEAD4' : '#0F766E';
  return (
    <div data-nm-teaser style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--rail)', border: '1px solid var(--hair)', borderRadius: 16, padding: '14px 16px' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Your next move</span>
      <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', marginTop: 2 }}>Suggested from the last {m.basis.campaigns} campaigns</span>
      <div style={{ flex: 1, minHeight: 0, maxHeight: 240, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', marginTop: 6 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--hair)' }}>
            <span aria-hidden style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 9, display: 'grid', placeItems: 'center', background: isDark ? 'rgba(94,234,212,0.14)' : '#D5F5F0', color: accent }}><r.Icon size={14} strokeWidth={2.4} /></span>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', width: 38, flexShrink: 0 }}>{r.label}</span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{r.value}</span>
          </div>
        ))}
      </div>
      <button type="button" data-nm-open onClick={onOpen} style={{ marginTop: 10, alignSelf: 'stretch', height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--track)', color: 'var(--text)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
        Open the brief <ArrowRight size={13} strokeWidth={2.6} aria-hidden />
      </button>
    </div>
  );
}

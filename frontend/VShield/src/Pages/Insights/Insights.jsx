import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ChevronRight, Copy, FileText, LayoutGrid, Mail, MousePointerClick, Timer, GraduationCap } from 'lucide-react';

import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from '../../services/sampleCampaigns';
import { campaignReport } from '../../services/sampleReports';
import { insights, standsOut } from '../../services/insights';
import { insightsBook, insightsSummary } from '../../services/insightsExport';
import { downloadXlsx, xlsxName } from '../../services/xlsx';
import { ExportMenu } from '../Leaderboard/BigPicture';
import { REPORT_INK } from '../Leaderboard/reportInk';
import { TONE_ART, TONE_TINT } from '../Leaderboard/bigPictureArt';
import dashboardData from '../DashboardAndAnalytics/dashboardData.json';
import ClayAttention from '../../assets/LeaderboardAssets/ClayAttention.png';
import ClayGoingWell from '../../assets/LeaderboardAssets/ClayGoingWell.png';
import ClayNext from '../../assets/LeaderboardAssets/ClayNext.png';
import ClayTrendFlat from '../../assets/LeaderboardAssets/ClayTrendFlat.png';
import { Barcode, Card, DotMatrix, GoTo, LureColumns, Segmented, TrendChart } from './InsightsCharts';
import { Delta, LearningTab, LuresTab, ResponseTab } from './InsightsTabs';
import { EASE, HEALTH_RULE, STEADY_INK, change, eyebrow, healthInk, num, pc, pc1, small, swap, times } from './insightsUi';

// =============================================================================
// Insights: how the phishing programme itself is doing.
//
// The Big Picture (on the Leaderboard) is about people: who, where, which
// level. Insights is about the programme: which lures fool people, how fast
// the organisation spots them, and whether the learning sticks. So nothing
// here repeats it: no risk scores, no departments, no people.
//
// The Leaderboard's sheet, in its L shape: the programme's health sits in the
// colour tile in the corner, its clay shield beside it; along the arm, the
// period (30, 60 or 90 days), the tabs and Export, over four measures, each
// with its change on the period before and a tick for every campaign; below,
// a bento of cards. The overview: the trend, the lures, the response, every
// campaign, what stands out, the learning; the other tabs go deeper into
// each. Every card leads somewhere; what changes moves, and nothing moves
// for those who ask for less. It reports; it never says what to do.
// =============================================================================

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&display=swap');
  .ins-page { font-family: 'Inter', system-ui, sans-serif; }

  /* Cards settle on hover; rows, columns and pills light up */
  .ins-card { transition: box-shadow .25s ease, border-color .25s ease; }
  .ins-card:hover { box-shadow: var(--lift); border-color: var(--hair-strong) !important; }
  .ins-row, .ins-go, .ins-find { transition: background .15s ease, border-color .15s ease; }
  .ins-row:hover, .ins-go:hover, .ins-find:hover { background: var(--track) !important; }
  .ins-find .ins-arrow { transition: transform .2s ease, color .2s ease; }
  .ins-find:hover .ins-arrow { transform: translateX(3px); color: var(--text) !important; }
  .ins-col .ins-track { transition: background .2s ease; }
  .ins-col:hover .ins-track { background: var(--track) !important; }
  .ins-row:focus-visible, .ins-go:focus-visible, .ins-find:focus-visible, .ins-col:focus-visible, .ins-spot button:focus-visible, [data-ins-dots]:focus-visible, [data-ins-option]:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }

  /* The clay pieces float, very slowly */
  @keyframes ins-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-5px) rotate(1deg); } }
  .ins-float { animation: ins-float 7s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .ins-card, .ins-row, .ins-go, .ins-find, .ins-find .ins-arrow, .ins-col .ins-track { transition: none !important; }
    .ins-float { animation: none !important; }
  }
`;

// The Leaderboard's sheet: a colour tile in the corner, the sheet wrapping
// round it in an L with a small even gap and a concave corner.
const CAP_W = 300;
const CAP_H = 156;
const L_GAP = 7;
const L_R = 16;
const FILLET = L_R + L_GAP;
// The tile keeps its pastel in dark mode, so its words take the light theme's ink.
const PASTEL_INK = { '--text': '#0F172A', '--muted': '#475569', '--chip': 'rgba(255,255,255,0.72)', '--track': 'rgba(15,23,42,0.08)' };

const TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutGrid },
  { id: 'lures', label: 'Lures', Icon: MousePointerClick },
  { id: 'response', label: 'Response', Icon: Timer },
  { id: 'learning', label: 'Learning', Icon: GraduationCap },
];
const PERIODS = [
  { id: 30, label: '30 days', title: 'Monthly: the last 30 days' },
  { id: 60, label: '60 days', title: 'Every two months: the last 60 days' },
  { id: 90, label: '90 days', title: 'Quarterly: the last 90 days' },
];

// The training programme's figures: the sample the old analytics page showed,
// until the training API reports them.
const TRAINING = {
  funnel: dashboardData.funnelData.map(({ name, value }) => ({ name, value })),
  programmes: dashboardData.trainingPrograms,
};
const FRESH = { lure: null, lurePage: 0, campaign: null, show: 'all', sort: 'newest', page: 0, progPage: 0 };

// A number that counts to its new value when the period changes.
function useTween(target, reduce, ms = 700) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    if (reduce || !Number.isFinite(target)) return undefined;
    const from = Number.isFinite(cur.current) ? cur.current : target;
    const start = performance.now();
    let raf = 0;
    const step = (t) => {
      const k = Math.min(1, (t - start) / ms);
      const x = from + (target - from) * (1 - (1 - k) ** 4);
      cur.current = x;
      setV(x);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce, ms]);
  return reduce || !Number.isFinite(target) ? target : v;
}
function Count({ value, format, reduce }) {
  return format(useTween(value, reduce));
}

// The corner tile: the programme's health, in its own colour, with its clay
// piece; reports for every click and its change; reports against clicks.
const HEALTH_LOOK = {
  Protected: { art: ClayGoingWell, tile: 'linear-gradient(140deg,#CFF3E6 0%,#E6FAF2 55%,#F2FCF8 100%)', glow: 'rgba(13,148,136,0.16)' },
  Holding: { art: ClayTrendFlat, tile: 'linear-gradient(140deg,#E3E1FF 0%,#EFEEFF 55%,#F7F6FF 100%)', glow: 'rgba(99,102,241,0.16)' },
  Exposed: { art: ClayAttention, tile: 'linear-gradient(140deg,#FFD9D6 0%,#FFE9E7 55%,#FFF4F3 100%)', glow: 'rgba(229,72,77,0.16)' },
};
function HealthTile({ m, ink, reduce }) {
  const n = m.now;
  const h = n.health;
  const look = HEALTH_LOOK[h?.word] || HEALTH_LOOK.Holding;
  const share = h && h.reportRate + h.clickRate > 0 ? h.reportRate / (h.reportRate + h.clickRate) : 0.5;
  const d = change(n.perClick, m.before?.perClick, { kind: 'times', better: 'up' });
  return (
    <div data-ins-health={h?.word || 'none'} title={HEALTH_RULE} style={{ ...PASTEL_INK, position: 'absolute', top: 0, left: 0, zIndex: 2, width: CAP_W, height: CAP_H, boxSizing: 'border-box', padding: '15px 18px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: L_R, overflow: 'hidden', background: look.tile, transition: 'background .4s ease' }}>
      <span aria-hidden style={{ position: 'absolute', right: -40, top: -40, width: 170, height: 170, borderRadius: 999, background: `radial-gradient(closest-side, ${look.glow}, transparent)` }} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.img key={h?.word} className="ins-float" src={look.art} alt="" aria-hidden width={78} height={78} initial={{ opacity: 0, scale: reduce ? 1 : 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reduce ? 1 : 0.7 }} transition={{ duration: 0.35, ease: EASE }} style={{ position: 'absolute', right: 14, top: 18, objectFit: 'contain', filter: 'drop-shadow(0 10px 14px rgba(15,23,42,0.14))' }} />
      </AnimatePresence>
      <div style={{ position: 'relative' }}>
        <div style={{ ...eyebrow, color: '#334155' }}>Programme health · last {m.basis.days} days</div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={h?.word} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -6 }} transition={{ duration: 0.25, ease: EASE }} className="vs-rank" style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1, marginTop: 9, color: 'var(--text)' }}>
            {h?.word || '—'}
          </motion.div>
        </AnimatePresence>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#334155' }}><strong style={{ color: 'var(--text)' }}><Count value={n.perClick} format={times} reduce={reduce} /></strong> reports for every click</span>
          <Delta c={d} ink={ink} title={`Against the ${m.basis.days} days before`} />
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <span aria-hidden style={{ height: 6, display: 'flex', gap: 2, borderRadius: 999, overflow: 'hidden' }}>
          <motion.span initial={false} animate={{ width: `${share * 100}%` }} transition={{ duration: reduce ? 0 : 0.7, ease: EASE }} style={{ flexShrink: 0, background: ink.good }} />
          <span style={{ flex: 1, background: ink.bad }} />
        </span>
        <span style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, fontWeight: 700, color: '#475569' }}>
          <span>Reported <strong style={{ color: 'var(--text)' }}>{pc(h?.reportRate)}</strong> of emails</span>
          <span>Clicked <strong style={{ color: 'var(--text)' }}>{pc(h?.clickRate)}</strong></span>
        </span>
      </div>
    </div>
  );
}

// One measure along the arm: its name and change, its number, and a tick
// for every campaign in the period (the newest marked).
function Kpi({ k, i, ink, reduce, days }) {
  return (
    <motion.div data-ins-kpi={k.id} title={k.hint} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : 0.05 * i, ease: EASE }} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px 14px 10px', borderRadius: 14, background: 'var(--plate)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...eyebrow, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</span>
        <span style={{ marginLeft: 'auto' }}><Delta c={k.delta} ink={ink} title={`Against the ${days} days before`} /></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap' }}>
          <span className="vs-rank" style={{ fontSize: 25, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.025em', color: 'var(--text)' }}><Count value={k.value} format={k.format} reduce={reduce} /></span>
          <span style={{ ...small, fontSize: 9.5 }}>{k.unit}</span>
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex' }}><Barcode values={k.spark} color={k.color} reduce={reduce} height={34} label={`${k.label} for each campaign, oldest to newest`} /></span>
      </div>
    </motion.div>
  );
}

// The dark card: the response in one big number at a time, turning over on
// its own every few seconds (and holding still while you look at it).
function Spotlight({ m, ink, reduce, isDark, onOpen, i }) {
  const n = m.now;
  const facts = [
    { id: 'first', label: 'First report', value: n.firstReport, unit: 'min', format: (v) => (Number.isFinite(v) ? `${Math.round(v)}` : '—'), sub: 'From the send to the first report, in the middle campaign', d: change(n.firstReport, m.before?.firstReport, { kind: 'min', better: 'down' }) },
    { id: 'beat', label: 'Reported before a click', value: n.beatClick, unit: `of ${n.campaigns}`, format: (v) => `${Math.round(v)}`, sub: 'Campaigns spotted early enough to pull the email', d: null },
    { id: 'half', label: 'Half the reports in', value: n.halfReported, unit: 'min', format: (v) => (Number.isFinite(v) ? `${Math.round(v)}` : '—'), sub: 'Until half of all the reports had come in', d: change(n.halfReported, m.before?.halfReported, { kind: 'min', better: 'down' }) },
  ];
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (reduce || held) return undefined;
    const t = setTimeout(() => setAt((x) => (x + 1) % facts.length), 6000);
    return () => clearTimeout(t);
  }, [at, held, reduce, facts.length]);
  const f = facts[at];
  const fg = isDark ? '#0F172A' : '#FFFFFF';
  const dim = isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.58)';
  return (
    <motion.section
      className="ins-spot"
      data-ins-spot={f.id}
      aria-label="The response"
      initial={{ opacity: 0, y: reduce ? 0 : 10, filter: reduce ? 'none' : 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: reduce ? 0.01 : 0.5, delay: reduce ? 0 : 0.05 * i, ease: EASE }}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      style={{ gridColumn: 'span 3', position: 'relative', minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 18px 16px', borderRadius: 16, color: fg, background: isDark ? 'radial-gradient(120% 80% at 100% 0%, #E0E7FF 0%, #FFFFFF 55%)' : 'radial-gradient(120% 85% at 100% 0%, #2B2F6B 0%, #111217 52%, #0A0A0C 100%)' }}
    >
      <span aria-hidden style={{ position: 'absolute', left: -60, bottom: -80, width: 220, height: 220, borderRadius: 999, background: `radial-gradient(closest-side, ${isDark ? 'rgba(13,148,136,0.18)' : 'rgba(22,163,148,0.22)'}, transparent)` }} />
      <img className="ins-float" src={ClayNext} alt="" aria-hidden width={58} height={58} style={{ position: 'absolute', right: 14, top: 14, objectFit: 'contain', filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.35))' }} />
      <span style={{ position: 'relative', ...eyebrow, color: dim }}>The response</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={f.id} initial={{ opacity: 0, y: reduce ? 0 : 18, filter: reduce ? 'none' : 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: reduce ? 0 : -18, filter: reduce ? 'none' : 'blur(8px)' }} transition={{ duration: reduce ? 0.1 : 0.45, ease: EASE }} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span style={{ fontSize: 12.5, fontWeight: 800 }}>{f.label}</span>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
            <span className="vs-rank" style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em' }}><Count value={f.value} format={f.format} reduce={reduce} /></span>
            <span className="vs-rank" style={{ fontSize: 18, fontWeight: 900, color: dim }}>{f.unit}</span>
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.45, marginTop: 6, color: dim, maxWidth: 220 }}>{f.sub}</span>
          {f.d && <span style={{ marginTop: 8, '--chip': isDark ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.10)', '--text': fg }}><Delta c={f.d} ink={ink} title={`Against the ${m.basis.days} days before`} /></span>}
        </motion.div>
      </AnimatePresence>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" data-ins-spot-open onClick={onOpen} style={{ height: 30, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 12px', borderRadius: 999, border: 'none', background: fg, color: isDark ? '#FFFFFF' : '#0A0A0C', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
          See the response <ArrowUpRight size={13} strokeWidth={2.6} aria-hidden />
        </button>
        <span role="tablist" aria-label="Facts" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          {facts.map((x, k) => (
            <button key={x.id} type="button" role="tab" aria-selected={k === at} aria-label={x.label} onClick={() => setAt(k)} style={{ position: 'relative', width: k === at ? 22 : 7, height: 7, padding: 0, border: 'none', borderRadius: 999, background: isDark ? 'rgba(15,23,42,0.18)' : 'rgba(255,255,255,0.26)', overflow: 'hidden', cursor: 'pointer', transition: 'width .35s cubic-bezier(.22,1,.36,1)' }}>
              {k === at && <motion.span key={`${at}-${held}`} initial={{ width: reduce || held ? '100%' : '0%' }} animate={{ width: '100%' }} transition={{ duration: reduce || held ? 0 : 6, ease: 'linear' }} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999, background: fg }} />}
            </button>
          ))}
        </span>
      </div>
    </motion.section>
  );
}

// What stands out: a short list, each with its clay piece, its sentence, its
// number on a chip, and where it leads.
const TONE_DOT = { bad: 'bad', good: 'good', watch: null };
function StandsOut({ list, ink, isDark, reduce, onOpen, i }) {
  const tint = isDark ? TONE_TINT.dark : TONE_TINT.light;
  return (
    <Card i={i} reduce={reduce} title="What stands out" sub={`In the last ${list.days} days`} style={{ gridColumn: 'span 4' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 6 }}>
        {list.items.map((f, k) => (
          <motion.button
            key={f.id}
            type="button"
            className="ins-find"
            data-ins-finding={f.id}
            onClick={() => onOpen(f)}
            initial={{ opacity: 0, x: reduce ? 0 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : 0.25 + 0.06 * k, ease: EASE }}
            style={{ flex: '1 1 0', minHeight: 0, maxHeight: 54, display: 'grid', gridTemplateColumns: '34px minmax(0,1fr) auto 14px', alignItems: 'center', gap: 10, padding: '0 8px', margin: '0 -8px', border: 'none', borderTop: k ? '1px solid var(--hair)' : '1px solid transparent', borderRadius: 10, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
          >
            <span aria-hidden style={{ width: 34, height: 34, borderRadius: 999, display: 'grid', placeItems: 'center', background: tint[f.tone].wash, border: `1px solid ${tint[f.tone].edge}` }}>
              <img src={TONE_ART[f.tone]} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 800, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</span>
              <span style={{ display: 'block', ...small, fontSize: 9, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.sub}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px', borderRadius: 999, background: 'var(--chip)', fontSize: 9.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
              <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: TONE_DOT[f.tone] ? ink[TONE_DOT[f.tone]] : STEADY_INK }} />{f.chip}
            </span>
            <ChevronRight className="ins-arrow" size={14} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />
          </motion.button>
        ))}
      </div>
    </Card>
  );
}

// The learning, in brief: the learning moments after a click, and how far
// assigned training gets.
function LearningCard({ m, ink, reduce, onOpen, i }) {
  const n = m.now;
  const first = TRAINING.funnel[0]?.value || 0;
  const steps = TRAINING.funnel.slice(1);
  const needs = TRAINING.programmes.filter((p) => p.status === 'Needs Work').length;
  return (
    <Card i={i} reduce={reduce} title="Does the learning stick" action={<GoTo label="Learning" onClick={onOpen} data-ins-go="learning" />} style={{ gridColumn: 'span 3' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <span className="vs-rank" style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.025em' }}><Count value={n.learned === null ? null : n.learned * 100} format={(v) => (Number.isFinite(v) ? `${Math.round(v)}%` : '—')} reduce={reduce} /></span>
        <Delta c={change(n.learned, m.before?.learned, { kind: 'pct', better: 'up' })} ink={ink} title={`Against the ${m.basis.days} days before`} />
      </div>
      <span style={{ ...small, marginTop: 6, lineHeight: 1.4 }}>of those who clicked finished the training that followed: <strong style={{ color: 'var(--text)' }}>{num(n.trained)}</strong> of {num(n.clicked)} people</span>
      <span aria-hidden style={{ display: 'block', height: 8, marginTop: 10, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
        <motion.span initial={{ width: reduce ? pc(n.learned) : '0%' }} animate={{ width: pc(n.learned) }} transition={{ duration: reduce ? 0 : 0.9, delay: reduce ? 0 : 0.3, ease: EASE }} style={{ display: 'block', height: '100%', borderRadius: 999, background: ink.good }} />
      </span>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 9, marginTop: 12 }}>
        <span style={{ ...eyebrow, fontSize: 8 }}>All assigned training</span>
        {steps.map((s) => (
          <div key={s.name} style={{ display: 'grid', gridTemplateColumns: '70px minmax(0,1fr) 34px', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{s.name}</span>
            <span aria-hidden style={{ height: 4, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
              <motion.span initial={{ width: reduce ? `${(s.value / first) * 100}%` : 0 }} animate={{ width: `${(s.value / first) * 100}%` }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.4, ease: EASE }} style={{ display: 'block', height: '100%', borderRadius: 999, background: 'var(--muted)' }} />
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pc(first ? s.value / first : null)}</span>
          </div>
        ))}
        <span style={{ ...small, fontSize: 9.5 }}><strong style={{ color: 'var(--text)' }}>{needs}</strong> {needs === 1 ? 'programme needs' : 'programmes need'} work</span>
      </div>
    </Card>
  );
}

const Insights = () => {
  const { isDark } = useUserType() || {};
  const reduce = useReducedMotion();
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const [view, setView] = useState(FRESH);

  // Sample campaigns (and those that ended before them) until the reports API lists real ones.
  const items = useMemo(() => [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((c) => ({ campaign: c, report: campaignReport(c, { depts: DEPTS, personAt: person }) })), []);
  const m = useMemo(() => insights(items, { days }), [items, days]);
  const list = useMemo(() => standsOut(m), [m]);
  const oldestFirst = useMemo(() => [...m.campaigns].reverse(), [m]);

  const go = (id, patch = {}) => { setTab(id); setView({ ...FRESH, ...patch }); };
  const patchView = (patch) => setView((v) => ({ ...v, ...patch }));
  const openFinding = (f) => go(f.view, f.view === 'lures' ? { lure: f.focus } : { campaign: f.focus, page: null });

  const n = m.now;
  const b = m.before;
  const kpis = [
    { id: 'hooked', label: 'Hook Rate', value: n.hooked === null ? null : n.hooked * 100, format: (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : '—'), unit: 'clicked', delta: change(n.hooked, b?.hooked, { kind: 'pct', better: 'down' }), spark: oldestFirst.map((c) => c.hooked), color: ink.bad, hint: 'Clicked, of the emails delivered' },
    { id: 'reported', label: 'Report Rate', value: n.reportRate === null ? null : n.reportRate * 100, format: (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : '—'), unit: 'reported', delta: change(n.reportRate, b?.reportRate, { kind: 'pct', better: 'up' }), spark: oldestFirst.map((c) => c.reportRate), color: ink.good, hint: 'Reported, of the emails delivered' },
    { id: 'first', label: 'First report', value: n.firstReport, format: (v) => (Number.isFinite(v) ? `${Math.round(v)}` : '—'), unit: 'min', delta: change(n.firstReport, b?.firstReport, { kind: 'min', better: 'down' }), spark: oldestFirst.map((c) => c.firstReport), color: 'var(--text)', hint: 'Minutes from the send to the first report, in the middle campaign' },
    { id: 'delivered', label: 'Emails delivered', value: n.delivered, format: num, unit: `${pc1(n.deliveryRate)} of sent`, delta: null, spark: oldestFirst.map((c) => c.delivered), color: 'var(--text)', hint: 'Emails that reached an inbox, campaign by campaign' },
  ];

  const title = 'Insights';
  const exportItems = [
    { id: 'report', Icon: FileText, label: 'Full report', meta: 'Excel', run: () => downloadXlsx(xlsxName('insights', `last ${days} days`), insightsBook(m, list, TRAINING, { title: `${title} · last ${days} days` })) },
    { id: 'copy', Icon: Copy, label: 'Copy a summary', doneLabel: 'Copied', apart: true, run: () => navigator.clipboard?.writeText(insightsSummary(m, list, title)).catch(() => {}) },
  ];

  const vars = isDark
    ? { '--bg': 'transparent', '--base': '#1C1E24', '--text': '#F1F5F9', '--muted': '#9AA6B2', '--hair': 'rgba(255,255,255,0.10)', '--hair-strong': 'rgba(255,255,255,0.18)', '--track': 'rgba(255,255,255,0.10)', '--tick': 'rgba(255,255,255,0.16)', '--grid': 'rgba(255,255,255,0.08)', '--band': 'rgba(165,180,252,0.10)', '--ink': '#F8FAFC', '--ink-on': '#0F172A', '--row': 'rgba(255,255,255,0.03)', '--row-hair': 'rgba(255,255,255,0.07)', '--plate': 'rgba(255,255,255,0.06)', '--chip': 'rgba(255,255,255,0.08)', '--sel': 'rgba(165,180,252,0.10)', '--sel-edge': 'rgba(165,180,252,0.45)', '--lift': '0 14px 30px rgba(0,0,0,0.35)', '--soft-bad': 'rgba(255,255,255,0.16)', '--soft-good': 'rgba(22,163,148,0.38)', '--bp-accent': '#5EEAD4' }
    : { '--bg': '#F1F4F8', '--base': '#FFFFFF', '--text': '#0F172A', '--muted': '#64748B', '--hair': 'rgba(15,23,42,0.07)', '--hair-strong': 'rgba(15,23,42,0.12)', '--track': '#EEF2F6', '--tick': '#D5DBE3', '--grid': 'rgba(15,23,42,0.06)', '--band': 'rgba(99,102,241,0.07)', '--ink': '#0F172A', '--ink-on': '#FFFFFF', '--row': '#FFFFFF', '--row-hair': 'rgba(15,23,42,0.08)', '--plate': '#F3F4F7', '--chip': '#F1F2F5', '--sel': '#F5F5FF', '--sel-edge': '#C7D2FE', '--lift': '0 14px 30px rgba(15,23,42,0.08)', '--soft-bad': 'rgba(229,72,77,0.30)', '--soft-good': 'rgba(13,148,136,0.30)', '--bp-accent': '#0F766E' };

  const body = {
    overview: (
      <div data-ins-overview style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gridTemplateRows: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }}>
        <Card i={0} reduce={reduce} title="Reports for every click" sub="A fortnight at a time over six months · 2× and above is Protected" style={{ gridColumn: 'span 5' }} data-ins-trend>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
            <TrendChart trend={m.trend} from={m.basis.from} end={m.basis.end} days={days} ink={ink} reduce={reduce} isDark={isDark} />
          </div>
        </Card>
        <Card i={1} reduce={reduce} title="What fools people" sub="Hook Rate by lure, the most convincing first" action={<GoTo label="Lures" onClick={() => go('lures')} data-ins-go="lures" />} style={{ gridColumn: 'span 4' }} data-ins-lures>
          <LureColumns lures={m.lures} ink={ink} reduce={reduce} onOpen={(lure) => go('lures', { lure })} />
        </Card>
        <Spotlight i={2} m={m} ink={ink} reduce={reduce} isDark={isDark} onOpen={() => go('response')} />
        <Card
          i={3}
          reduce={reduce}
          title="Campaign by campaign"
          sub="Reports for every click · a dot for each half"
          action={<span style={{ display: 'flex', gap: 12 }}>{['Protected', 'Holding', 'Exposed'].map((w) => <span key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 700, color: 'var(--text)' }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: healthInk(w, ink) }} />{w}</span>)}</span>}
          style={{ gridColumn: 'span 5' }}
          data-ins-campaigns
        >
          <DotMatrix campaigns={oldestFirst} ink={ink} reduce={reduce} onOpen={(campaign) => go('response', { campaign, page: null })} />
        </Card>
        <StandsOut i={4} list={{ items: list, days }} ink={ink} isDark={isDark} reduce={reduce} onOpen={openFinding} />
        <LearningCard i={5} m={m} ink={ink} reduce={reduce} onOpen={() => go('learning')} />
      </div>
    ),
    lures: <LuresTab m={m} view={view} onView={patchView} ink={ink} reduce={reduce} />,
    response: <ResponseTab m={m} view={view} onView={patchView} ink={ink} reduce={reduce} />,
    learning: <LearningTab m={m} training={TRAINING} view={view} onView={patchView} ink={ink} reduce={reduce} />,
  };

  return (
    <>
      <style>{FONT_IMPORT}</style>

      {/* Fills <main> exactly; nothing inside lets the page itself scroll. */}
      <div className="ins-page" data-ins-page={tab} style={{ ...vars, position: 'relative', background: 'var(--bg)', color: 'var(--text)', width: '100%', height: '100%', overflow: 'hidden', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* top black bar */}
        <div style={{ background: isDark ? '#FFFFFF' : '#000000', color: isDark ? '#000000' : '#FFFFFF', borderRadius: 12, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Insights</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', opacity: 0.72 }}>
            <Mail size={12} strokeWidth={2.4} aria-hidden /> The phishing programme · campaigns up to {m.campaigns[0]?.started}
          </span>
        </div>

        {/* the sheet, in its L */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <HealthTile m={m} ink={ink} reduce={reduce} />
          <svg aria-hidden width={FILLET} height={FILLET} viewBox={`0 0 ${FILLET} ${FILLET}`} style={{ position: 'absolute', top: CAP_H - L_R, left: CAP_W - L_R, zIndex: 1, display: 'block' }}>
            <path d={`M 0 ${FILLET} A ${FILLET} ${FILLET} 0 0 0 ${FILLET} 0 V ${FILLET} H 0 Z`} fill="var(--base)" />
          </svg>

          {/* the arm: the period, the tabs and Export; under them, four measures */}
          <div style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, boxSizing: 'border-box', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: `12px 16px ${L_GAP + 4}px 20px`, background: 'var(--base)', borderTop: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderRadius: `${L_R}px ${L_R}px 0 0` }}>
            <div style={{ flexShrink: 0, height: 30, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Segmented id="ins-period" label="Period" value={days} options={PERIODS} onChange={(d) => { setDays(d); setView((v) => ({ ...v, lurePage: 0, page: 0, campaign: null })); }} reduce={reduce} />
              <span style={{ ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.basis.campaigns} campaigns · changes against the {days} days before</span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Segmented id="ins-tab" label="Insights" value={tab} options={TABS} onChange={(id) => go(id)} reduce={reduce} tabs />
                <ExportMenu items={exportItems} />
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10 }}>
              {kpis.map((k, i) => <Kpi key={k.id} k={k} i={i} ink={ink} reduce={reduce} days={days} />)}
            </div>
          </div>

          {/* the base: the tab on show */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px 16px 16px', background: 'var(--base)', borderLeft: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', borderRadius: `${L_R}px 0 ${L_R}px ${L_R}px` }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} {...swap(reduce)} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                {body[tab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};

export default Insights;

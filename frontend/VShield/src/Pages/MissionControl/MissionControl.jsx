import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Copy, FileText, Rocket } from 'lucide-react';

import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { CAMPAIGNS, DEPTS, person } from '../../services/sampleCampaigns';
import { campaignReport } from '../../services/sampleReports';
import { missionControl, missionStory } from '../../services/missionControl';
import { missionBook, missionSummary } from '../../services/missionControlExport';
import { downloadXlsx, xlsxName } from '../../services/xlsx';
import { ExportMenu, PeriodPicker } from '../Leaderboard/BigPicture';
import { REPORT_INK } from '../Leaderboard/reportInk';
import { TONE_TINT } from '../Leaderboard/bigPictureArt';
import dashboardData from '../DashboardAndAnalytics/dashboardData.json';
import ReportsChart from '../../assets/LeaderboardAssets/ReportsChart.png';
import ClayAttention from '../../assets/LeaderboardAssets/ClayAttention.png';
import ClayGoingWell from '../../assets/LeaderboardAssets/ClayGoingWell.png';
import ClayNext from '../../assets/LeaderboardAssets/ClayNext.png';
import ClayTrendFlat from '../../assets/LeaderboardAssets/ClayTrendFlat.png';
import RocketArt from '../../assets/CampaignsAssets/OnGoingCampaignsImage.png';
import ChecklistArt from '../../assets/RequestAndApprovalsAssets/RequestQueueImage.png';
import { LearningLens, LuresLens, ResponseLens } from './MissionLenses';
import { EASE, HEALTH_RULE, eyebrow, healthInk, num, pc, slide, small, times } from './missionUi';

// =============================================================================
// Mission Control: how the phishing programme itself is doing.
//
// The Big Picture (on the Leaderboard) is about people: who, where, which
// level. Mission Control is about the programme: which lures fool people,
// how fast the organisation spots them, and whether the learning sticks. So
// nothing here repeats it: no risk scores, no departments, no people.
//
// It is built as the Leaderboard is, locked to the viewport:
//   - the rail: the programme's health (reports against clicks), the four
//     lenses as capsules, and how the lens on show is worked out;
//   - the sheet, in the board's L shape: a colour tile naming the lens; along
//     the arm, the Programme Pulse with its period (30, 60 or 90 days) and
//     Export; below, the lens: the overview's story in three chapters and
//     every campaign as a bar, or the lures, the response or the learning.
// Every finding, bar and row leads somewhere; lenses slide in the direction
// of travel. It reports; it never says what to do.
// =============================================================================

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&display=swap');
  .mc-page { font-family: 'Inter', system-ui, sans-serif; }

  /* Lens capsules pop a little on hover, as the Leaderboard's do */
  .mc-cap { transition: transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s ease, background-color .25s ease; }
  .mc-cap:hover { transform: scale(1.02); }
  .mc-cap:active { transform: scale(.97); }
  .mc-cap:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
  .mc-tile { transition: background-color .35s ease; }

  /* Findings and rows light up, their arrow nudges, on hover (the Big Picture's own) */
  .bp-finding, .bp-row { transition: background .15s ease; }
  .bp-finding:hover, .bp-row:hover { background: var(--track) !important; }
  .bp-finding .bp-go svg { transition: transform .2s ease; }
  .bp-finding:hover .bp-go svg { transform: translateX(3px); }
  .bp-finding:hover .bp-go { color: var(--text) !important; }
  .bp-finding:focus-visible, .bp-row:focus-visible, .mc-bar:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
  .mc-bar > span { transition: filter .15s ease; }
  .mc-bar:hover > span { filter: brightness(1.12); }

  @media (prefers-reduced-motion: reduce) {
    .mc-cap, .mc-tile, .bp-finding, .bp-finding svg, .bp-row, .mc-bar > span { transition: none !important; }
  }
`;

// The Leaderboard's shell: the title tile and the rail's top card share a
// height, and the sheet wraps round the tile in an L.
const HERO_H = 136;
const CAP_W = 224;
const CAP_H = HERO_H;
const L_GAP = 7;
const L_R = 16;
const FILLET = L_R + L_GAP;
// The title tile keeps its pastel in dark mode, so its words take the light theme's ink.
const PASTEL_INK = { '--text': '#0F172A', '--muted': '#475569' };

// The four lenses: what each is called, its clay art and its colours.
const LENSES = [
  { id: 'overview', label: 'Overview', title: 'The programme', sub: 'Everything at a glance', art: ReportsChart, cap: '#E0E7FF', ink: '#4F46E5', inkDark: '#A5B4FC' },
  { id: 'lures', label: 'The lures', title: 'The lures', sub: 'What fools people', art: ClayAttention, cap: '#FFE4E6', ink: '#BE123C', inkDark: '#FDA4AF', tone: 'bad' },
  { id: 'response', label: 'The response', title: 'The response', sub: 'How fast they’re spotted', art: ClayNext, cap: '#FFEFCE', ink: '#B45309', inkDark: '#FCD34D', tone: 'watch' },
  { id: 'learning', label: 'The learning', title: 'The learning', sub: 'Does the learning stick', art: ChecklistArt, cap: '#D8F3DC', ink: '#15803D', inkDark: '#86EFAC', tone: 'good' },
];
const LENS = Object.fromEntries(LENSES.map((l) => [l.id, l]));

// How each lens is worked out, in the rail under the capsules.
const MEASURES = {
  overview: [
    ['Programme health', 'Protected: 2 or more reports for every click. Holding: at least 1. Exposed: fewer reports than clicks.'],
    ['Reports per click', 'Emails reported for every email clicked.'],
    ['Learning moment', 'Someone who clicked, then finished the training that followed.'],
  ],
  lures: [
    ['Hook Rate', 'Clicked, of the emails delivered.'],
    ['Gave details', 'Of those who clicked, how many went on to enter details.'],
    ['Reported', 'Reported, of the emails delivered.'],
    ['Health', 'Reports against clicks, as for the whole programme.'],
  ],
  response: [
    ['First click, first report', 'Minutes from the send to the first of each.'],
    ['Report first', 'The first report came in before anyone clicked: early enough to pull the email.'],
    ['Half the reports in', 'Minutes until half of all its reports had come in.'],
  ],
  learning: [
    ['Learning moment', 'Of those who clicked, how many finished the training that followed.'],
    ['Completion', 'Completed, of the training assigned.'],
    ['Needs work', 'Under half of those assigned completed it.'],
  ],
};

// The training programme's figures: the sample the old analytics page showed,
// until the training API reports them.
const TRAINING = {
  funnel: dashboardData.funnelData.map(({ name, value }) => ({ name, value })),
  programmes: dashboardData.trainingPrograms,
};
const assigned = TRAINING.funnel[0]?.value || 0;
const completed = TRAINING.funnel.find((s) => s.name === 'Completed')?.value || 0;
const TRAINING_FIGURES = { completion: assigned ? completed / assigned : null, needsWork: TRAINING.programmes.filter((p) => p.status === 'Needs Work').length };

const FRESH = { lure: null, lureFocus: null, lurePage: 0, campaign: null, show: 'all', sort: 'newest', page: 0, progPage: 0 };

// A number that counts to its new value when the period changes.
function useTween(target, reduce, ms = 650) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    if (reduce || !Number.isFinite(target)) return undefined;
    const from = Number.isFinite(cur.current) ? cur.current : target;
    const start = performance.now();
    let raf = 0;
    const step = (t) => {
      const k = Math.min(1, (t - start) / ms);
      const x = from + (target - from) * (1 - (1 - k) ** 3);
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
  const v = useTween(value, reduce);
  return format(v);
}

// The rail's top card: the programme's health, from reports against clicks,
// with the two as a tug of war under it.
const HEALTH_LOOK = {
  Protected: { art: ClayGoingWell, tone: 'good', light: 'linear-gradient(135deg,#D9F6EC 0%,#EEFBF6 100%)', shadow: '0 8px 20px rgba(13,148,136,0.12)' },
  Holding: { art: ClayTrendFlat, tone: 'watch', light: 'linear-gradient(135deg,#ECEAFF 0%,#F6F5FF 100%)', shadow: '0 8px 20px rgba(99,102,241,0.12)' },
  Exposed: { art: ClayAttention, tone: 'bad', light: 'linear-gradient(135deg,#FFE2DF 0%,#FFF2F0 100%)', shadow: '0 8px 20px rgba(229,72,77,0.12)' },
};
function HealthCard({ m, ink, isDark, reduce }) {
  const p = m.pulse;
  const h = p.health;
  const look = HEALTH_LOOK[h?.word] || HEALTH_LOOK.Holding;
  const tint = TONE_TINT.dark[look.tone];
  const share = h && h.reportRate + h.clickRate > 0 ? h.reportRate / (h.reportRate + h.clickRate) : 0.5;
  return (
    <div data-mc-health={h?.word || 'none'} title={HEALTH_RULE} style={{ flexShrink: 0, height: HERO_H, boxSizing: 'border-box', marginBottom: 10, padding: '14px 16px 13px', borderRadius: L_R, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: isDark ? `${tint.wash}, var(--rail)` : look.light, border: `1px solid ${isDark ? tint.edge : 'transparent'}`, boxShadow: isDark ? 'none' : look.shadow }}>
      <div style={{ ...eyebrow, color: isDark ? 'var(--muted)' : '#475569' }}>Programme health · last {m.basis.days} days</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span aria-hidden style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.img key={h?.word} src={look.art} alt="" width={30} height={30} initial={{ scale: reduce ? 1 : 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: reduce ? 1 : 0.6, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} />
          </AnimatePresence>
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="vs-rank" style={{ display: 'block', fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text)' }}>{h?.word || '—'}</span>
          <span style={{ display: 'block', ...small, fontSize: 10, fontWeight: 700, marginTop: 5, color: isDark ? 'var(--muted)' : '#334155' }}>
            <strong style={{ color: 'var(--text)' }}><Count value={p.perClick} format={times} reduce={reduce} /></strong> reports for every click
          </span>
        </span>
      </div>
      <div>
        <span aria-hidden style={{ height: 7, display: 'flex', gap: 2, borderRadius: 999, overflow: 'hidden' }}>
          <motion.span initial={false} animate={{ width: `${share * 100}%` }} transition={{ duration: reduce ? 0 : 0.7, ease: EASE }} style={{ flexShrink: 0, background: ink.good }} />
          <span style={{ flex: 1, background: ink.bad }} />
        </span>
        <span style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, ...small, fontSize: 9, fontWeight: 700, color: isDark ? 'var(--muted)' : '#475569' }}>
          <span>Reported <strong style={{ color: 'var(--text)' }}>{pc(h?.reportRate)}</strong> of emails</span>
          <span>Clicked <strong style={{ color: 'var(--text)' }}>{pc(h?.clickRate)}</strong></span>
        </span>
      </div>
    </div>
  );
}

// A lens capsule in the rail: a switch with its clay art in the corner.
function LensCapsule({ l, on, isDark, onClick }) {
  return (
    <button
      type="button"
      className="mc-cap"
      aria-pressed={on}
      data-mc-lens={l.id}
      onClick={onClick}
      style={{ position: 'relative', overflow: 'hidden', flexShrink: 0, width: '100%', minHeight: 66, marginBottom: 8, padding: '12px 16px 13px', borderRadius: L_R, textAlign: 'left', cursor: 'pointer', border: on ? '1px solid transparent' : '1px solid var(--hair)', background: on ? (isDark ? '#FFFFFF' : l.cap) : 'var(--rail)', boxShadow: on ? '0 8px 18px rgba(15,23,42,0.10)' : 'none', color: 'var(--text)' }}
    >
      <div style={{ position: 'relative', fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em', color: on ? (isDark ? '#0F172A' : l.ink) : 'var(--text)' }}>{l.label}</div>
      <div style={{ position: 'relative', fontSize: 9.5, fontWeight: 600, marginTop: 3, color: on && isDark ? '#475569' : 'var(--muted)' }}>{l.sub}</div>
      <img src={l.art} alt="" aria-hidden style={{ position: 'absolute', right: -6, bottom: -8, width: 50, height: 50, objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }} />
    </button>
  );
}

// How the lens on show is worked out.
function HowRead({ lens, reduce }) {
  return (
    <div data-mc-measures style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: 2, padding: '14px 16px', borderRadius: L_R, border: '1px solid var(--hair)', background: 'var(--rail)' }}>
      <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>How it’s worked out</span>
      <span style={{ flexShrink: 0, ...small, marginTop: 2 }}>The measures on {LENS[lens].title.toLowerCase()}</span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.dl key={lens} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE }} style={{ margin: '8px 0 0', minHeight: 0 }}>
          {MEASURES[lens].map(([term, means]) => (
            <div key={term} style={{ padding: '8px 0', borderTop: '1px solid var(--hair)' }}>
              <dt style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text)' }}>{term}</dt>
              <dd style={{ margin: '2px 0 0', ...small, lineHeight: 1.45 }}>{means}</dd>
            </div>
          ))}
        </motion.dl>
      </AnimatePresence>
    </div>
  );
}

// Along the arm: the programme in five numbers, counting when the period changes.
function PulseStrip({ m, reduce }) {
  const p = m.pulse;
  const cells = [
    { id: 'delivered', label: 'Delivered', value: p.deliveryRate === null ? null : p.deliveryRate * 100, format: (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : '—'), sub: `${num(p.delivered)} emails`, hint: 'Emails that reached an inbox, of those sent' },
    { id: 'firstReport', label: 'First report', value: p.firstReport, format: (v) => (Number.isFinite(v) ? `${Math.round(v)} min` : '—'), sub: 'after the send', hint: 'Minutes from the send to the first report, in the middle campaign' },
    { id: 'beatClick', label: 'Reported before a click', value: p.beatClick, format: (v) => `${Math.round(v)}`, sub: `of ${p.campaigns} campaigns`, hint: 'Campaigns whose first report came in before anyone clicked' },
    { id: 'learned', label: 'Learning moments', value: p.learned === null ? null : p.learned * 100, format: (v) => (Number.isFinite(v) ? `${Math.round(v)}%` : '—'), sub: 'of clicks trained', hint: 'Of those who clicked, how many finished the training that followed' },
  ];
  return (
    <div data-mc-pulse style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) repeat(4, minmax(0,1fr))', alignItems: 'center', borderRadius: 14, background: 'var(--plate)' }}>
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 0 12px' }}>
        <span aria-hidden style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#E0E7FF' }}>
          <img src={RocketArt} alt="" width={28} height={28} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
            <span className="vs-rank" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--text)' }}><Count value={p.campaigns} format={num} reduce={reduce} /></span>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)' }}>{p.campaigns === 1 ? 'campaign' : 'campaigns'}</span>
          </span>
          <span style={{ display: 'block', ...small, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><Count value={p.sent} format={num} reduce={reduce} /> emails sent</span>
        </span>
      </div>
      {cells.map((c) => (
        <div key={c.id} data-mc-pulse-cell={c.id} title={c.hint} style={{ minWidth: 0, padding: '2px 16px', borderLeft: '1px solid var(--hair)' }}>
          <div style={{ ...eyebrow, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 5, whiteSpace: 'nowrap' }}>
            <span className="vs-rank" style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text)' }}><Count value={c.value} format={c.format} reduce={reduce} /></span>
            <span style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// One finding on the overview: its number and one line; it opens its lens.
function Item({ f, onOpen }) {
  return (
    <button
      type="button"
      className="bp-finding"
      data-mc-finding={f.id}
      onClick={onOpen}
      aria-label={`${f.value} ${f.headline}. ${f.sub}. Open ${LENS[f.view].title.toLowerCase()}`}
      style={{ position: 'relative', width: 'calc(100% + 24px)', boxSizing: 'border-box', minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '0 34px 0 12px', margin: '0 -12px', border: 'none', borderRadius: 12, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
    >
      <span className="vs-rank" style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{f.value}</span>
      <span style={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.3 }}>{f.headline}</span>
      <ChevronRight className="bp-go" size={16} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
    </button>
  );
}

// One chapter of the story: a tinted header with its lens's clay art, then
// its findings.
function Chapter({ l, items, isDark, onOpen, reduce, i }) {
  const t = (isDark ? TONE_TINT.dark : TONE_TINT.light)[l.tone];
  return (
    <motion.section aria-label={l.title} data-mc-chapter={l.id} initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : 0.06 * i, ease: EASE }} style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <header style={{ flexShrink: 0, height: 46, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderRadius: 12, background: t.wash, border: `1px solid ${t.edge}` }}>
        <img src={l.art} alt="" width={24} height={24} style={{ flexShrink: 0, objectFit: 'contain' }} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>{l.title}</span>
          <span style={{ display: 'block', ...small, marginTop: 1 }}>{l.sub}</span>
        </span>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 4px 0' }}>
        {items.length
          ? items.map((f, k) => (
            <div key={f.id} style={{ flexShrink: 0, height: 78, display: 'flex', alignItems: 'stretch', borderTop: k ? '1px solid var(--hair)' : 'none' }}>
              <Item f={f} onOpen={() => onOpen(f)} />
            </div>
          ))
          : <p style={{ ...small, fontSize: 10.5, margin: '14px 0 0' }}>Nothing stands out here.</p>}
      </div>
    </motion.section>
  );
}

// Every campaign in the period as a bar, oldest to newest: reports for every
// click, against the lines where health changes (1× and 2×). Each opens its
// race on the response lens.
function CampaignBars({ m, ink, reduce, onOpen }) {
  const rows = [...m.response].reverse();
  const top = Math.max(3, Math.ceil(Math.max(0, ...rows.map((c) => c.perClick || 0))));
  const [hover, setHover] = useState(null);
  const y = (v) => `${(Math.min(v || 0, top) / top) * 100}%`;
  const lines = Array.from({ length: top + 1 }, (_, k) => k);
  const tip = hover !== null ? rows[hover] : null;
  const legend = [['Protected', '2× or more'], ['Holding', '1× to 2×'], ['Exposed', 'under 1×']];
  return (
    <section aria-label="Campaign by campaign" data-mc-bars style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--hair)', borderRadius: 14, padding: '12px 16px 10px' }}>
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Campaign by campaign</span>
          <span style={{ display: 'block', ...small, marginTop: 2 }}>Reports for every click, oldest to newest · each opens its response</span>
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {legend.map(([word, rule]) => (
            <span key={word} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>
              <span aria-hidden style={{ width: 9, height: 9, borderRadius: 3, background: healthInk(word, ink) }} />
              {word} <span style={{ ...small, fontSize: 9.5 }}>{rule}</span>
            </span>
          ))}
        </span>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 8, marginTop: 12 }}>
        {/* the one axis: reports for every click */}
        <div aria-hidden style={{ position: 'relative', width: 22, flexShrink: 0 }}>
          {lines.map((v) => <span key={v} style={{ position: 'absolute', right: 0, bottom: y(v), transform: 'translateY(50%)', ...small, fontSize: 9, fontVariantNumeric: 'tabular-nums' }}>{v}×</span>)}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }} onMouseLeave={() => setHover(null)}>
          {lines.map((v) => <span key={v} aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: y(v), height: 0, borderTop: v === 1 || v === 2 ? '1px dashed var(--muted)' : '1px solid var(--hair)', opacity: v === 1 || v === 2 ? 0.45 : 1 }} />)}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'stretch', gap: 2 }}>
            {rows.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className="mc-bar"
                data-mc-bar={c.id}
                aria-label={`${c.name}, started ${c.started}: ${times(c.perClick)} reports for every click, ${c.health?.word}. See its response`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => onOpen(c.id)}
                style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0, border: 'none', borderRadius: 6, background: hover === i ? 'var(--track)' : 'transparent', cursor: 'pointer' }}
              >
                <motion.span
                  initial={{ scaleY: reduce ? 1 : 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: reduce ? 0 : 0.55, delay: reduce ? 0 : 0.15 + 0.015 * i, ease: EASE }}
                  style={{ display: 'block', width: '62%', maxWidth: 30, height: y(c.perClick), transformOrigin: 'bottom', borderRadius: '4px 4px 0 0', background: healthInk(c.health?.word, ink) }}
                />
              </button>
            ))}
          </div>
          {tip && (
            <div role="tooltip" data-mc-tip style={{ position: 'absolute', zIndex: 5, left: `${((hover + 0.5) / rows.length) * 100}%`, bottom: `calc(${y(tip.perClick)} + 10px)`, transform: `translateX(${hover / rows.length > 0.7 ? '-100%' : hover / rows.length < 0.3 ? '0' : '-50%'})`, pointerEvents: 'none', minWidth: 190, padding: '9px 11px', borderRadius: 10, background: 'var(--base)', border: '1px solid var(--hair)', boxShadow: '0 12px 28px rgba(15,23,42,0.16)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{tip.name}</div>
              <div style={{ ...small, marginTop: 2, whiteSpace: 'nowrap' }}>{tip.type} · started {tip.started}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7, fontSize: 10.5, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 3, background: healthInk(tip.health?.word, ink) }} />
                <strong>{times(tip.perClick)}</strong> reports per click · {tip.health?.word}
              </div>
              <div style={{ ...small, marginTop: 3, whiteSpace: 'nowrap' }}>Hook Rate {pc(tip.hooked)} · first report {tip.firstReport} min</div>
            </div>
          )}
        </div>
      </div>
      <div aria-hidden style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingLeft: 30, ...small, fontSize: 9 }}>
        <span>{rows[0]?.started}</span>
        <span>{rows[rows.length - 1]?.started}</span>
      </div>
    </section>
  );
}

const MissionControl = () => {
  const { isDark } = useUserType() || {};
  const reduce = useReducedMotion();
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  const [days, setDays] = useState(30);
  const [lens, setLens] = useState('overview');
  const [dir, setDir] = useState(1);
  const [view, setView] = useState(FRESH);

  // Sample campaigns until the reports API lists real ones; the same numbers every time.
  const items = useMemo(() => CAMPAIGNS.map((c) => ({ campaign: c, report: campaignReport(c, { depts: DEPTS, personAt: person }) })), []);
  const m = useMemo(() => missionControl(items, { days }), [items, days]);
  const story = useMemo(() => missionStory(m, TRAINING_FIGURES), [m]);
  const l = LENS[lens];

  const order = (id) => LENSES.findIndex((x) => x.id === id);
  const go = (id, patch = {}) => {
    setDir(order(id) >= order(lens) ? 1 : -1);
    setLens(id);
    setView({ ...FRESH, ...patch });
  };
  const patchView = (patch) => setView((v) => ({ ...v, ...patch }));
  const openFinding = (f) => go(f.view, f.view === 'lures' ? { lureFocus: f.focus || null } : f.id === 'beatClick' ? { show: 'first' } : {});

  const title = 'Mission Control';
  const exportItems = [
    { id: 'report', Icon: FileText, label: 'Full report', meta: 'Excel', run: () => downloadXlsx(xlsxName('mission control', `last ${days} days`), missionBook(m, story, TRAINING, { title: `${title} · last ${days} days` })) },
    { id: 'copy', Icon: Copy, label: 'Copy a summary', doneLabel: 'Copied', apart: true, run: () => navigator.clipboard?.writeText(missionSummary(m, story, title)).catch(() => {}) },
  ];

  const vars = isDark
    ? { '--bg': 'transparent', '--base': '#1C1E24', '--rail': '#1C1E24', '--text': '#F1F5F9', '--muted': '#9AA6B2', '--hair': 'rgba(255,255,255,0.10)', '--track': 'rgba(255,255,255,0.12)', '--ink': '#F8FAFC', '--ink-on': '#0F172A', '--row': 'rgba(255,255,255,0.03)', '--row-hair': 'rgba(255,255,255,0.07)', '--plate': 'rgba(255,255,255,0.08)', '--bp-accent': '#5EEAD4', '--mc-accent': l.inkDark, '--mc-soft': 'rgba(255,255,255,0.07)', '--mc-edge': l.inkDark }
    : { '--bg': '#F1F4F8', '--base': '#FFFFFF', '--rail': '#FFFFFF', '--text': '#0F172A', '--muted': '#64748B', '--hair': 'rgba(15,23,42,0.06)', '--track': '#EEF2F6', '--ink': '#0F172A', '--ink-on': '#FFFFFF', '--row': '#FFFFFF', '--row-hair': 'rgba(15,23,42,0.08)', '--plate': '#F1F2F5', '--bp-accent': '#0F766E', '--mc-accent': l.ink, '--mc-soft': l.cap, '--mc-edge': l.ink };

  const lensBody = {
    overview: (
      <div data-mc-overview style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 }}>
          {LENSES.slice(1).map((c, i) => <Chapter key={c.id} l={c} i={i} items={story[c.id]} isDark={isDark} reduce={reduce} onOpen={openFinding} />)}
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <CampaignBars m={m} ink={ink} reduce={reduce} onOpen={(campaign) => go('response', { campaign, page: null })} />
        </div>
      </div>
    ),
    lures: <LuresLens m={m} view={view} onView={patchView} ink={ink} reduce={reduce} />,
    response: <ResponseLens m={m} view={view} onView={patchView} ink={ink} reduce={reduce} />,
    learning: <LearningLens m={m} training={TRAINING} view={view} onView={patchView} ink={ink} reduce={reduce} />,
  };

  return (
    <>
      <style>{FONT_IMPORT}</style>

      {/* Fills <main> exactly; nothing inside lets the page itself scroll. */}
      <div className="mc-page" data-mc-page={lens} style={{ ...vars, position: 'relative', background: 'var(--bg)', color: 'var(--text)', width: '100%', height: '100%', overflow: 'hidden', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* top black bar */}
        <div style={{ background: isDark ? '#FFFFFF' : '#000000', color: isDark ? '#000000' : '#FFFFFF', borderRadius: 12, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Mission Control</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', opacity: 0.7 }}>The phishing programme · how it’s performing</span>
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>

          {/* LEFT RAIL: health, the lenses, how it's worked out */}
          <nav aria-label="Mission Control" style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <HealthCard m={m} ink={ink} isDark={isDark} reduce={reduce} />
            {LENSES.map((x) => <LensCapsule key={x.id} l={x} on={lens === x.id} isDark={isDark} onClick={() => go(x.id)} />)}
            <HowRead lens={lens} reduce={reduce} />
          </nav>

          {/* THE SHEET: the lens's tile, the pulse along the arm, the lens below */}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div className="mc-tile" style={{ ...PASTEL_INK, position: 'absolute', top: 0, left: 0, width: CAP_W, height: CAP_H, zIndex: 2, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, background: l.cap, borderRadius: L_R, overflow: 'hidden' }}>
              <div style={{ ...eyebrow, color: l.ink, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Rocket size={12} strokeWidth={2.6} aria-hidden /> Mission control
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={lens} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -6 }} transition={{ duration: 0.2, ease: EASE }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.16, color: 'var(--text)' }}>{l.title}</div>
                  <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.35, marginTop: 6 }}>Last {days} days · {m.basis.campaigns} {m.basis.campaigns === 1 ? 'campaign' : 'campaigns'}</div>
                </motion.div>
              </AnimatePresence>
              <img src={l.art} alt="" aria-hidden style={{ position: 'absolute', right: -6, bottom: -6, width: 54, height: 54, objectFit: 'contain', opacity: 0.95, pointerEvents: 'none' }} />
            </div>
            <svg aria-hidden width={FILLET} height={FILLET} viewBox={`0 0 ${FILLET} ${FILLET}`} style={{ position: 'absolute', top: CAP_H - L_R, left: CAP_W - L_R, zIndex: 1, display: 'block' }}>
              <path d={`M 0 ${FILLET} A ${FILLET} ${FILLET} 0 0 0 ${FILLET} 0 V ${FILLET} H 0 Z`} fill="var(--base)" />
            </svg>

            {/* the arm: the Programme Pulse, its period and Export */}
            <div style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, boxSizing: 'border-box', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: `12px 16px ${L_GAP + 3}px 22px`, background: 'var(--base)', borderTop: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderRadius: `${L_R}px ${L_R}px 0 0` }}>
              <div style={{ flexShrink: 0, height: 30, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 11, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                  <span aria-hidden style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--mc-accent)', flexShrink: 0, transition: 'background .25s ease' }} />
                  Programme Pulse
                </span>
                <PeriodPicker days={days} onDays={(d) => { setDays(d); setView((v) => ({ ...v, lurePage: 0, page: 0, campaign: null })); }} />
                <span style={{ marginLeft: 'auto' }}><ExportMenu items={exportItems} /></span>
              </div>
              <PulseStrip m={m} reduce={reduce} />
            </div>

            {/* the base: the lens on show */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px 16px 22px', background: 'var(--base)', borderLeft: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', borderRadius: `${L_R}px 0 ${L_R}px ${L_R}px`, overflow: 'hidden' }}>
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div key={lens} {...slide(reduce, dir)} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  {lensBody[lens]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MissionControl;

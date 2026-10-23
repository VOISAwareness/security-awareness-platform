import { startTransition, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Copy, FileText, GraduationCap, LayoutGrid, MousePointerClick, Users } from 'lucide-react';

import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from '../../services/sampleCampaigns';
import { campaignReport } from '../../services/sampleReports';
import { insights, peopleInsights, standsOut } from '../../services/insights';
import { organisation } from '../../services/sampleOrganisation';
import { insightsBook, insightsSummary } from '../../services/insightsExport';
import { downloadXlsx, xlsxName } from '../../services/xlsx';
import { ExportMenu } from '../Leaderboard/BigPicture';
import dashboardData from '../DashboardAndAnalytics/dashboardData.json';
import ClayAttention from '../../assets/LeaderboardAssets/ClayAttention.png';
import ClayGoingWell from '../../assets/LeaderboardAssets/ClayGoingWell.png';
import { BandGauge, BarcodeMeter, Segmented } from './InsightsCharts';
import { Count, Define, Delta, Explain, RiskHow } from './InsightsBits';
import { useSize } from './useSize';
import { CampaignProfile, DepartmentProfile, LureProfile, RiskProfile, TrainingProfile } from './InsightsProfiles';
import { CampaignsView, DepartmentsView, OverviewView } from './InsightsViews';
import { EASE, HEALTH_WORD, INK, STEADY_INK, change, eyebrow, glow, num, pc, pc1, riskInk, riskWord, small, swap, tierInk, times, TYPE } from './insightsUi';
import { GLOSSARY } from '../../services/glossary';

// =============================================================================
// Insights: how the organisation stands against phishing, for its leaders.
//
// It answers five questions, in order: are we safer than last period? where
// is the risk (which teams, which lures)? when a phishing email lands, do
// people raise the alarm or take the bait? is training paying off? what
// changed? The Big Picture keeps the person-by-person view; this is the
// whole organisation.
//
// The Leaderboard's sheet, in its L shape: the programme's health in the
// colour tile in the corner, its clay shield beside it; along the arm, the
// period (30, 60 or 90 days), the tabs and Export, over four measures (the
// risk score on a ring, then barcode meters); below, the tab on show. Every
// card, tile and column opens a profile: a department, a lure, a campaign,
// the risk, the training. A profile grows out of what was clicked, with a
// trail back; everything in it leads on. Nothing moves for those who ask for
// less. It reports; it never says what to do.
// =============================================================================

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&display=swap');
  .ins-page { font-family: 'Inter', system-ui, sans-serif; scrollbar-width: thin; }
  .ins-scroll { overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--hair-strong) transparent; }
  /* short cards drop what they can do without, so nothing spills or scrolls */
  @container (max-height: 250px) { .ins-optional { display: none !important; } .ins-big { font-size: 30px !important; } }
  @container (max-height: 480px) { .ins-optional-tall { display: none !important; } }
  @container (max-height: 250px) { .ins-cbar { height: 22px !important; } .ins-vs { gap: 5px !important; } .ins-vs-head { margin-bottom: 2px !important; } .ins-vs-bar { height: 10px !important; } .ins-vs-row + .ins-vs-row { margin-top: 3px !important; } }
  @container (max-height: 460px) { .ins-prof-sub { display: none !important; } .ins-prof-head { padding-top: 7px !important; padding-bottom: 7px !important; } }

  /* Cards settle on hover; what opens something lifts a little and its arrow nudges */
  .ins-card { transition: box-shadow .25s ease, border-color .25s ease, background-color .25s ease; }
  .ins-card:hover { box-shadow: var(--lift); border-color: var(--hair-strong) !important; }
  .ins-open:hover .ins-go-arrow, .ins-go:hover .ins-go-arrow { transform: translate(2px, -2px); }
  .ins-go-arrow { transition: transform .2s ease; }
  .ins-kpi { transition: box-shadow .25s ease; }
  .ins-health:focus-visible { outline: 2px solid var(--text) !important; outline-offset: 3px; }
  .ins-kpi:hover { box-shadow: var(--lift); }
  .ins-row, .ins-go, .ins-find { transition: background .15s ease, border-color .15s ease; }
  .ins-row:hover, .ins-go:hover, .ins-find:hover { background: var(--track) !important; }
  .ins-row .ins-arrow, .ins-find .ins-arrow { transition: transform .2s ease, color .2s ease; }
  .ins-row:hover .ins-arrow, .ins-find:hover .ins-arrow { transform: translateX(3px); color: var(--text) !important; }
  .ins-crumb:hover { color: var(--text) !important; text-decoration: underline; }
  .ins-col:hover > span:first-child { background: var(--track) !important; }
  .ins-page button:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }

  /* Vodafone red is kept for what you act on: the key buttons */
  .ins-page [data-bp-export] { background: var(--brand) !important; color: #FFFFFF !important; box-shadow: 0 6px 16px rgba(230,0,0,0.22); transition: filter .15s ease; }
  .ins-page [data-bp-export]:hover, .ins-cta:hover { filter: brightness(1.06); }

  /* Entrances for the many small things (rows, bars, dots, tiles, cards in a
     grid), as CSS animations of transform and opacity: the browser runs them
     on its compositor, so they stay smooth while a new view is being built.
     'backwards' holds the first frame through the delay and then lets go, so
     a grow-in can move the element afterwards. --d is each one's delay. */
  @keyframes ins-in-x { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: none; } }
  @keyframes ins-rise { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }
  @keyframes ins-pop-in { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: none; } }
  @keyframes ins-pop { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: none; } }
  @keyframes ins-grow-x { from { transform: scaleX(0); } to { transform: none; } }
  @keyframes ins-fade { from { opacity: 0; } }
  .ins-in-x { animation: ins-in-x .32s cubic-bezier(.22,1,.36,1) var(--d, 0s) backwards; }
  .ins-rise { animation: ins-rise .42s cubic-bezier(.22,1,.36,1) var(--d, 0s) backwards; }
  .ins-pop-in { animation: ins-pop-in .4s cubic-bezier(.22,1,.36,1) var(--d, 0s) backwards; }
  .ins-pop { animation: ins-pop .36s cubic-bezier(.34,1.56,.64,1) var(--d, 0s) backwards; }
  .ins-grow-x { animation: ins-grow-x .55s cubic-bezier(.22,1,.36,1) var(--d, 0s) backwards; }
  .ins-fade { animation: ins-fade .5s ease var(--d, 0s) backwards; }

  /* The clay pieces float, very slowly */
  @keyframes ins-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-5px) rotate(1deg); } }
  .ins-float { animation: ins-float 7s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .ins-card, .ins-kpi, .ins-row, .ins-go, .ins-find, .ins-arrow, .ins-go-arrow { transition: none !important; }
    .ins-float, .ins-in-x, .ins-rise, .ins-pop-in, .ins-pop, .ins-grow-x, .ins-fade { animation: none !important; }
  }
`;

// The Leaderboard's sheet: a colour tile in the corner, the sheet wrapping
// round it in an L with a small even gap and a concave corner.
const CAP_W = 300;
const CAP_H = 156;
const L_GAP = 7;
const L_R = 16;
const FILLET = L_R + L_GAP;
// The sheet's outline: one path round the whole L, so its edge and shadow
// run unbroken from the arm into the base and round the concave corner,
// which keeps the even gap round the tile's own corner. Half-pixel inset
// keeps the 1px edge sharp.
function lPath(w, h, capH) {
  const e = 0.5; const r = L_R; const f = FILLET;
  const x0 = CAP_W + L_GAP; const y1 = capH + L_GAP; const W = w - e; const H = h - e;
  return `M${x0 + r},${e} H${W - r} A${r},${r} 0 0 1 ${W},${e + r} V${H - r} A${r},${r} 0 0 1 ${W - r},${H} H${e + r} A${r},${r} 0 0 1 ${e},${H - r} V${y1 + r} A${r},${r} 0 0 1 ${e + r},${y1} H${x0 - f} A${f},${f} 0 0 0 ${x0},${y1 - f} V${e + r} A${r},${r} 0 0 1 ${x0 + r},${e} Z`;
}
// The tile keeps its pastel in dark mode, so its words take the light theme's ink.
const PASTEL_INK = { '--text': '#0F172A', '--muted': '#475569', '--chip': 'rgba(255,255,255,0.72)', '--track': 'rgba(15,23,42,0.08)' };

const TABS = [
  { id: 'overview', label: 'Overview', Icon: LayoutGrid },
  { id: 'departments', label: 'Departments', Icon: Users },
  { id: 'campaigns', label: 'Campaigns', Icon: MousePointerClick },
  { id: 'training', label: 'Training', Icon: GraduationCap },
];
const PERIODS = [
  { id: 30, label: '30 days', title: 'Monthly: the last 30 days' },
  { id: 60, label: '60 days', title: 'Every two months: the last 60 days' },
  { id: 90, label: '90 days', title: 'Quarterly: the last 90 days' },
];

// The training programmes: the sample the old analytics page showed, until
// the training API reports them.
const TRAINING = { programmes: dashboardData.trainingPrograms };

// The page fits the window, so nothing scrolls: the sheet takes the window's
// height, the band at the top turns compact when the room under it is short
// (COMPACT_BELOW), and views page their rows when two would be too cramped.
// Only a window shorter than FLOOR, far below a laptop's, scrolls.
// Every number on the page is sample data until the reports, people and
// training APIs report real ones; a chip by the period switch says so.
const SAMPLE = true;
const FLOOR = 480;
const COMPACT_BELOW = 700;
const CAP_H_COMPACT = 112;

// The corner tile: the programme's health, from reports against clicks
// (health() in bigPictureViews.js). Its clay emblem on the left, its word
// and what it means on the right, on a soft gradient in its colour with a
// shadow of the same; all three change with it (Holding's shield is the
// Protected one turned amber). Light on both themes.
const HEALTH_LOOK = {
  Protected: { word: 'Protected', says: 'Twice as many reports as clicks, or more', art: ClayGoingWell, tile: 'linear-gradient(135deg,#ECFDF5 0%,#D1FAE5 100%)', lift: '0 20px 40px rgba(16,185,129,0.15)', glow: 'rgba(16,185,129,0.20)', shine: '0 0 20px rgba(16,185,129,0.3)' },
  Holding: { word: 'Holding', says: 'About as many reports as clicks', art: ClayGoingWell, tint: 'hue-rotate(-118deg) saturate(1.35) brightness(1.04)', tile: 'linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%)', lift: '0 20px 40px rgba(245,158,11,0.15)', glow: 'rgba(245,158,11,0.20)', shine: '0 0 20px rgba(245,158,11,0.3)' },
  Exposed: { word: 'Not protected', says: 'More clicks than reports', art: ClayAttention, tile: 'linear-gradient(135deg,#FEF2F2 0%,#FEE2E2 100%)', lift: '0 20px 40px rgba(220,38,38,0.15)', glow: 'rgba(220,38,38,0.18)', shine: '0 0 20px rgba(220,38,38,0.25)' },
};
// The rule behind each health, for the back of the tile.
const HEALTH_STEPS = [
  { key: 'Protected', rule: '2 or more reports for every click', color: '#10B981' },
  { key: 'Holding', rule: 'at least 1 report for every click', color: '#F59E0B' },
  { key: 'Exposed', rule: 'fewer reports than clicks', color: '#DC2626' },
];
function HealthTile({ m, reduce, capH, compact }) {
  const [over, setOver] = useState(false);
  const h = m.now.health;
  const n = m.now;
  const look = HEALTH_LOOK[h?.word] || HEALTH_LOOK.Holding;
  const swapIn = { initial: { opacity: 0, y: reduce ? 0 : 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduce ? 0 : -6 }, transition: { duration: reduce ? 0 : 0.3, ease: EASE } };
  const turn = () => setOver((o) => !o);
  const face = { position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: L_R, overflow: 'hidden', background: look.tile, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transition: 'background .4s ease' };
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={over}
      data-ins-health={h?.word || 'none'}
      aria-label={over ? `How health is worked out: ${HEALTH_STEPS.map((s) => `${HEALTH_WORD[s.key]}, ${s.rule}`).join('; ')}. Turn back` : `Last ${m.basis.days} days: ${look.word}. ${look.says}. Show how it is worked out`}
      title={over ? 'Click to turn back' : 'Click to see how it is worked out'}
      onClick={turn}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turn(); } else if (e.key === 'Escape') setOver(false); }}
      className="ins-health"
      style={{ ...PASTEL_INK, position: 'absolute', top: 0, left: 0, zIndex: 2, width: CAP_W, height: capH, borderRadius: L_R, perspective: 900, cursor: 'pointer', boxShadow: look.lift, transition: 'box-shadow .4s ease', outline: 'none' }}
    >
      <motion.div initial={false} animate={{ rotateY: over ? 180 : 0 }} transition={{ duration: reduce ? 0 : 0.6, ease: EASE }} style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
        {/* the front: its emblem on the left, its words on the right */}
        <div style={{ ...face, display: 'flex', alignItems: 'center', gap: 12, padding: compact ? '0 16px 0 12px' : '0 18px 0 14px' }}>
          <span aria-hidden style={{ position: 'absolute', left: -50, top: -40, width: 200, height: 200, borderRadius: 999, background: `radial-gradient(closest-side, ${look.glow}, transparent)` }} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.img key={look.word} className="ins-float" src={look.art} alt="" aria-hidden width={compact ? 64 : 92} height={compact ? 64 : 92} initial={{ opacity: 0, scale: reduce ? 1 : 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reduce ? 1 : 0.8 }} transition={{ duration: 0.35, ease: EASE }} style={{ position: 'relative', flexShrink: 0, objectFit: 'contain', filter: `${look.tint || ''} drop-shadow(0 10px 14px rgba(15,23,42,0.14))` }} />
          </AnimatePresence>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={look.word} {...swapIn} style={{ position: 'relative', minWidth: 0, marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
              <span style={{ ...eyebrow, color: '#334155' }}>Last {m.basis.days} days</span>
              <span className="vs-rank" style={{ fontSize: compact ? (look.word.length > 10 ? TYPE.heading : TYPE.number) : (look.word.length > 10 ? TYPE.number : TYPE.hero), fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.05, marginTop: compact ? 4 : 7, color: 'var(--text)', textShadow: look.shine, whiteSpace: 'nowrap' }}>{look.word}</span>
              <span style={{ maxWidth: 170, fontSize: TYPE.body, fontWeight: 600, lineHeight: 1.4, marginTop: compact ? 3 : 6, color: '#475569', textWrap: 'balance' }}>{look.says}</span>
            </motion.div>
          </AnimatePresence>
        </div>
        {/* the back: how each health is worked out, and where the period stands */}
        <div aria-hidden={!over} style={{ ...face, transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: compact ? 4 : 7, padding: compact ? '8px 16px' : '12px 18px' }}>
          <span style={{ ...eyebrow, color: '#334155' }}>How health is worked out</span>
          {HEALTH_STEPS.map((s) => {
            const on = s.key === h?.word;
            return (
              <span key={s.key} style={{ display: 'grid', gridTemplateColumns: '8px 84px minmax(0,1fr)', alignItems: 'center', gap: 7, padding: '2px 6px', margin: '0 -6px', borderRadius: 7, background: on ? 'rgba(255,255,255,0.7)' : 'transparent', fontSize: TYPE.small, lineHeight: 1.3, color: on ? 'var(--text)' : '#475569' }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 3, background: s.color }} />
                <strong style={{ fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{HEALTH_WORD[s.key]}</strong>
                <span style={{ fontWeight: on ? 700 : 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.rule}</span>
              </span>
            );
          })}
          {!compact && (
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingTop: 7, borderTop: '1px solid rgba(15,23,42,0.08)', fontSize: TYPE.small, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
              <span>{GLOSSARY.perClick.name} <strong className="vs-rank" style={{ color: 'var(--text)' }}>{times(n.perClick)}</strong></span>
              <span>Reported <strong style={{ color: 'var(--text)' }}>{pc(n.reportRate)}</strong></span>
              <span>Clicked <strong style={{ color: 'var(--text)' }}>{pc(n.hooked)}</strong></span>
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Along the arm: the risk score on a half gauge in its bands, with what it
// means behind an "i", and how the period's emails were answered; then three
// measures on barcode meters. Each opens where it is explained. Every tile
// keeps the same three rows (its name, its number, a strip under it), so
// the names, the numbers and the strips line up across the arm; a compact
// band drops the strips.
const KPI_ROW = { eyebrow: 18, value: 28, foot: 22 };
const kpiRows = (compact) => (compact ? `${KPI_ROW.eyebrow}px ${KPI_ROW.value}px` : `${KPI_ROW.eyebrow}px ${KPI_ROW.value}px ${KPI_ROW.foot}px`);
const kpiTile = (compact) => ({ minWidth: 0, display: 'grid', alignContent: 'center', rowGap: compact ? 4 : 8, padding: compact ? '6px 14px' : '10px 14px', borderRadius: 14, background: 'var(--plate)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', outline: 'none' });
const rowStyle = (h) => ({ height: h, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 });

function RiskKpi({ p, m, ink, isDark, reduce, onOpen, compact }) {
  const dc = change(p.now.score, p.before?.score, { kind: 'times', better: 'down' });
  const colors = tierInk(isDark);
  const tone = riskInk(p.now.score, isDark);
  const h = m.now.health;
  const share = h && h.reportRate + h.clickRate > 0 ? h.reportRate / (h.reportRate + h.clickRate) : 0.5;
  const bands = [{ to: 20, color: colors.low }, { to: 35, color: colors.moderate }, { to: 60, color: colors.high }, { to: 100, color: colors.critical }];
  const split = <span style={{ ...small, whiteSpace: 'nowrap' }}>Reported <strong style={{ color: 'var(--text)' }}>{pc(h?.reportRate)}</strong> · Clicked <strong style={{ color: 'var(--text)' }}>{pc(h?.clickRate)}</strong></span>;
  return (
    <motion.div role="button" tabIndex={0} className="ins-kpi" data-ins-kpi="risk" onClick={onOpen} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen(); } }} aria-label={`Risk Score ${p.now.score.toFixed(1)} of 100, ${riskWord(p.now.score)}. Open the risk view`} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.4, ease: EASE }} style={{ ...kpiTile(compact), gridTemplateColumns: `${compact ? 72 : 108}px minmax(0,1fr)`, gridTemplateRows: kpiRows(compact), columnGap: compact ? 10 : 16, paddingLeft: compact ? 10 : 12 }}>
      <span style={{ gridRow: '1 / -1', alignSelf: 'center' }}>
        <BandGauge value={p.now.score} bands={bands} size={compact ? 72 : 108} stroke={compact ? 7 : 9} reduce={reduce} label={`Risk Score ${p.now.score.toFixed(1)} of 100`} glowing={glow(tone, isDark, 0.35)} />
      </span>
      <span data-ins-row="eyebrow" style={rowStyle(KPI_ROW.eyebrow)}>
        <span style={eyebrow}>Risk Score</span>
        <Explain label="What the Risk Score means"><RiskHow score={p.now.score} days={p.basis.days} colors={colors} /></Explain>
        <span style={{ marginLeft: 'auto' }}><Delta c={dc && { ...dc, shown: dc.shown.replace('×', ' pts') }} ink={ink} title={`Against the start of the last ${p.basis.days} days`} /></span>
      </span>
      <span data-ins-row="value" style={{ ...rowStyle(KPI_ROW.value), gap: 7 }}>
        <span aria-hidden style={{ flexShrink: 0, width: 9, height: 9, borderRadius: 3, background: tone }} />
        <span style={{ fontSize: compact ? TYPE.figure : TYPE.heading, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap' }}>{riskWord(p.now.score)}</span>
        {compact && <span style={{ marginLeft: 'auto', minWidth: 0, overflow: 'hidden' }}>{split}</span>}
      </span>
      {!compact && (
        <span data-ins-row="foot" style={{ height: KPI_ROW.foot, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <span aria-hidden style={{ height: 6, display: 'flex', gap: 2, borderRadius: 999, overflow: 'hidden' }}>
            <span className="ins-grow-x" style={{ '--d': '0.25s', flexShrink: 0, width: `${share * 100}%`, borderRadius: 999, background: ink.good, transformOrigin: 'left', transition: 'width .5s ease' }} />
            <span className="ins-grow-x" style={{ '--d': '0.35s', flex: 1, borderRadius: 999, background: ink.bad, transformOrigin: 'right' }} />
          </span>
          <span style={{ display: 'flex', justifyContent: 'space-between', ...small, lineHeight: 1 }}>
            <span>Reported <strong style={{ color: 'var(--text)' }}>{pc(h?.reportRate)}</strong></span>
            <span>Clicked <strong style={{ color: 'var(--text)' }}>{pc(h?.clickRate)}</strong></span>
          </span>
        </span>
      )}
    </motion.div>
  );
}
function BarKpi({ k, i, ink, reduce, compact }) {
  return (
    <motion.div role="button" tabIndex={0} className="ins-kpi" data-ins-kpi={k.id} title={k.hint} onClick={k.onOpen} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); k.onOpen(); } }} aria-label={`${k.label}. Open it`} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : 0.05 * i, ease: EASE }} style={{ ...kpiTile(compact), gridTemplateRows: kpiRows(compact) }}>
      <span data-ins-row="eyebrow" style={rowStyle(KPI_ROW.eyebrow)}>
        <span style={{ ...eyebrow, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</span>
        <Define term={k.define} />
        <span style={{ marginLeft: 'auto' }}><Delta c={k.delta} ink={ink} title="Against the period before" /></span>
      </span>
      <span data-ins-row="value" style={{ ...rowStyle(KPI_ROW.value), alignItems: 'baseline', paddingTop: 4, gap: 5, whiteSpace: 'nowrap' }}>
        <span className="vs-rank" style={{ fontSize: TYPE.number, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.025em', textShadow: k.glow || 'none' }}><Count value={k.value} format={k.format} reduce={reduce} /></span>
        <span style={{ ...small, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.unit}</span>
      </span>
      {!compact && <span data-ins-row="foot" style={{ height: KPI_ROW.foot, minWidth: 0 }}><BarcodeMeter value={k.share} color={k.color} reduce={reduce} height={KPI_ROW.foot} label={`${k.label}: ${pc(k.share)}`} /></span>}
    </motion.div>
  );
}

const Insights = () => {
  const { isDark, hasAccess } = useUserType() || {};
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const ink = isDark ? INK.dark : INK.light;
  // a department's people are admins' to see, as on the Big Picture
  const canSeePeople = Boolean(hasAccess && hasAccess('leaderboard-people'));
  // what the switches show changes at once; what they change renders in the
  // background (a transition), so a big view never freezes what is moving
  const [days, setDays] = useState(30);
  const [shownDays, setShownDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const [shownTab, setShownTab] = useState('overview');
  const [trail, setTrail] = useState([]); // the profiles opened, in order: { kind, key, layoutId, label }
  const [view, setView] = useState({ page: 0 });
  // the room under the top bar: short, and the band turns compact
  const [lBox, { w: lW, h: lH }] = useSize();
  const compact = lH > 0 && lH < COMPACT_BELOW;
  const capH = compact ? CAP_H_COMPACT : CAP_H;

  // Sample campaigns (and those that ended before them) until the reports API lists real ones.
  // The sample tells a story (services/sampleStory.js), so 30, 60 and 90 days differ.
  const items = useMemo(() => [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((c) => ({ campaign: c, report: campaignReport(c, { depts: DEPTS, personAt: person }) })), []);
  const m = useMemo(() => insights(items, { days }), [items, days]);
  // The sample organisation, thirty days at a time, until the people and risk APIs report it.
  const org = useMemo(() => organisation({ end: m.basis.end, steps: 24 }), [m.basis.end]);
  const p = useMemo(() => peopleInsights(org, { days }), [org, days]);
  const list = useMemo(() => standsOut(m, p), [m, p]);

  const labelOf = (kind, key) => (kind === 'risk' ? 'Risk' : kind === 'training' ? 'Training' : kind === 'campaign' ? (m.campaigns.find((c) => c.id === key)?.name || 'Campaign') : key);
  // open a profile: on top of the trail, or in place of the one on show
  const open = (kind, key = null, layoutId = null, replace = false) => {
    const step = { kind, key, layoutId, label: labelOf(kind, key) };
    startTransition(() => setTrail((t) => (replace ? [...t.slice(0, -1), step] : [...t, step])));
  };
  const go = (id) => { setShownTab(id); startTransition(() => { setTrail([]); setTab(id); setView({ page: 0 }); }); };
  const top = trail.at(-1);
  const tabLabel = TABS.find((t) => t.id === tab)?.label || 'Insights';
  const frame = {
    layoutId: top?.layoutId,
    trail: [{ label: tabLabel }, ...trail.map((t) => ({ label: t.label }))],
    onCrumb: (k) => startTransition(() => setTrail((t) => t.slice(0, k))),
    onBack: () => startTransition(() => setTrail((t) => t.slice(0, -1))),
  };
  const ctx = { m, p, ink, isDark, reduce, open, go, canSeePeople, seePeople: () => navigate('/leaderboard', { state: { view: 'reports' } }), view, onView: (patch) => setView((v) => ({ ...v, ...patch })) };

  const n = m.now;
  const b = m.before;
  const hr = change(p.now.highRisk, p.before?.highRisk, { kind: 'min', better: 'down' });
  const kpis = [
    { id: 'highRisk', define: 'highRisk', label: 'People at high risk', value: p.now.highRisk, format: num, unit: `${pc1(p.now.highRisk / p.now.people)} of people`, share: p.now.highRisk / p.now.people, delta: hr && { ...hr, shown: hr.shown.replace(' min', '') }, color: ink.danger, hint: 'Clicked more than once, or gave details away', onOpen: () => open('risk') },
    { id: 'hooked', define: 'hookRate', label: 'Hook Rate', value: n.hooked === null ? null : n.hooked * 100, format: (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : '—'), unit: 'of emails clicked', share: n.hooked, delta: change(n.hooked, b?.hooked, { kind: 'pct', better: 'down' }), color: ink.bad, hint: 'Clicked, of the emails delivered', onOpen: () => go('campaigns') },
    { id: 'reported', define: 'reportRate', label: 'Report Rate', value: n.reportRate === null ? null : n.reportRate * 100, format: (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : '—'), unit: 'of emails reported', share: n.reportRate, delta: change(n.reportRate, b?.reportRate, { kind: 'pct', better: 'up' }), color: ink.good, glow: glow('#10B981', isDark), hint: 'Reported, of the emails delivered', onOpen: () => go('campaigns') },
  ];

  const title = 'Insights';
  const exportItems = [
    { id: 'report', Icon: FileText, label: 'Full report', meta: 'Excel', run: () => downloadXlsx(xlsxName('insights', `last ${days} days`), insightsBook(m, list, TRAINING, { title: `${title} · last ${days} days`, p })) },
    { id: 'copy', Icon: Copy, label: 'Copy a summary', doneLabel: 'Copied', apart: true, run: () => navigator.clipboard?.writeText(insightsSummary(m, list, title)).catch(() => {}) },
  ];

  // Depth from a soft light at the top of the page; the cards are the app's
  // glass: see-through white with a thin white edge. Only what floats and
  // holds still (tooltips, the "i" notes) blurs what is under it (--glass),
  // so nothing moving has to be blurred again every frame. --base is a solid
  // the colour of a card, for pills and the rings round dots.
  const vars = isDark
    ? { '--bg': 'radial-gradient(circle at top center, #10131C 0%, #090C13 60%, #06080D 100%)', '--bg-edge': '#06080D', '--sheet': '#141824', '--sheet-edge': 'rgba(255,255,255,0.11)', '--l-shadow': 'rgba(0,0,0,0.22)', '--card': 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.035) 100%)', '--card-edge': 'rgba(255,255,255,0.10)', '--base': '#1C1F29', '--glass': 'rgba(30,33,43,0.78)', '--pill': 'rgba(255,255,255,0.09)', '--ghost': 'rgba(255,255,255,0.04)', '--text': '#F1F5F9', '--muted': '#94A3B8', '--hair': 'rgba(255,255,255,0.07)', '--hair-strong': 'rgba(255,255,255,0.14)', '--track': 'rgba(255,255,255,0.07)', '--tick': 'rgba(255,255,255,0.12)', '--grid': 'rgba(255,255,255,0.06)', '--ink': '#F8FAFC', '--ink-on': '#0F172A', '--row': 'rgba(255,255,255,0.03)', '--row-hair': 'rgba(255,255,255,0.07)', '--plate': 'rgba(255,255,255,0.035)', '--chip': 'rgba(255,255,255,0.06)', '--lift': '0 16px 34px rgba(0,0,0,0.38)', '--soft-bad': 'rgba(217,119,6,0.30)', '--soft-good': 'rgba(5,150,105,0.38)', '--good-soft': 'rgba(16,185,129,0.14)', '--bad-soft': 'rgba(217,119,6,0.14)', '--brand': '#FF4545', '--bp-accent': '#5EEAD4' }
    : { '--bg': 'radial-gradient(circle at top center, #F6F7FA 0%, #ECEFF3 60%, #E5E8EE 100%)', '--bg-edge': '#E5E8EE', '--sheet': '#FBFCFD', '--sheet-edge': 'rgba(15,23,42,0.10)', '--l-shadow': 'rgba(15,23,42,0.035)', '--card': 'rgba(255,255,255,0.9)', '--card-edge': 'rgba(15,23,42,0.07)', '--base': '#FFFFFF', '--glass': 'rgba(255,255,255,0.82)', '--pill': '#FFFFFF', '--ghost': '#FFFFFF', '--text': '#0F172A', '--muted': '#64748B', '--hair': 'rgba(15,23,42,0.07)', '--hair-strong': 'rgba(15,23,42,0.12)', '--track': '#EEF2F6', '--tick': '#D9DEE6', '--grid': 'rgba(15,23,42,0.06)', '--ink': '#0F172A', '--ink-on': '#FFFFFF', '--row': '#FFFFFF', '--row-hair': 'rgba(15,23,42,0.08)', '--plate': '#F3F4F7', '--chip': '#F1F2F5', '--lift': '0 16px 34px rgba(15,23,42,0.09)', '--soft-bad': 'rgba(245,158,11,0.30)', '--soft-good': 'rgba(16,185,129,0.30)', '--good-soft': '#ECFDF5', '--bad-soft': '#FFFBEB', '--brand': '#E60000', '--bp-accent': '#0F766E' };

  let body;
  if (top) {
    const props = { ctx, frame };
    body = top.kind === 'risk' ? <RiskProfile {...props} />
      : top.kind === 'department' ? <DepartmentProfile {...props} name={top.key} />
        : top.kind === 'lure' ? <LureProfile {...props} type={top.key} />
          : top.kind === 'campaign' ? <CampaignProfile {...props} id={top.key} />
            : <TrainingProfile {...props} training={TRAINING} />;
  } else {
    body = tab === 'overview' ? <OverviewView ctx={ctx} list={list} />
      : tab === 'departments' ? <DepartmentsView ctx={ctx} />
        : tab === 'campaigns' ? <CampaignsView ctx={ctx} />
          : <TrainingProfile ctx={ctx} frame={{}} embedded training={TRAINING} />;
  }

  return (
    <>
      <style>{FONT_IMPORT}</style>

      {/* Fills <main> exactly, at any window size; layoutScroll keeps the
          grow-ins true on the rare window short enough to scroll. */}
      <motion.div layoutScroll className="ins-page" data-ins-page={top ? `${top.kind}` : tab} style={{ ...vars, position: 'relative', background: 'var(--bg-edge)', color: 'var(--text)', width: '100%', height: '100%', overflowX: 'hidden', overflowY: 'auto' }}>
      <div className="ins-sheet" style={{ position: 'relative', isolation: 'isolate', height: '100%', minHeight: FLOOR, boxSizing: 'border-box', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* the page's light, on a layer of its own: painted once, not again
            under everything that moves */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -1, background: 'var(--bg)', transform: 'translateZ(0)', pointerEvents: 'none' }} />

        {/* top bar: black on the light theme; on the dark one, glass like the
            cards rather than the white the other pages turn it */}
        <div style={{ background: isDark ? 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' : '#000000', border: isDark ? '1px solid var(--card-edge)' : 'none', boxSizing: 'border-box', color: isDark ? 'var(--text)' : '#FFFFFF', borderRadius: 12, height: 42, display: 'flex', alignItems: 'center', padding: '0 18px', flexShrink: 0 }}>
          <span style={{ fontSize: TYPE.title, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Insights</span>
        </div>

        {/* the sheet, in its L */}
        <div ref={lBox} style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {lW > 0 && lH > 0 && (
            <svg aria-hidden width={lW} height={lH} style={{ position: 'absolute', inset: 0, zIndex: 0, display: 'block', overflow: 'visible', pointerEvents: 'none' }}>
              {/* a soft shadow from wide, faint strokes under the sheet: a
                  blur filter here would be redrawn under every animation */}
              {[[22, 0.25], [12, 0.45], [5, 0.8]].map(([wd, a]) => <path key={wd} d={lPath(lW, lH, capH)} transform="translate(0 5)" fill="none" stroke="var(--l-shadow)" strokeOpacity={a} strokeWidth={wd} strokeLinejoin="round" />)}
              <path d={lPath(lW, lH, capH)} fill="var(--sheet)" stroke="var(--sheet-edge)" strokeWidth={1} />
            </svg>
          )}
          <HealthTile m={m} reduce={reduce} capH={capH} compact={compact} />

          {/* the arm: the period, the tabs and Export; under them, four measures */}
          <div style={{ marginLeft: CAP_W + L_GAP, height: capH + L_GAP, boxSizing: 'border-box', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: compact ? 7 : 10, padding: `${compact ? 9 : 12}px 16px ${L_GAP}px 20px`, position: 'relative' }}>
            <div style={{ flexShrink: 0, height: 30, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Segmented id="ins-period" label="Period" value={shownDays} options={PERIODS} onChange={(d) => { setShownDays(d); startTransition(() => { setDays(d); setView((v) => ({ page: 0, deptQ: v.deptQ })); }); }} reduce={reduce} />
              {SAMPLE && (
                <span data-ins-sample title="These are sample numbers. Real ones take their place once the reports, people and training services send them." style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px', borderRadius: 999, border: '1px dashed var(--hair-strong)', color: 'var(--muted)', fontSize: TYPE.small, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: STEADY_INK }} />
                  Sample data
                </span>
              )}
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Segmented id="ins-tab" label="Insights" value={top ? null : shownTab} options={TABS} onChange={go} reduce={reduce} tabs />
                <ExportMenu items={exportItems} />
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.65fr) repeat(3, minmax(0,1fr))', gap: 10 }}>
              <RiskKpi p={p} m={m} ink={ink} isDark={isDark} reduce={reduce} onOpen={() => open('risk')} compact={compact} />
              {kpis.map((k, i) => <BarKpi key={k.id} k={k} i={i + 1} ink={ink} reduce={reduce} compact={compact} />)}
            </div>
          </div>

          {/* the base: the tab on show, or a profile grown out of it */}
          <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px 16px 16px' }}>
            <LayoutGroup id="insights">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={top ? `p-${trail.length}-${top.kind}-${top.key}` : `v-${tab}`} {...(top ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0, transition: { duration: 0.18 } } } : swap(reduce))} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  {body}
                </motion.div>
              </AnimatePresence>
            </LayoutGroup>
          </div>
        </div>
      </div>
      </motion.div>
    </>
  );
};

export default Insights;

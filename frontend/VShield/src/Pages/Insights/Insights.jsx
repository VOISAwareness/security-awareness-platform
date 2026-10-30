import { startTransition, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, FileText, GraduationCap, LayoutGrid, MousePointerClick, Users } from 'lucide-react';

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
import { Segmented } from './InsightsCharts';
import { Count, Definition, Delta, Explain } from './InsightsBits';
import { useSize } from './useSize';
import { CampaignProfile, LureProfile, RiskProfile, TrainingProfile } from './InsightsProfiles';
import { CampaignsView } from './InsightsViews';
import { DepartmentView, DepartmentsView } from './InsightsDepartments';
import { SummaryView } from './InsightsSummary';
import { EASE, HEALTH_WORD, INK, alpha, change, eyebrow, healthTone, mixHex, num, pc, pc1, small, swap, TYPE, themeVars } from './insightsUi';
import { GLOSSARY } from '../../services/glossary';
import { standing, targetText, targetsWith } from '../../services/insightsTargets';
import { deptTargets } from '../../services/deptTargets';
import { api } from '../../services/api';
import { actorFor } from '../../services/identity';
import { TargetsButton, TargetsEditor } from './InsightsTargets';

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
// risk score on a ring, then barcode meters); below, the tab on show, the
// Summary first (InsightsSummary.jsx). Every
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
  .ins-bar-btn { transition: background .15s ease; }
  .ins-bar-btn:hover { background: rgba(255,255,255,0.12) !important; }
  .ins-bar-btn:focus-visible { outline-color: currentColor !important; }

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
const CAP_W = 260;
const CAP_H = 140;
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
// On the light theme the tile is a pastel in its health's colour, so its words
// take the light theme's ink. On the dark theme it is the card itself (each
// look's `dark`), so its words take the page's own ink and need none of this.
const PASTEL_INK = { '--text': '#0F172A', '--muted': '#475569', '--chip': 'rgba(255,255,255,0.72)', '--track': 'rgba(15,23,42,0.08)' };

const TABS = [
  { id: 'summary', label: 'Summary', Icon: LayoutGrid },
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

// The page fits the window, so nothing scrolls: the band at the top keeps
// to its low height (CAP_H), the views below take the rest, and they page
// their rows when two would be too cramped. Only a window shorter than
// FLOOR, far below a laptop's, scrolls.
const FLOOR = 480;

// The corner tile: the programme's health, from reports against clicks
// (health() in bigPictureViews.js), or, with a department open, that
// department. Its clay emblem on the left; on the right, what it is ("Company
// health", or the department's name) over its health word (or its people).
// The tile is in its health's colour (insightsColours.js): green for
// Protected, amber for Holding (the Protected shield turned amber), red for
// Not protected; a soft gradient of that colour with a close shadow of the
// same, so its foot lines up with the band's tiles. A click turns it over:
// how health is worked out, or the department's facts.
const pastel = (c) => ({ tile: `linear-gradient(135deg,${mixHex(c, '#FFFFFF', 0.08)} 0%,${mixHex(c, '#FFFFFF', 0.2)} 100%)`, lift: `0 4px 10px ${alpha(c, 0.14)}`, glow: alpha(c, 0.2), shine: `0 0 20px ${alpha(c, 0.3)}` });
// the green shield as an amber one, for Holding
const AMBER_SHIELD = 'hue-rotate(-110deg) saturate(2.2) brightness(1.2) contrast(0.95)';
const HEALTH_LOOK = {
  Protected: { word: 'Protected', says: 'Twice as many reports as clicks, or more', art: ClayGoingWell, ...pastel(INK.light.good) },
  Holding: { word: 'Holding', says: 'About as many reports as clicks', art: ClayGoingWell, tint: AMBER_SHIELD, ...pastel(INK.light.caution) },
  Exposed: { word: 'Not protected', says: 'More clicks than reports', art: ClayAttention, ...pastel(INK.light.bad) },
};
// The rule behind each health, for the back of the tile: its dot in the
// health's colour.
const HEALTH_STEPS = [
  { key: 'Protected', rule: '2 or more reports for every click' },
  { key: 'Holding', rule: 'at least 1 report for every click' },
  { key: 'Exposed', rule: 'fewer reports than clicks' },
].map((s) => ({ ...s, color: INK.light[healthTone(s.key)] }));
const backRow = { display: 'flex', justifyContent: 'space-between', gap: 10, padding: '1px 0', borderTop: '1px solid rgba(15,23,42,0.08)', fontSize: TYPE.body, lineHeight: 1.35, color: '#475569', fontWeight: 600 };
function HealthTile({ m, dept, reduce }) {
  const [over, setOver] = useState(false);
  const h = dept ? dept.health : m.now.health;
  const look = HEALTH_LOOK[h?.word] || HEALTH_LOOK.Holding;
  const swapIn = { initial: { opacity: 0, y: reduce ? 0 : 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: reduce ? 0 : -6 }, transition: { duration: reduce ? 0 : 0.3, ease: EASE } };
  const turn = () => setOver((o) => !o);
  const face = { position: 'absolute', inset: 0, boxSizing: 'border-box', borderRadius: L_R, overflow: 'hidden', background: look.tile, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transition: 'background .4s ease' };
  const art = 60;
  const facts = dept && [
    ['Health', HEALTH_WORD[h?.word] ?? '—'],
    ['Total people', num(dept.people)],
    [GLOSSARY.highRisk.name, num(dept.highRisk)],
    ['Clicked most', dept.clickedMost || '—'],
    [GLOSSARY.trainingCompletion.name, pc(dept.now.trainingCompletion)],
  ];
  const say = dept
    ? (over ? `${dept.name}: ${facts.map(([k, v]) => `${k} ${v}`).join(', ')}. Turn back` : `${dept.name}: ${num(dept.people)} people, ${look.word}. Show its details`)
    : (over ? `How health is worked out: ${HEALTH_STEPS.map((s) => `${HEALTH_WORD[s.key]}, ${s.rule}`).join('; ')}. Turn back` : `Company health, last ${m.basis.days} days: ${look.word}. ${look.says}. Show how it is worked out`);
  const big = { fontSize: TYPE.number, fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.05, color: 'var(--text)', whiteSpace: 'nowrap' };
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={over}
      data-ins-health={h?.word || 'none'}
      data-ins-corner={dept ? 'department' : 'company'}
      aria-label={say}
      title={over ? 'Click to turn back' : dept ? 'Click for its details' : 'Click to see how it is worked out'}
      onClick={turn}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); turn(); } else if (e.key === 'Escape') setOver(false); }}
      className="ins-health"
      style={{ ...PASTEL_INK, position: 'absolute', top: 0, left: 0, zIndex: 2, width: CAP_W, height: CAP_H, borderRadius: L_R, perspective: 900, cursor: 'pointer', boxShadow: look.lift, transition: 'box-shadow .4s ease', outline: 'none' }}
    >
      <motion.div initial={false} animate={{ rotateY: over ? 180 : 0 }} transition={{ duration: reduce ? 0 : 0.6, ease: EASE }} style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
        {/* the front: its emblem on the left, what it is and its word on the right */}
        <div style={{ ...face, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 14px' }}>
          <span aria-hidden style={{ position: 'absolute', left: -50, top: -40, width: 200, height: 200, borderRadius: 999, background: `radial-gradient(closest-side, ${look.glow}, transparent)` }} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.img key={look.word} className="ins-float" src={look.art} alt="" aria-hidden width={art} height={art} initial={{ opacity: 0, scale: reduce ? 1 : 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reduce ? 1 : 0.8 }} transition={{ duration: 0.35, ease: EASE }} style={{ position: 'relative', flexShrink: 0, objectFit: 'contain', filter: `${look.tint || ''} drop-shadow(0 10px 14px rgba(15,23,42,0.14))` }} />
          </AnimatePresence>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={dept ? dept.name : look.word} {...swapIn} style={{ position: 'relative', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, textAlign: 'left' }}>
              <span style={{ maxWidth: '100%', fontSize: TYPE.figure, fontWeight: 800, lineHeight: 1.25, color: '#334155', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{dept ? dept.name : 'Company health'}</span>
              {dept ? (
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span className="vs-rank" style={big}>{num(dept.people)}</span>
                  <span style={{ fontSize: TYPE.strong, fontWeight: 700, color: '#475569' }}>people</span>
                </span>
              ) : <span className="vs-rank" style={{ ...big, fontSize: look.word.length > 10 ? TYPE.heading : big.fontSize, textShadow: look.shine }}>{look.word}</span>}
            </motion.div>
          </AnimatePresence>
        </div>
        {/* the back: the department's facts, or how each health is worked out */}
        <div aria-hidden={!over} style={{ ...face, transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: dept ? 0 : 4, padding: '8px 16px' }}>
          {dept ? (
            <>
              <span style={{ ...eyebrow, color: '#334155', textAlign: 'center', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept.name}</span>
              {facts.map(([k, v]) => (
                <span key={k} style={backRow}>
                  <span style={{ whiteSpace: 'nowrap' }}>{k}</span>
                  <strong style={{ minWidth: 0, fontWeight: 800, color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</strong>
                </span>
              ))}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Along the arm: six measures, the company's or, with a department open,
// the department's, on tiles of one size, each on the same rows, centred:
// its name, its figure, its change against the period before, its bar
// against its target, and the target in words. The company's open where
// they are explained. Its change against the period before is in its ⓘ,
// under what the measure means, so the tile stays clean.
const tileStyle = (opens) => ({ minWidth: 0, display: 'grid', justifyItems: 'center', alignContent: 'center', textAlign: 'center', rowGap: 3, padding: '6px 12px', borderRadius: 14, background: 'var(--plate)', color: 'var(--text)', cursor: opens ? 'pointer' : 'default', outline: 'none' });
const STANDING_WORD = { on: 'on track', risk: 'at risk', off: 'off track' };

// The bar: the measure along its whole scale, as a department's "What they
// fall for" bars are. The light green stretch of the track is the target.
// Lower is better: green up to the target, red for the part beyond it.
// Higher is better: red until the bar reaches the target, green once it does.
function TargetBar({ value, target, ink }) {
  const x = (q) => Math.max(0, Math.min(100, (q / target.max) * 100));
  const seg = (from, to, bg, more) => <span style={{ position: 'absolute', top: 0, bottom: 0, left: `${x(from)}%`, width: `${x(to) - x(from)}%`, background: bg, ...more }} />;
  const end = { borderRadius: '0 999px 999px 0' };
  const down = target.better === 'down';
  let fill = null;
  if (Number.isFinite(value)) {
    if (!down) fill = seg(0, value, value >= target.target ? ink.good : ink.bad, end);
    else if (value <= target.target) fill = seg(0, value, ink.good, end);
    else fill = <>{seg(0, target.target, ink.good)}{seg(target.target, value, ink.bad, { ...end, borderLeft: '2px solid var(--plate)' })}</>;
  }
  return (
    <span aria-hidden style={{ position: 'relative', display: 'block', width: '100%', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--tick)' }}>
      {down ? seg(0, target.target, alpha(ink.good, 0.26)) : seg(target.target, target.max, alpha(ink.good, 0.26))}
      <span className="ins-grow-x" style={{ position: 'absolute', inset: 0, transformOrigin: 'left' }}>{fill}</span>
    </span>
  );
}

// The foot of a tile's ⓘ: the measure the period before and now, and the change.
function ChangeNote({ k, ink, days }) {
  if (!k.delta) return <span style={{ display: 'block', ...small, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--hair)' }}>No figure for the {days} days before to compare with.</span>;
  return (
    <span data-ins-change style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--hair)' }}>
      <span style={{ ...small, color: 'var(--text)' }}><span style={{ whiteSpace: 'nowrap' }}>{days} days before <strong>{k.format(k.before)}</strong>,</span> <span style={{ whiteSpace: 'nowrap' }}>now <strong>{k.format(k.value)}</strong></span></span>
      <Delta c={k.delta} ink={ink} say />
    </span>
  );
}
const changeWords = (k, days) => (!k.delta ? '' : k.delta.dir === 'flat' ? `; no change on the ${days} days before` : `; ${k.delta.dir === 'up' ? 'up' : 'down'} ${k.delta.shown} on the ${days} days before`);

function TargetKpi({ k, i, ink, reduce, days }) {
  const at = standing(k.scaleValue, k.target);
  const opens = Boolean(k.onOpen);
  const press = opens ? { role: 'button', tabIndex: 0, onClick: k.onOpen, onKeyDown: (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); k.onOpen(); } } } : { role: 'group' };
  return (
    <motion.div {...press} className={opens ? 'ins-kpi' : undefined} data-ins-kpi={k.id} data-ins-standing={at || 'none'} title={k.hint} aria-label={`${k.label}: ${k.format(k.value)}, ${STANDING_WORD[at] || 'no figure'}, target ${k.targetText}${changeWords(k, days)}${opens ? '. Open it' : ''}`} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : 0.05 * i, ease: EASE }} style={tileStyle(opens)}>
      <span data-ins-row="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, maxWidth: '100%' }}>
        <span style={{ ...eyebrow, letterSpacing: '0.07em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</span>
        <Explain label={`What ${k.label} means, and its change`}><Definition term={k.define}><ChangeNote k={k} ink={ink} days={days} /></Definition></Explain>
      </span>
      <span data-ins-row="value" className="vs-rank" style={{ fontSize: TYPE.number, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}><Count value={k.value} format={k.format} reduce={reduce} /></span>
      <span data-ins-row="scale" style={{ width: '100%' }}><TargetBar value={k.scaleValue} target={k.target} ink={ink} /></span>
      <span data-ins-row="target" style={{ ...small, fontWeight: 700, whiteSpace: 'nowrap' }}>Target <strong style={{ color: 'var(--text)', fontWeight: 800 }}>{k.targetText}</strong></span>
    </motion.div>
  );
}

// GET/PUT /insights-targets' answer as the page keeps it; anything else
// (an older API, a stub) reads as nothing set
const savedOf = (r) => {
  const ok = r && typeof r === 'object' && !Array.isArray(r);
  return { targets: ok && r.targets && typeof r.targets === 'object' ? r.targets : {}, version: ok && Number.isInteger(r.version) ? r.version : 0, modifiedBy: ok ? r.modifiedBy ?? null : null, modifiedAt: ok ? r.modifiedAt ?? null : null, failed: false };
};

const Insights = () => {
  const { isDark, hasAccess, user } = useUserType() || {};
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const ink = isDark ? INK.dark : INK.light;
  // a department's people are admins' to see, as on the Big Picture
  const canSeePeople = Boolean(hasAccess && hasAccess('leaderboard-people'));
  // the targets are admins' to set (InsightsTargets.jsx)
  const canSetTargets = Boolean(hasAccess && hasAccess('insights-targets'));
  const [editing, setEditing] = useState(false);
  // what an admin has set (GET /insights-targets), in place of the defaults;
  // until it comes, or if it cannot be read, the defaults stand
  const [saved, setSaved] = useState({ targets: {}, version: 0, modifiedBy: null, modifiedAt: null, failed: false });
  useEffect(() => {
    let live = true;
    api.insightsTargets.get()
      .then((r) => { if (live) setSaved(savedOf(r)); })
      .catch(() => { if (live) setSaved((s) => ({ ...s, failed: true })); });
    return () => { live = false; };
  }, []);
  const T = useMemo(() => targetsWith(saved.targets), [saved.targets]);
  const saveTargets = async (targets) => setSaved(savedOf(await api.insightsTargets.save({ targets, version: saved.version, role: user?.role, actor: actorFor(user) })));
  // what the switches show changes at once; what they change renders in the
  // background (a transition), so a big view never freezes what is moving
  const [days, setDays] = useState(30);
  const [shownDays, setShownDays] = useState(30);
  const [tab, setTab] = useState('summary');
  const [shownTab, setShownTab] = useState('summary');
  const [trail, setTrail] = useState([]); // the profiles opened, in order: { kind, key, layoutId, label }
  const [view, setView] = useState({ page: 0 });
  // the room under the top bar, for the sheet's outline
  const [lBox, { w: lW, h: lH }] = useSize();

  // Sample campaigns (and those that ended before them) until the reports API lists real ones.
  // The sample tells a story (services/sampleStory.js), so 30, 60 and 90 days differ.
  const items = useMemo(() => [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((c) => ({ campaign: c, report: campaignReport(c, { depts: DEPTS, personAt: person }) })), []);
  const m = useMemo(() => insights(items, { days }), [items, days]);
  // The sample organisation, thirty days at a time, until the people and risk APIs report it.
  const org = useMemo(() => organisation({ end: m.basis.end, steps: 24 }), [m.basis.end]);
  const p = useMemo(() => peopleInsights(org, { days }), [org, days]);
  const list = useMemo(() => standsOut(m, p), [m, p]);
  const depts = useMemo(() => deptTargets(m, p, T), [m, p, T]);

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
  // a department open: the corner tile and the band turn to it
  const dept = top?.kind === 'department' ? depts.find((d) => d.name === top.key) : null;
  const corner = dept && { ...dept, clickedMost: m.deptLures[dept.name]?.[0]?.type };
  const backTo = trail.length > 1 ? trail.at(-2).label : tab === 'departments' ? 'All departments' : tabLabel;
  const ctx = { m, p, depts, targets: T, ink, isDark, reduce, open, go, canSeePeople, seePeople: () => navigate('/leaderboard', { state: { view: 'reports' } }), nav: (route) => navigate(route), view, onView: (patch) => setView((v) => ({ ...v, ...patch })) };

  const n = m.now;
  const b = m.before;
  const pctText = (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : '—');
  const pct0Text = (v) => (Number.isFinite(v) ? `${Math.round(v)}%` : '—');
  const hundred = (v) => (Number.isFinite(v) ? v * 100 : null);
  const share = (a, of) => (of > 0 ? a / of : null);
  const gave = share(n.compromised, n.delivered);
  const done = p.now.training?.completion ?? null;
  // the company's six, each opening where it is explained
  const company = [
    { id: 'risk', define: 'riskScore', label: 'Risk Score', value: p.now.score, before: p.before?.score, format: (v) => (Number.isFinite(v) ? v.toFixed(1) : '—'), scaleValue: p.now.score, target: T.riskScore, targetText: targetText(T.riskScore), delta: change(p.now.score, p.before?.score, { kind: 'pts', better: 'down' }), hint: 'Out of 100: under 20 is Low risk', onOpen: () => open('risk') },
    { id: 'highRisk', define: 'highRisk', label: 'People at high risk', value: p.now.highRisk, before: p.before?.highRisk, format: num, scaleValue: p.now.highRisk / p.now.people, target: T.highRiskShare, targetText: `${targetText(T.highRiskShare, '%')} of people`, delta: change(p.now.highRisk, p.before?.highRisk, { kind: 'count', better: 'down' }), hint: `Clicked more than once, or gave details away: ${pc1(p.now.highRisk / p.now.people)} of people`, onOpen: () => open('risk') },
    { id: 'hooked', define: 'hookRate', label: 'Hook Rate', value: hundred(n.hooked), before: hundred(b?.hooked), format: pctText, scaleValue: n.hooked, target: T.hookRate, targetText: targetText(T.hookRate, '%'), delta: change(n.hooked, b?.hooked, { kind: 'pct', better: 'down' }), hint: 'Clicked, of the emails delivered', onOpen: () => go('campaigns') },
    { id: 'reported', define: 'reportRate', label: 'Report Rate', value: hundred(n.reportRate), before: hundred(b?.reportRate), format: pctText, scaleValue: n.reportRate, target: T.reportRate, targetText: targetText(T.reportRate, '%'), delta: change(n.reportRate, b?.reportRate, { kind: 'pct', better: 'up' }), hint: 'Reported, of the emails delivered', onOpen: () => go('campaigns') },
    { id: 'gave', define: 'gaveDetails', label: GLOSSARY.gaveDetails.name, value: hundred(gave), before: hundred(b ? share(b.compromised, b.delivered) : null), format: pctText, scaleValue: gave, target: T.gaveDetails, targetText: targetText(T.gaveDetails, '%'), delta: change(gave, b ? share(b.compromised, b.delivered) : null, { kind: 'pct', better: 'down' }), hint: 'Entered details on the practice page, of the emails delivered', onOpen: () => go('campaigns') },
    { id: 'completion', define: 'trainingCompletion', label: GLOSSARY.trainingCompletion.name, value: hundred(done), before: hundred(p.before?.training?.completion ?? null), format: pct0Text, scaleValue: done, target: T.trainingCompletion, targetText: targetText(T.trainingCompletion, '%'), delta: change(done, p.before?.training?.completion ?? null, { kind: 'pct', better: 'up' }), hint: 'Trainings completed, of those assigned in the period', onOpen: () => go('training') },
  ];
  // a department's six, the same measures as its row on the Departments tab
  const ofDept = (d) => [
    ['risk', 'riskScore', 'riskScore', 'Risk Score'],
    ['highRisk', 'highRiskShare', 'highRisk', 'People at high risk'],
    ['hooked', 'hookRate', 'hookRate', 'Hook Rate'],
    ['reported', 'reportRate', 'reportRate', 'Report Rate'],
    ['gave', 'gaveDetails', 'gaveDetails', GLOSSARY.gaveDetails.name],
    ['completion', 'trainingCompletion', 'trainingCompletion', GLOSSARY.trainingCompletion.name],
  ].map(([id, key, define, label]) => {
    const score = key === 'riskScore';
    return { id, define, label, value: score ? d.now[key] : hundred(d.now[key]), before: score ? d.before[key] : hundred(d.before[key]), format: score ? (v) => (Number.isFinite(v) ? v.toFixed(1) : '—') : key === 'trainingCompletion' ? pct0Text : pctText, scaleValue: d.now[key], target: T[key], targetText: targetText(T[key], score ? '' : '%'), delta: change(d.now[key], d.before[key], { kind: score ? 'pts' : 'pct', better: T[key].better }), hint: `${d.name}: ${label}` };
  });
  const kpis = dept ? ofDept(dept) : company;

  const title = 'Insights';
  const exportItems = [
    { id: 'report', Icon: FileText, label: 'Full report', meta: 'Excel', run: () => downloadXlsx(xlsxName('insights', `last ${days} days`), insightsBook(m, list, TRAINING, { title: `${title} · last ${days} days`, p })) },
    { id: 'copy', Icon: Copy, label: 'Copy a summary', doneLabel: 'Copied', apart: true, run: () => navigator.clipboard?.writeText(insightsSummary(m, list, title)).catch(() => {}) },
  ];

  // the page's colours (insightsUi.js)
  const vars = themeVars(isDark);

  let body;
  if (top) {
    const props = { ctx, frame };
    body = top.kind === 'risk' ? <RiskProfile {...props} />
      : top.kind === 'department' ? <DepartmentView ctx={ctx} name={top.key} />
        : top.kind === 'lure' ? <LureProfile {...props} type={top.key} />
          : top.kind === 'campaign' ? <CampaignProfile {...props} id={top.key} />
            : <TrainingProfile {...props} training={TRAINING} />;
  } else {
    body = tab === 'summary' ? <SummaryView ctx={ctx} />
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
          {canSetTargets && <span style={{ marginLeft: 'auto' }}><TargetsButton onClick={() => setEditing(true)} isDark={isDark} /></span>}
        </div>

        {/* the sheet, in its L */}
        <div ref={lBox} style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {lW > 0 && lH > 0 && (
            <svg aria-hidden width={lW} height={lH} style={{ position: 'absolute', inset: 0, zIndex: 0, display: 'block', overflow: 'visible', pointerEvents: 'none' }}>
              {/* a soft shadow from wide, faint strokes under the sheet: a
                  blur filter here would be redrawn under every animation */}
              {[[22, 0.25], [12, 0.45], [5, 0.8]].map(([wd, a]) => <path key={wd} d={lPath(lW, lH, CAP_H)} transform="translate(0 5)" fill="none" stroke="var(--l-shadow)" strokeOpacity={a} strokeWidth={wd} strokeLinejoin="round" />)}
              <path d={lPath(lW, lH, CAP_H)} fill="var(--sheet)" stroke="var(--sheet-edge)" strokeWidth={1} />
            </svg>
          )}
          <HealthTile key={corner ? corner.name : 'company'} m={m} dept={corner} reduce={reduce} />

          {/* the arm: the way back from a department, the period, the tabs and
              Export; under them, six measures */}
          <div style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, boxSizing: 'border-box', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 7, padding: `9px 16px ${L_GAP}px 20px`, position: 'relative' }}>
            <div style={{ flexShrink: 0, height: 30, display: 'flex', alignItems: 'center', gap: 12 }}>
              {dept && (
                <button type="button" className="ins-go" data-ins-back onClick={frame.onBack} style={{ flexShrink: 0, height: 30, display: 'inline-flex', alignItems: 'center', gap: 3, padding: '0 12px 0 8px', borderRadius: 999, border: '1px solid var(--card-edge)', background: 'var(--ghost)', color: 'var(--text)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <ChevronLeft size={14} strokeWidth={2.6} aria-hidden />
                  {backTo}
                </button>
              )}
              <Segmented id="ins-period" label="Period" value={shownDays} options={PERIODS} onChange={(d) => { setShownDays(d); startTransition(() => { setDays(d); setView((v) => ({ page: 0, deptQ: v.deptQ })); }); }} reduce={reduce} />
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Segmented id="ins-tab" label="Insights" value={top && !dept ? null : shownTab} options={TABS} onChange={go} reduce={reduce} tabs />
                <ExportMenu items={exportItems} />
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 8 }}>
              {kpis.map((k, i) => <TargetKpi key={k.id} k={k} i={i} ink={ink} reduce={reduce} days={m.basis.days} />)}
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
      {editing && <TargetsEditor saved={saved} isDark={isDark} reduce={reduce} onSave={saveTargets} onClose={() => setEditing(false)} />}
    </>
  );
};

export default Insights;

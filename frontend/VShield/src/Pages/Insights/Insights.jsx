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
import ClayTrendFlat from '../../assets/LeaderboardAssets/ClayTrendFlat.png';
import { BarcodeMeter, RingGauge, Segmented } from './InsightsCharts';
import { Count, Delta } from './InsightsBits';
import { CampaignProfile, DepartmentProfile, LureProfile, RiskProfile, TrainingProfile } from './InsightsProfiles';
import { CampaignsView, DepartmentsView, OverviewView } from './InsightsViews';
import { EASE, INK, change, eyebrow, glow, num, pc, pc1, riskInk, riskWord, small, swap } from './insightsUi';

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

  /* Cards settle on hover; what opens something lifts a little and its arrow nudges */
  .ins-card { transition: box-shadow .25s ease, border-color .25s ease, background-color .25s ease; }
  .ins-card:hover { box-shadow: var(--lift); border-color: var(--hair-strong) !important; }
  .ins-open:hover .ins-go-arrow, .ins-go:hover .ins-go-arrow { transform: translate(2px, -2px); }
  .ins-go-arrow { transition: transform .2s ease; }
  .ins-kpi { transition: box-shadow .25s ease; }
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
  .ins-in-x { animation: ins-in-x .32s cubic-bezier(.22,1,.36,1) var(--d, 0s) backwards; }
  .ins-rise { animation: ins-rise .42s cubic-bezier(.22,1,.36,1) var(--d, 0s) backwards; }
  .ins-pop-in { animation: ins-pop-in .4s cubic-bezier(.22,1,.36,1) var(--d, 0s) backwards; }
  .ins-pop { animation: ins-pop .36s cubic-bezier(.34,1.56,.64,1) var(--d, 0s) backwards; }
  .ins-grow-x { animation: ins-grow-x .55s cubic-bezier(.22,1,.36,1) var(--d, 0s) backwards; }

  /* The clay pieces float, very slowly */
  @keyframes ins-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-5px) rotate(1deg); } }
  .ins-float { animation: ins-float 7s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .ins-card, .ins-kpi, .ins-row, .ins-go, .ins-find, .ins-arrow, .ins-go-arrow { transition: none !important; }
    .ins-float, .ins-in-x, .ins-rise, .ins-pop-in, .ins-pop, .ins-grow-x { animation: none !important; }
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
  { id: 'departments', label: 'Departments', Icon: Users },
  { id: 'campaigns', label: 'Lures & campaigns', Icon: MousePointerClick },
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

// The shortest the page gets, in the page's own pixels: what a 900px-high
// window leaves it (the app draws at 90%, so that is about 940), where every
// card has room. Shorter windows scroll.
const MIN_H = 930;

// The corner tile: the programme's health on its own soft gradient, lifted
// by a shadow in its colour, its word with a faint glow of the same; its
// clay piece; reports against clicks. It stays light on both themes.
const HEALTH_LOOK = {
  Protected: { art: ClayGoingWell, tile: 'linear-gradient(135deg,#ECFDF5 0%,#D1FAE5 100%)', lift: '0 20px 40px rgba(16,185,129,0.15)', glow: 'rgba(16,185,129,0.20)', word: '0 0 20px rgba(16,185,129,0.3)' },
  Holding: { art: ClayTrendFlat, tile: 'linear-gradient(135deg,#FFFBEB 0%,#FEF3C7 100%)', lift: '0 20px 40px rgba(245,158,11,0.15)', glow: 'rgba(245,158,11,0.20)', word: '0 0 20px rgba(245,158,11,0.3)' },
  Exposed: { art: ClayAttention, tile: 'linear-gradient(135deg,#FEF2F2 0%,#FEE2E2 100%)', lift: '0 20px 40px rgba(220,38,38,0.15)', glow: 'rgba(220,38,38,0.18)', word: '0 0 20px rgba(220,38,38,0.25)' },
};
function HealthTile({ m, reduce }) {
  const ink = INK.light; // the tile is light on both themes
  const n = m.now;
  const h = n.health;
  const look = HEALTH_LOOK[h?.word] || HEALTH_LOOK.Holding;
  const share = h && h.reportRate + h.clickRate > 0 ? h.reportRate / (h.reportRate + h.clickRate) : 0.5;
  return (
    <div data-ins-health={h?.word || 'none'} style={{ ...PASTEL_INK, position: 'absolute', top: 0, left: 0, zIndex: 2, width: CAP_W, height: CAP_H, boxSizing: 'border-box', padding: '15px 18px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: L_R, overflow: 'hidden', background: look.tile, boxShadow: look.lift, transition: 'background .4s ease, box-shadow .4s ease' }}>
      <span aria-hidden style={{ position: 'absolute', right: -40, top: -40, width: 170, height: 170, borderRadius: 999, background: `radial-gradient(closest-side, ${look.glow}, transparent)` }} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.img key={h?.word} className="ins-float" src={look.art} alt="" aria-hidden width={78} height={78} initial={{ opacity: 0, scale: reduce ? 1 : 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: reduce ? 1 : 0.7 }} transition={{ duration: 0.35, ease: EASE }} style={{ position: 'absolute', right: 14, top: 18, objectFit: 'contain', filter: 'drop-shadow(0 10px 14px rgba(15,23,42,0.14))' }} />
      </AnimatePresence>
      <div style={{ position: 'relative' }}>
        <div style={{ ...eyebrow, color: '#334155' }}>Programme health · last {m.basis.days} days</div>
        <div className="vs-rank" style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1, marginTop: 12, color: 'var(--text)', textShadow: look.word }}>{h?.word || '—'}</div>
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

// Along the arm: the risk score on its ring, and three measures on barcode
// meters; each opens where it is explained.
function RiskKpi({ p, ink, isDark, reduce, onOpen }) {
  const dc = change(p.now.score, p.before?.score, { kind: 'times', better: 'down' });
  const tone = riskInk(p.now.score, isDark);
  return (
    <motion.button type="button" className="ins-kpi" data-ins-kpi="risk" onClick={onOpen} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.45, ease: EASE }} style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px 8px 10px', borderRadius: 14, border: 'none', background: 'var(--plate)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}>
      <RingGauge value={p.now.score} size={66} stroke={6} color={tone} reduce={reduce} label={`Risk score ${p.now.score.toFixed(1)} of 100`}>
        <span className="vs-rank" style={{ display: 'block', fontSize: 15, fontWeight: 900, textShadow: glow(tone, isDark, 0.35) }}><Count value={p.now.score} format={(v) => v.toFixed(1)} reduce={reduce} /></span>
        <span style={{ display: 'block', fontSize: 7.5, fontWeight: 800, color: 'var(--muted)', marginTop: 2 }}>/ 100</span>
      </RingGauge>
      <span style={{ minWidth: 0 }}>
        <span style={{ ...eyebrow, display: 'block' }}>Risk score</span>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 800, marginTop: 4, whiteSpace: 'nowrap' }}>{riskWord(p.now.score)}</span>
        <span style={{ display: 'inline-flex', marginTop: 5 }}><Delta c={dc && { ...dc, shown: dc.shown.replace('×', ' pts') }} ink={ink} title={`Against the start of the last ${p.basis.days} days`} /></span>
      </span>
    </motion.button>
  );
}
function BarKpi({ k, i, ink, reduce }) {
  return (
    <motion.button type="button" className="ins-kpi" data-ins-kpi={k.id} title={k.hint} onClick={k.onOpen} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : 0.05 * i, ease: EASE }} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '10px 14px 10px', borderRadius: 14, border: 'none', background: 'var(--plate)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
        <span style={{ ...eyebrow, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</span>
        <span style={{ marginLeft: 'auto' }}><Delta c={k.delta} ink={ink} title="Against the period before" /></span>
      </span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
        <span className="vs-rank" style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.025em', textShadow: k.glow || 'none' }}><Count value={k.value} format={k.format} reduce={reduce} /></span>
        <span style={{ ...small, fontSize: 9.5 }}>{k.unit}</span>
      </span>
      <BarcodeMeter value={k.share} color={k.color} reduce={reduce} height={22} label={`${k.label}: ${pc(k.share)}`} />
    </motion.button>
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

  // Sample campaigns (and those that ended before them) until the reports API lists real ones.
  const items = useMemo(() => [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((c) => ({ campaign: c, report: campaignReport(c, { depts: DEPTS, personAt: person }) })), []);
  const m = useMemo(() => insights(items, { days }), [items, days]);
  // The sample organisation, thirty days at a time, until the people and risk APIs report it.
  const org = useMemo(() => organisation({ end: m.basis.end }), [m.basis.end]);
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
    { id: 'highRisk', label: 'People at high risk', value: p.now.highRisk, format: num, unit: `${pc1(p.now.highRisk / p.now.people)} of people`, share: p.now.highRisk / p.now.people, delta: hr && { ...hr, shown: hr.shown.replace(' min', '') }, color: ink.danger, hint: 'Clicked more than once, or gave details away', onOpen: () => open('risk') },
    { id: 'hooked', label: 'Hook Rate', value: n.hooked === null ? null : n.hooked * 100, format: (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : '—'), unit: 'of emails clicked', share: n.hooked, delta: change(n.hooked, b?.hooked, { kind: 'pct', better: 'down' }), color: ink.bad, hint: 'Clicked, of the emails delivered', onOpen: () => go('campaigns') },
    { id: 'reported', label: 'Report Rate', value: n.reportRate === null ? null : n.reportRate * 100, format: (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : '—'), unit: 'of emails reported', share: n.reportRate, delta: change(n.reportRate, b?.reportRate, { kind: 'pct', better: 'up' }), color: ink.good, glow: glow('#10B981', isDark), hint: 'Reported, of the emails delivered', onOpen: () => go('campaigns') },
  ];

  const title = 'Insights';
  const exportItems = [
    { id: 'report', Icon: FileText, label: 'Full report', meta: 'Excel', run: () => downloadXlsx(xlsxName('insights', `last ${days} days`), insightsBook(m, list, TRAINING, { title: `${title} · last ${days} days`, p })) },
    { id: 'copy', Icon: Copy, label: 'Copy a summary', doneLabel: 'Copied', apart: true, run: () => navigator.clipboard?.writeText(insightsSummary(m, list, title)).catch(() => {}) },
  ];

  // Depth from a soft light at the top of the page; panels and cards as
  // glass over it. --base stays a solid, for tooltips, pills and rings.
  const vars = isDark
    ? { '--bg': 'radial-gradient(circle at top center, #1A1D29 0%, #0B0F19 60%, #070A12 100%)', '--sheet': 'rgba(255,255,255,0.02)', '--card': 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', '--card-edge': 'rgba(255,255,255,0.08)', '--base': '#151926', '--pill': 'rgba(255,255,255,0.09)', '--ghost': 'rgba(255,255,255,0.04)', '--text': '#F1F5F9', '--muted': '#94A3B8', '--hair': 'rgba(255,255,255,0.07)', '--hair-strong': 'rgba(255,255,255,0.14)', '--track': 'rgba(255,255,255,0.07)', '--tick': 'rgba(255,255,255,0.12)', '--grid': 'rgba(255,255,255,0.06)', '--ink': '#F8FAFC', '--ink-on': '#0F172A', '--row': 'rgba(255,255,255,0.03)', '--row-hair': 'rgba(255,255,255,0.07)', '--plate': 'rgba(255,255,255,0.035)', '--chip': 'rgba(255,255,255,0.06)', '--lift': '0 16px 34px rgba(0,0,0,0.38)', '--soft-bad': 'rgba(217,119,6,0.30)', '--soft-good': 'rgba(5,150,105,0.38)', '--good-soft': 'rgba(16,185,129,0.14)', '--bad-soft': 'rgba(217,119,6,0.14)', '--brand': '#FF4545', '--bp-accent': '#5EEAD4' }
    : { '--bg': 'radial-gradient(circle at top center, #FFFFFF 0%, #F3F5F9 60%, #EBEEF3 100%)', '--sheet': 'rgba(255,255,255,0.72)', '--card': 'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.86) 100%)', '--card-edge': 'rgba(15,23,42,0.07)', '--base': '#FFFFFF', '--pill': '#FFFFFF', '--ghost': '#FFFFFF', '--text': '#0F172A', '--muted': '#64748B', '--hair': 'rgba(15,23,42,0.07)', '--hair-strong': 'rgba(15,23,42,0.12)', '--track': '#EEF2F6', '--tick': '#D9DEE6', '--grid': 'rgba(15,23,42,0.06)', '--ink': '#0F172A', '--ink-on': '#FFFFFF', '--row': '#FFFFFF', '--row-hair': 'rgba(15,23,42,0.08)', '--plate': '#F3F4F7', '--chip': '#F1F2F5', '--lift': '0 16px 34px rgba(15,23,42,0.09)', '--soft-bad': 'rgba(245,158,11,0.30)', '--soft-good': 'rgba(16,185,129,0.30)', '--good-soft': '#ECFDF5', '--bad-soft': '#FFFBEB', '--brand': '#E60000', '--bp-accent': '#0F766E' };

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

      {/* Fills <main> exactly. The sheet never gets shorter than MIN_H, so on
          a short window (a laptop at 125%) it scrolls here instead of
          squeezing its cards; layoutScroll keeps the grow-ins true when it has. */}
      <motion.div layoutScroll className="ins-page" data-ins-page={top ? `${top.kind}` : tab} style={{ ...vars, position: 'relative', background: 'var(--bg)', color: 'var(--text)', width: '100%', height: '100%', overflowX: 'hidden', overflowY: 'auto' }}>
      <div className="ins-sheet" style={{ position: 'relative', height: '100%', minHeight: MIN_H, boxSizing: 'border-box', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* top bar: black on the light theme; on the dark one, glass like the
            cards rather than the white the other pages turn it */}
        <div style={{ background: isDark ? 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' : '#000000', border: isDark ? '1px solid var(--card-edge)' : 'none', boxSizing: 'border-box', color: isDark ? 'var(--text)' : '#FFFFFF', borderRadius: 12, height: 42, display: 'flex', alignItems: 'center', padding: '0 18px', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Insights</span>
        </div>

        {/* the sheet, in its L */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <HealthTile m={m} reduce={reduce} />
          <svg aria-hidden width={FILLET} height={FILLET} viewBox={`0 0 ${FILLET} ${FILLET}`} style={{ position: 'absolute', top: CAP_H - L_R, left: CAP_W - L_R, zIndex: 1, display: 'block' }}>
            <path d={`M 0 ${FILLET} A ${FILLET} ${FILLET} 0 0 0 ${FILLET} 0 V ${FILLET} H 0 Z`} fill="var(--sheet)" />
          </svg>

          {/* the arm: the period, the tabs and Export; under them, four measures */}
          <div style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, boxSizing: 'border-box', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: `12px 16px ${L_GAP + 4}px 20px`, background: 'var(--sheet)', borderTop: '1px solid var(--card-edge)', borderRight: '1px solid var(--card-edge)', borderRadius: `${L_R}px ${L_R}px 0 0` }}>
            <div style={{ flexShrink: 0, height: 30, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Segmented id="ins-period" label="Period" value={shownDays} options={PERIODS} onChange={(d) => { setShownDays(d); startTransition(() => { setDays(d); setView({ page: 0 }); }); }} reduce={reduce} />
              <span style={{ ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.basis.campaigns} campaigns · against the {days} days before</span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Segmented id="ins-tab" label="Insights" value={top ? null : shownTab} options={TABS} onChange={go} reduce={reduce} tabs />
                <ExportMenu items={exportItems} />
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) repeat(3, minmax(0,1fr))', gap: 10 }}>
              <RiskKpi p={p} ink={ink} isDark={isDark} reduce={reduce} onOpen={() => open('risk')} />
              {kpis.map((k, i) => <BarKpi key={k.id} k={k} i={i + 1} ink={ink} reduce={reduce} />)}
            </div>
          </div>

          {/* the base: the tab on show, or a profile grown out of it */}
          <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px 16px 16px', background: 'var(--sheet)', borderLeft: '1px solid var(--card-edge)', borderRight: '1px solid var(--card-edge)', borderBottom: '1px solid var(--card-edge)', borderRadius: `${L_R}px 0 ${L_R}px ${L_R}px` }}>
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

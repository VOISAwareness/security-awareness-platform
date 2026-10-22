import { useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Copy, FileText, GraduationCap, LayoutGrid, Mail, MousePointerClick, Users } from 'lucide-react';

import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from '../../services/sampleCampaigns';
import { campaignReport } from '../../services/sampleReports';
import { insights, peopleInsights, standsOut } from '../../services/insights';
import { organisation } from '../../services/sampleOrganisation';
import { insightsBook, insightsSummary } from '../../services/insightsExport';
import { downloadXlsx, xlsxName } from '../../services/xlsx';
import { ExportMenu } from '../Leaderboard/BigPicture';
import { REPORT_INK } from '../Leaderboard/reportInk';
import dashboardData from '../DashboardAndAnalytics/dashboardData.json';
import ClayAttention from '../../assets/LeaderboardAssets/ClayAttention.png';
import ClayGoingWell from '../../assets/LeaderboardAssets/ClayGoingWell.png';
import ClayTrendFlat from '../../assets/LeaderboardAssets/ClayTrendFlat.png';
import { BarcodeMeter, RingGauge, Segmented } from './InsightsCharts';
import { Count, Delta } from './InsightsBits';
import { CampaignProfile, DepartmentProfile, LureProfile, RiskProfile, TrainingProfile } from './InsightsProfiles';
import { CampaignsView, DepartmentsView, OverviewView } from './InsightsViews';
import { EASE, HEALTH_RULE, change, eyebrow, num, pc, pc1, riskWord, small, swap, times } from './insightsUi';

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
  .ins-page { font-family: 'Inter', system-ui, sans-serif; }

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

  /* The clay pieces float, very slowly */
  @keyframes ins-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-5px) rotate(1deg); } }
  .ins-float { animation: ins-float 7s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .ins-card, .ins-kpi, .ins-row, .ins-go, .ins-find, .ins-arrow, .ins-go-arrow { transition: none !important; }
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
        <div className="vs-rank" style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1, marginTop: 9, color: 'var(--text)' }}>{h?.word || '—'}</div>
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

// Along the arm: the risk score on its ring, and three measures on barcode
// meters; each opens where it is explained.
function RiskKpi({ p, ink, reduce, onOpen }) {
  const dc = change(p.now.score, p.before?.score, { kind: 'times', better: 'down' });
  return (
    <motion.button type="button" className="ins-kpi" data-ins-kpi="risk" onClick={onOpen} initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.45, ease: EASE }} style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px 8px 10px', borderRadius: 14, border: 'none', background: 'var(--plate)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}>
      <RingGauge value={p.now.score} size={66} stroke={6} color={ink.bad} reduce={reduce} label={`Risk score ${p.now.score.toFixed(1)} of 100`}>
        <span className="vs-rank" style={{ display: 'block', fontSize: 15, fontWeight: 900 }}><Count value={p.now.score} format={(v) => v.toFixed(1)} reduce={reduce} /></span>
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
        <span className="vs-rank" style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.025em' }}><Count value={k.value} format={k.format} reduce={reduce} /></span>
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
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  // a department's people are admins' to see, as on the Big Picture
  const canSeePeople = Boolean(hasAccess && hasAccess('leaderboard-people'));
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
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
    setTrail((t) => (replace ? [...t.slice(0, -1), step] : [...t, step]));
  };
  const go = (id) => { setTrail([]); setTab(id); setView({ page: 0 }); };
  const top = trail.at(-1);
  const tabLabel = TABS.find((t) => t.id === tab)?.label || 'Insights';
  const frame = {
    layoutId: top?.layoutId,
    trail: [{ label: tabLabel }, ...trail.map((t) => ({ label: t.label }))],
    onCrumb: (k) => setTrail((t) => t.slice(0, k)),
    onBack: () => setTrail((t) => t.slice(0, -1)),
  };
  const ctx = { m, p, ink, isDark, reduce, open, go, canSeePeople, seePeople: () => navigate('/leaderboard', { state: { view: 'reports' } }), view, onView: (patch) => setView((v) => ({ ...v, ...patch })) };

  const n = m.now;
  const b = m.before;
  const hr = change(p.now.highRisk, p.before?.highRisk, { kind: 'min', better: 'down' });
  const kpis = [
    { id: 'highRisk', label: 'People at high risk', value: p.now.highRisk, format: num, unit: `${pc1(p.now.highRisk / p.now.people)} of people`, share: p.now.highRisk / p.now.people, delta: hr && { ...hr, shown: hr.shown.replace(' min', '') }, color: ink.bad, hint: 'Clicked more than once, or gave details away', onOpen: () => open('risk') },
    { id: 'hooked', label: 'Hook Rate', value: n.hooked === null ? null : n.hooked * 100, format: (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : '—'), unit: 'of emails clicked', share: n.hooked, delta: change(n.hooked, b?.hooked, { kind: 'pct', better: 'down' }), color: ink.bad, hint: 'Clicked, of the emails delivered', onOpen: () => go('campaigns') },
    { id: 'reported', label: 'Report Rate', value: n.reportRate === null ? null : n.reportRate * 100, format: (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : '—'), unit: 'of emails reported', share: n.reportRate, delta: change(n.reportRate, b?.reportRate, { kind: 'pct', better: 'up' }), color: ink.good, hint: 'Reported, of the emails delivered', onOpen: () => go('campaigns') },
  ];

  const title = 'Insights';
  const exportItems = [
    { id: 'report', Icon: FileText, label: 'Full report', meta: 'Excel', run: () => downloadXlsx(xlsxName('insights', `last ${days} days`), insightsBook(m, list, TRAINING, { title: `${title} · last ${days} days`, p })) },
    { id: 'copy', Icon: Copy, label: 'Copy a summary', doneLabel: 'Copied', apart: true, run: () => navigator.clipboard?.writeText(insightsSummary(m, list, title)).catch(() => {}) },
  ];

  const vars = isDark
    ? { '--bg': 'transparent', '--base': '#1C1E24', '--text': '#F1F5F9', '--muted': '#9AA6B2', '--hair': 'rgba(255,255,255,0.10)', '--hair-strong': 'rgba(255,255,255,0.18)', '--track': 'rgba(255,255,255,0.10)', '--tick': 'rgba(255,255,255,0.14)', '--grid': 'rgba(255,255,255,0.08)', '--ink': '#F8FAFC', '--ink-on': '#0F172A', '--row': 'rgba(255,255,255,0.03)', '--row-hair': 'rgba(255,255,255,0.07)', '--plate': 'rgba(255,255,255,0.06)', '--chip': 'rgba(255,255,255,0.08)', '--lift': '0 16px 34px rgba(0,0,0,0.38)', '--soft-bad': 'rgba(255,255,255,0.16)', '--soft-good': 'rgba(22,163,148,0.38)', '--good-soft': 'rgba(22,163,148,0.16)', '--bad-soft': 'rgba(232,99,95,0.14)', '--bp-accent': '#5EEAD4' }
    : { '--bg': '#F1F4F8', '--base': '#FFFFFF', '--text': '#0F172A', '--muted': '#64748B', '--hair': 'rgba(15,23,42,0.07)', '--hair-strong': 'rgba(15,23,42,0.12)', '--track': '#EEF2F6', '--tick': '#D9DEE6', '--grid': 'rgba(15,23,42,0.06)', '--ink': '#0F172A', '--ink-on': '#FFFFFF', '--row': '#FFFFFF', '--row-hair': 'rgba(15,23,42,0.08)', '--plate': '#F3F4F7', '--chip': '#F1F2F5', '--lift': '0 16px 34px rgba(15,23,42,0.09)', '--soft-bad': 'rgba(229,72,77,0.28)', '--soft-good': 'rgba(13,148,136,0.30)', '--good-soft': '#E3F6F2', '--bad-soft': '#FDECEC', '--bp-accent': '#0F766E' };

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

      {/* Fills <main> exactly; nothing inside lets the page itself scroll. */}
      <div className="ins-page" data-ins-page={top ? `${top.kind}` : tab} style={{ ...vars, position: 'relative', background: 'var(--bg)', color: 'var(--text)', width: '100%', height: '100%', overflow: 'hidden', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* top black bar */}
        <div style={{ background: isDark ? '#FFFFFF' : '#000000', color: isDark ? '#000000' : '#FFFFFF', borderRadius: 12, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Insights</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', opacity: 0.72 }}>
            <Mail size={12} strokeWidth={2.4} aria-hidden /> {num(p.now.people)} people · campaigns up to {m.campaigns[0]?.started}
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
              <Segmented id="ins-period" label="Period" value={days} options={PERIODS} onChange={(d) => { setDays(d); setView({ page: 0 }); }} reduce={reduce} />
              <span style={{ ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.basis.campaigns} campaigns · against the {days} days before</span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Segmented id="ins-tab" label="Insights" value={top ? null : tab} options={TABS} onChange={go} reduce={reduce} tabs />
                <ExportMenu items={exportItems} />
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) repeat(3, minmax(0,1fr))', gap: 10 }}>
              <RiskKpi p={p} ink={ink} reduce={reduce} onOpen={() => open('risk')} />
              {kpis.map((k, i) => <BarKpi key={k.id} k={k} i={i + 1} ink={ink} reduce={reduce} />)}
            </div>
          </div>

          {/* the base: the tab on show, or a profile grown out of it */}
          <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px 16px 16px', background: 'var(--base)', borderLeft: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', borderRadius: `${L_R}px 0 ${L_R}px ${L_R}px` }}>
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
    </>
  );
};

export default Insights;

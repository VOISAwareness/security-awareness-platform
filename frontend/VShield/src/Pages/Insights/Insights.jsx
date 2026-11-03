import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, FileText } from 'lucide-react';

import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from '../../services/sampleCampaigns';
import { campaignReport } from '../../services/sampleReports';
import { insights, peopleInsights, standsOut } from '../../services/insights';
import { organisation } from '../../services/sampleOrganisation';
import { insightsBook, insightsSummary } from '../../services/insightsExport';
import { peopleFor, samplePeople } from '../../services/insightsPeople';
import { downloadXlsx, xlsxName } from '../../services/xlsx';
import { ExportMenu } from '../Leaderboard/BigPicture';
import dashboardData from '../DashboardAndAnalytics/dashboardData.json';
import TabSummaryIcon from '../../assets/InsightsAssets/TabSummaryIcon.png';
import TabDepartmentsIcon from '../../assets/InsightsAssets/TabDepartmentsIcon.png';
import TabCampaignsIcon from '../../assets/InsightsAssets/TabCampaignsIcon.png';
import TabTrainingIcon from '../../assets/InsightsAssets/TabTrainingIcon.png';
import { Definition, Delta, Explain } from './InsightsBits';
import { useSize } from './useSize';
import { CampaignsPage, DepartmentPage, DepartmentsPage, SummaryPage, TrainingPage } from './InsightsPages';
import { PeopleList } from './InsightsPeopleList';
import { EASE, INK, change, eyebrow, num, small, swap, TYPE, themeVars } from './insightsUi';
import { standing, targetText, targetsWith } from '../../services/insightsTargets';
import { deptTargets } from '../../services/deptTargets';
import { api } from '../../services/api';
import { actorFor } from '../../services/identity';
import { TargetBar, TargetsButton, TargetsEditor } from './InsightsTargets';

// =============================================================================
// Insights: how the organisation stands against its targets, for its leaders.
//
// On the left, four tab cards (Summary, Departments, Campaigns, Training) in
// the Requests & Approvals style, and under them the Scope: the period, a
// department, and what the period holds. On the right, the sheet in its L:
// the corner tile says what the tab shows; along the arm, six measures, each
// against its target (Set targets in the top bar); below, the tab
// (InsightsPages.jsx). There are three levels at most: the tab, a
// department's own charts, and the people behind any bar, row or figure
// (InsightsPeopleList.jsx), which open in the Big Picture too. Green is
// within a target, red past it. It reports; it never says what to do.
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
  .ins-tabcard:hover { border-color: var(--hair-strong); }
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

// The sheet: the corner tile, the sheet wrapping round it in an L with a
// small even gap and a concave corner.
const CAP_W = 236;
const CAP_H = 104;
const L_GAP = 7;
const L_R = 16;
const FILLET = L_R + L_GAP;
// one path round the whole L, so its edge runs unbroken round the concave
// corner; the half-pixel inset keeps the 1px edge sharp
function lPath(w, h, capH) {
  const e = 0.5; const r = L_R; const f = FILLET;
  const x0 = CAP_W + L_GAP; const y1 = capH + L_GAP; const W = w - e; const H = h - e;
  return `M${x0 + r},${e} H${W - r} A${r},${r} 0 0 1 ${W},${e + r} V${H - r} A${r},${r} 0 0 1 ${W - r},${H} H${e + r} A${r},${r} 0 0 1 ${e},${H - r} V${y1 + r} A${r},${r} 0 0 1 ${e + r},${y1} H${x0 - f} A${f},${f} 0 0 0 ${x0},${y1 - f} V${e + r} A${r},${r} 0 0 1 ${x0 + r},${e} Z`;
}

// each tab's card on the left, its colour (its title when picked, its icon)
// and what the corner tile says of it; `measures` are the ones it is about
const TABS = [
  { id: 'summary', label: 'Summary', sub: 'The company against its targets', says: 'The whole company against its targets', art: TabSummaryIcon, color: '#8B5CF6', measures: ['risk', 'highRisk', 'hooked', 'reported', 'gave', 'completion'] },
  { id: 'departments', label: 'Departments', sub: 'Every department, every target', says: 'Each department against every target', art: TabDepartmentsIcon, color: '#3B82F6', measures: ['risk', 'highRisk', 'hooked', 'reported', 'gave', 'completion'] },
  { id: 'campaigns', label: 'Campaigns', sub: 'Phishing campaigns and types', says: 'Every phishing campaign and type', art: TabCampaignsIcon, color: '#F97316', measures: ['hooked', 'reported', 'gave'] },
  { id: 'training', label: 'Training', sub: 'Training and what it changes', says: 'Assigned training by department and programme', art: TabTrainingIcon, color: '#94A3B8', measures: ['completion'] },
];
// where each measure is shown
const HOME = { risk: 'departments', highRisk: 'departments', hooked: 'campaigns', reported: 'campaigns', gave: 'campaigns', completion: 'training' };
const PERIODS = [
  { id: 30, label: '30 days', title: 'The last 30 days' },
  { id: 60, label: '60 days', title: 'The last 60 days' },
  { id: 90, label: '90 days', title: 'The last 90 days' },
];

// The training programmes: the sample the old analytics page showed, until
// the training API reports them.
const TRAINING = { programmes: dashboardData.trainingPrograms };

// Below this the page scrolls rather than squeeze; a laptop is well above it.
const FLOOR = 560;
const LEFT_W = 266;

// The picked card is black, or white on the dark theme, as on Requests & Approvals.
function TabCard({ t, on, onPick, isDark }) {
  const fill = isDark ? '#FFFFFF' : '#000000';
  const ink = isDark ? '#0F172A' : '#FFFFFF';
  return (
    <button type="button" role="tab" aria-selected={on} data-ins-tab={t.id} onClick={onPick} className="ins-tabcard" style={{ position: 'relative', overflow: 'hidden', flexShrink: 0, height: 66, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, padding: '0 64px 0 16px', borderRadius: 14, border: on ? `1px solid ${fill}` : '1px solid var(--card-edge)', background: on ? fill : 'var(--sheet)', color: on ? ink : 'var(--text)', textAlign: 'left', font: 'inherit', cursor: 'pointer', boxShadow: on ? '0 6px 14px rgba(15,23,42,0.16)' : 'none', transition: 'background .2s ease, color .2s ease' }}>
      <span style={{ fontSize: TYPE.figure, fontWeight: 600, letterSpacing: '-0.01em', color: on ? (isDark ? '#0F172A' : t.color) : 'inherit' }}>{t.label}</span>
      <span style={{ fontSize: TYPE.small, fontWeight: 500, color: on ? (isDark ? '#475569' : 'rgba(255,255,255,0.72)') : 'var(--muted)' }}>{t.sub}</span>
      <img src={t.art} alt="" aria-hidden width={56} height={56} style={{ position: 'absolute', right: -8, bottom: -8, width: 56, height: 56, objectFit: 'contain', opacity: on ? 1 : 0.9 }} />
    </button>
  );
}

// The period, and what it holds in six boxes; black, or white on the dark theme.
function ScopeCard({ shownDays, onDays, totals, upTo, reduce, isDark }) {
  const c = isDark
    ? { bg: '#FFFFFF', text: '#0F172A', soft: '#475569', faint: '#64748B', box: '#F1F5F9', track: '#E2E8F0', on: '#0F172A', onText: '#FFFFFF' }
    : { bg: '#0F172A', text: '#FFFFFF', soft: 'rgba(255,255,255,0.72)', faint: 'rgba(255,255,255,0.55)', box: 'rgba(255,255,255,0.07)', track: 'rgba(255,255,255,0.08)', on: '#FFFFFF', onText: '#0F172A' };
  return (
    <section data-ins-scope aria-label="Scope" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', borderRadius: 14, background: c.bg, color: c.text }}>
      <span style={{ ...eyebrow, color: c.faint }}>Scope</span>
      <div role="radiogroup" aria-label="Period" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, padding: 2, borderRadius: 9, background: c.track }}>
        {PERIODS.map((x) => <button key={x.id} type="button" role="radio" aria-checked={shownDays === x.id} title={x.title} data-ins-period={x.id} onClick={() => onDays(x.id)} style={{ height: 26, borderRadius: 7, border: 'none', background: shownDays === x.id ? c.on : 'transparent', color: shownDays === x.id ? c.onText : c.soft, fontSize: TYPE.body, fontWeight: 600, cursor: 'pointer', transition: reduce ? 'none' : 'background .2s ease, color .2s ease' }}>{x.label}</button>)}
      </div>
      <span style={{ fontSize: TYPE.label, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: c.faint }}>In this period</span>
      <div data-ins-totals style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gridAutoRows: 'minmax(0,1fr)', gap: 6 }}>
        {totals.map(([label, v]) => (
          <div key={label} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, padding: '6px 10px', borderRadius: 10, background: c.box }}>
            <strong style={{ fontSize: TYPE.figure, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{num(v)}</strong>
            <span style={{ fontSize: TYPE.small, fontWeight: 500, color: c.soft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          </div>
        ))}
      </div>
      <span style={{ fontSize: TYPE.label, fontWeight: 500, color: c.faint }}>Data up to {upTo}</span>
    </section>
  );
}

// The corner tile: what the tab shows, or the department open.
function CornerTile({ tab, dept, people, onBack, reduce }) {
  const t = TABS.find((x) => x.id === tab);
  return (
    <div data-ins-corner={dept ? 'department' : tab} style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, width: CAP_W, height: CAP_H, boxSizing: 'border-box', borderRadius: L_R, background: 'var(--sheet)', border: '1px solid var(--sheet-edge)', padding: '12px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, overflow: 'hidden' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={dept || tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.15, ease: EASE }} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          {dept ? (
            <>
              <button type="button" className="ins-crumb" data-ins-back onClick={onBack} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 2, padding: 0, border: 'none', background: 'none', color: 'var(--muted)', fontSize: TYPE.small, fontWeight: 600, cursor: 'pointer' }}><ChevronLeft size={12} strokeWidth={2.8} aria-hidden />All departments</button>
              <span style={{ fontSize: TYPE.heading, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept}</span>
              <span style={{ ...small, fontWeight: 600 }}>{num(people)} people</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: TYPE.heading, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text)' }}>{t.label}</span>
              <span style={{ ...small, fontSize: TYPE.body, lineHeight: 1.35 }}>{t.says}</span>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Along the arm: six measures, the company's or, with a department open,
// the department's, on tiles of one size, each on the same rows, centred:
// its name, its figure, its change against the period before, its bar
// against its target, and the target in words. The company's open where
// they are explained. Its change against the period before is in its ⓘ,
// under what the measure means, so the tile stays clean.
const tileStyle = (opens) => ({ minWidth: 0, display: 'grid', justifyItems: 'center', alignContent: 'center', textAlign: 'center', rowGap: 4, padding: '6px 4px', borderRadius: 14, background: 'var(--plate)', color: 'var(--text)', cursor: opens ? 'pointer' : 'default', outline: 'none' });
const STANDING_WORD = { on: 'on track', risk: 'at risk', off: 'off track' };

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

function TargetKpi({ k, ink, reduce, days, dim }) {
  const at = standing(k.scaleValue, k.target);
  const opens = Boolean(k.onOpen);
  const press = opens ? { role: 'button', tabIndex: 0, onClick: k.onOpen, onKeyDown: (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); k.onOpen(); } } } : { role: 'group' };
  return (
    <motion.div {...press} className={opens ? 'ins-kpi' : undefined} data-ins-kpi={k.id} data-ins-standing={at || 'none'} title={k.hint} aria-label={`${k.label}: ${k.format(k.value)}, ${STANDING_WORD[at] || 'no figure'}, target ${k.targetText}${changeWords(k, days)}${opens ? '. Open it' : ''}`} initial={false} animate={{ opacity: dim ? 0.4 : 1 }} transition={{ duration: reduce ? 0 : 0.2, ease: EASE }} style={tileStyle(opens)}>
      <span data-ins-row="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, maxWidth: '100%' }}>
        <span style={{ ...eyebrow, letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</span>
        <Explain label={`What ${k.label} means, and its change`}><Definition term={k.define}><ChangeNote k={k} ink={ink} days={days} /></Definition></Explain>
      </span>
      <span data-ins-row="value" style={{ fontSize: TYPE.number, fontWeight: 600, lineHeight: 1.1, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{k.format(k.value)}</span>
      <span data-ins-row="scale" style={{ width: '100%' }}><TargetBar value={k.scaleValue} target={k.target} ink={ink} /></span>
      <span data-ins-row="target" style={{ ...small, fontWeight: 600, whiteSpace: 'nowrap' }}>Target {k.targetText}</span>
    </motion.div>
  );
}

// One small label that follows the pointer over anything with a data-tip
// ("247 people"): moved by hand, so hovering never re-renders the page, and
// fixed to the window, so no card or table clips it.
function useHoverTip() {
  const el = useRef(null);
  const onMove = (e) => {
    const box = el.current;
    if (!box) return;
    const at = e.target.closest?.('[data-tip]');
    const text = at?.getAttribute('data-tip');
    if (!text) { box.style.opacity = '0'; return; }
    if (box.textContent !== text) box.textContent = text;
    box.style.opacity = '1';
    box.style.transform = `translate(${Math.round(e.clientX + 12)}px, ${Math.round(e.clientY - 30)}px)`;
  };
  const hide = () => { if (el.current) el.current.style.opacity = '0'; };
  const tip = <div ref={el} aria-hidden data-ins-hover-tip style={{ position: 'fixed', left: 0, top: 0, zIndex: 60, opacity: 0, pointerEvents: 'none', padding: '4px 9px', borderRadius: 7, background: '#0F172A', color: '#FFFFFF', fontSize: TYPE.body, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 6px 16px rgba(15,23,42,0.22)', transition: 'opacity .12s ease' }} />;
  return { tip, onMove, hide };
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
  const location = useLocation();
  // back from the Big Picture (or the browser's Back): the view it was opened from
  const restore = location.state?.restore || null;
  const reduce = useReducedMotion();
  const ink = isDark ? INK.dark : INK.light;
  // people are admins' to see, as on the Big Picture
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

  // the period shows at once; what it changes renders in the background
  const [days, setDays] = useState(restore?.days || 30);
  const [shownDays, setShownDays] = useState(restore?.days || 30);
  const [tab, setTab] = useState(restore?.tab || 'summary');
  const [dept, setDept] = useState(restore?.dept || null); // a department's own charts, the second level
  const [who, setWho] = useState(null); // the people behind what was clicked, the third
  const [lBox, { w: lW, h: lH }] = useSize();
  const hover = useHoverTip();

  // Sample campaigns (and those that ended before them) until the reports API lists real ones.
  const items = useMemo(() => [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((c) => ({ campaign: c, report: campaignReport(c, { depts: DEPTS, personAt: person }) })), []);
  const m = useMemo(() => insights(items, { days }), [items, days]);
  // The sample organisation, thirty days at a time, until the people and risk APIs report it.
  const org = useMemo(() => organisation({ end: m.basis.end, steps: 24 }), [m.basis.end]);
  const p = useMemo(() => peopleInsights(org, { days }), [org, days]);
  const list = useMemo(() => standsOut(m, p), [m, p]);
  const depts = useMemo(() => deptTargets(m, p, T), [m, p, T]);
  // The people behind every figure: a sample, one row per person, until
  // GET /people answers with the same rows (services/insightsPeople.js).
  const types = useMemo(() => Object.fromEntries(items.map((x) => [x.campaign.name, x.campaign.type || 'Other'])), [items]);
  const everyone = useMemo(() => samplePeople({ campaigns: Object.keys(types), programmes: TRAINING.programmes.map((x) => x.program) }), [types]);

  const pick = (id) => { setDept(null); startTransition(() => setTab(id)); };
  const openDept = (name) => startTransition(() => { setTab('departments'); setDept(name); });
  const where = dept || TABS.find((t) => t.id === tab)?.label;
  // what was clicked, as the people behind it; in a department, its people only
  const people = (title, filters = {}) => setWho({ title, where, filters: dept ? { department: dept, ...filters } : filters });
  const shown = useMemo(() => (who ? peopleFor(everyone, who.filters, { types }) : []), [who, everyone, types]);

  // The Big Picture's People, narrowed to a department and a campaign type,
  // with the way back. This view is kept on the page's own history entry
  // first, so the browser's Back returns to it too.
  const seePeople = ({ dept: name, lure }) => {
    const back = { days, tab, dept };
    navigate(location.pathname, { replace: true, state: { restore: back } });
    navigate('/leaderboard', { state: { view: 'reports', people: { dept: name || 'all', lure: lure || null }, back: { path: location.pathname, label: ['Insights', name, lure].filter(Boolean).join(' · '), restore: back } } });
  };
  const ctx = { m, p, org, depts, targets: T, ink, isDark, reduce, people, openDept };

  const n = m.now;
  const b = m.before;
  const pctText = (v) => (Number.isFinite(v) ? `${v.toFixed(1)}%` : '—');
  const pct0Text = (v) => (Number.isFinite(v) ? `${Math.round(v)}%` : '—');
  const hundred = (v) => (Number.isFinite(v) ? v * 100 : null);
  const share = (a, of) => (of > 0 ? a / of : null);
  const gave = share(n.compromised, n.delivered);
  const done = p.now.training?.completion ?? null;
  const toHome = (id) => () => pick(HOME[id]);
  // the company's six, each opening the tab it belongs to
  const company = [
    { id: 'risk', define: 'riskScore', label: 'Risk score', value: p.now.score, before: p.before?.score, format: (v) => (Number.isFinite(v) ? v.toFixed(1) : '—'), scaleValue: p.now.score, target: T.riskScore, targetText: targetText(T.riskScore), delta: change(p.now.score, p.before?.score, { kind: 'pts', better: 'down' }), hint: 'Out of 100: under 20 is Low risk' },
    { id: 'highRisk', define: 'highRisk', label: 'High risk', value: hundred(p.now.highRisk / p.now.people), before: hundred(p.before ? p.before.highRisk / p.before.people : null), format: pctText, scaleValue: p.now.highRisk / p.now.people, target: T.highRiskShare, targetText: targetText(T.highRiskShare, '%'), delta: change(p.now.highRisk / p.now.people, p.before ? p.before.highRisk / p.before.people : null, { kind: 'pct', better: 'down' }), hint: `${num(p.now.highRisk)} people at high or critical risk` },
    { id: 'hooked', define: 'hookRate', label: 'Hook rate', value: hundred(n.hooked), before: hundred(b?.hooked), format: pctText, scaleValue: n.hooked, target: T.hookRate, targetText: targetText(T.hookRate, '%'), delta: change(n.hooked, b?.hooked, { kind: 'pct', better: 'down' }), hint: 'Clicked, of the emails delivered' },
    { id: 'reported', define: 'reportRate', label: 'Report rate', value: hundred(n.reportRate), before: hundred(b?.reportRate), format: pctText, scaleValue: n.reportRate, target: T.reportRate, targetText: targetText(T.reportRate, '%'), delta: change(n.reportRate, b?.reportRate, { kind: 'pct', better: 'up' }), hint: 'Reported, of the emails delivered' },
    { id: 'gave', define: 'gaveDetails', label: 'Gave details', value: hundred(gave), before: hundred(b ? share(b.compromised, b.delivered) : null), format: pctText, scaleValue: gave, target: T.gaveDetails, targetText: targetText(T.gaveDetails, '%'), delta: change(gave, b ? share(b.compromised, b.delivered) : null, { kind: 'pct', better: 'down' }), hint: 'Entered details on the practice page, of the emails delivered' },
    { id: 'completion', define: 'trainingCompletion', label: 'Completed', value: hundred(done), before: hundred(p.before?.training?.completion ?? null), format: pct0Text, scaleValue: done, target: T.trainingCompletion, targetText: targetText(T.trainingCompletion, '%'), delta: change(done, p.before?.training?.completion ?? null, { kind: 'pct', better: 'up' }), hint: 'Trainings completed, of those assigned in the period' },
  ];
  // a department's six, the same measures as its row on the Departments tab
  const ofDept = (d) => [
    ['risk', 'riskScore', 'riskScore', 'Risk score'],
    ['highRisk', 'highRiskShare', 'highRisk', 'High risk'],
    ['hooked', 'hookRate', 'hookRate', 'Hook rate'],
    ['reported', 'reportRate', 'reportRate', 'Report rate'],
    ['gave', 'gaveDetails', 'gaveDetails', 'Gave details'],
    ['completion', 'trainingCompletion', 'trainingCompletion', 'Completed'],
  ].map(([id, key, define, label]) => {
    const score = key === 'riskScore';
    return { id, define, label, value: score ? d.now[key] : hundred(d.now[key]), before: score ? d.before[key] : hundred(d.before[key]), format: score ? (v) => (Number.isFinite(v) ? v.toFixed(1) : '—') : key === 'trainingCompletion' ? pct0Text : pctText, scaleValue: d.now[key], target: T[key], targetText: targetText(T[key], score ? '' : '%'), delta: change(d.now[key], d.before[key], { kind: score ? 'pts' : 'pct', better: T[key].better }), hint: `${d.name}: ${label}` };
  });
  const deptRow = dept ? depts.find((d) => d.name === dept) : null;
  const kpis = (deptRow ? ofDept(deptRow) : company).map((k) => ({ ...k, onOpen: deptRow ? undefined : toHome(k.id) }));
  const focus = deptRow ? null : TABS.find((t) => t.id === tab).measures;

  const title = 'Insights';
  const exportItems = [
    { id: 'report', Icon: FileText, label: 'Full report', meta: 'Excel', run: () => downloadXlsx(xlsxName('insights', `last ${days} days`), insightsBook(m, list, TRAINING, { title: `${title} · last ${days} days`, p })) },
    { id: 'copy', Icon: Copy, label: 'Copy a summary', doneLabel: 'Copied', apart: true, run: () => navigator.clipboard?.writeText(insightsSummary(m, list, title)).catch(() => {}) },
  ];
  const totals = [
    ['Campaigns', m.basis.campaigns],
    ['Emails delivered', n.delivered],
    ['People', p.now.people],
    ['Departments', p.departments.length],
    ['Emails reported', n.reported],
    ['Trainings assigned', p.now.training?.assigned],
  ];
  const upTo = new Date(m.basis.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

  // the page's colours (insightsUi.js)
  const vars = themeVars(isDark);
  const key = deptRow ? `d-${dept}` : `t-${tab}`;
  const body = deptRow ? <DepartmentPage ctx={ctx} name={dept} />
    : tab === 'summary' ? <SummaryPage ctx={ctx} />
      : tab === 'departments' ? <DepartmentsPage ctx={ctx} />
        : tab === 'campaigns' ? <CampaignsPage ctx={ctx} />
          : <TrainingPage ctx={ctx} programmes={TRAINING.programmes} />;

  return (
    <>
      <style>{FONT_IMPORT}</style>

      <div className="ins-page" data-ins-page={deptRow ? 'department' : tab} onMouseMove={hover.onMove} onMouseLeave={hover.hide} onClick={hover.hide} style={{ ...vars, position: 'relative', background: 'var(--bg-edge)', color: 'var(--text)', width: '100%', height: '100%', overflowX: 'hidden', overflowY: 'auto' }}>
        <div className="ins-sheet" style={{ position: 'relative', isolation: 'isolate', height: '100%', minHeight: FLOOR, boxSizing: 'border-box', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -1, background: 'var(--bg)', pointerEvents: 'none' }} />

          {/* top bar: black on the light theme, glass on the dark */}
          <div style={{ background: isDark ? 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' : '#000000', border: isDark ? '1px solid var(--card-edge)' : 'none', boxSizing: 'border-box', color: isDark ? 'var(--text)' : '#FFFFFF', borderRadius: 12, height: 42, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 0 18px', flexShrink: 0 }}>
            <span style={{ fontSize: TYPE.title, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Insights</span>
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {canSetTargets && <TargetsButton onClick={() => setEditing(true)} isDark={isDark} />}
              <ExportMenu items={exportItems} />
            </span>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12 }}>
            {/* the tabs, and the scope under them */}
            <nav aria-label="Insights" style={{ width: LEFT_W, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
              <div role="tablist" aria-orientation="vertical" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {TABS.map((t) => <TabCard key={t.id} t={t} on={tab === t.id} onPick={() => pick(t.id)} isDark={isDark} />)}
              </div>
              <ScopeCard
                shownDays={shownDays}
                onDays={(d) => { setShownDays(d); startTransition(() => setDays(d)); }}
                totals={totals}
                upTo={upTo}
                reduce={reduce}
                isDark={isDark}
              />
            </nav>

            {/* the sheet, in its L */}
            <div ref={lBox} style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {lW > 0 && lH > 0 && (
                <svg aria-hidden width={lW} height={lH} style={{ position: 'absolute', inset: 0, zIndex: 0, display: 'block', overflow: 'visible', pointerEvents: 'none' }}>
                  <path d={lPath(lW, lH, CAP_H)} transform="translate(0 3)" fill="none" stroke="var(--l-shadow)" strokeOpacity={0.35} strokeWidth={8} strokeLinejoin="round" />
                  <path d={lPath(lW, lH, CAP_H)} fill="var(--sheet)" stroke="var(--sheet-edge)" strokeWidth={1} />
                </svg>
              )}
              <CornerTile tab={tab} dept={deptRow ? dept : null} people={deptRow?.people} onBack={() => setDept(null)} reduce={reduce} />

              {/* the arm: six measures, each against its target */}
              <div style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, boxSizing: 'border-box', flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0,1fr))', gap: 6, padding: `10px 10px ${L_GAP + 3}px 12px`, position: 'relative' }}>
                {kpis.map((k) => <TargetKpi key={k.id} k={k} ink={ink} reduce={reduce} days={m.basis.days} dim={focus && !focus.includes(k.id)} />)}
              </div>

              {/* the base: the tab on show, or a department's own charts */}
              <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px 14px 14px' }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={key} {...swap(reduce)} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {body}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
      {hover.tip}
      {who && (
        <PeopleList
          title={who.title}
          where={who.where}
          rows={shown}
          isDark={isDark}
          reduce={reduce}
          onBigPicture={canSeePeople ? (picked) => seePeople({ dept: picked.department || who.filters.department, lure: who.filters.campaignType || types[who.filters.campaign] }) : undefined}
          onClose={() => setWho(null)}
        />
      )}
      {editing && <TargetsEditor saved={saved} now={{ riskScore: p.now.score, highRiskShare: p.now.highRisk / p.now.people, hookRate: n.hooked, reportRate: n.reportRate, gaveDetails: gave, firstReport: n.firstReport, trainingCompletion: done }} depts={depts} isDark={isDark} reduce={reduce} onSave={saveTargets} onClose={() => setEditing(false)} />}
    </>
  );
};

export default Insights;

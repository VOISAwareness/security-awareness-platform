import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, FileText } from 'lucide-react';

import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { insights, peopleInsights, standsOut } from '../../services/insights';
import { useInsightsData } from '../../services/insightsData';
import { insightsBook, insightsSummary } from '../../services/insightsExport';
import { DRIVERS } from '../../services/insightsPeople';
import { downloadXlsx, xlsxName } from '../../services/xlsx';
import { ExportMenu } from '../Leaderboard/BigPicture';
import TabSummaryIcon from '../../assets/InsightsAssets/TabSummaryIcon.png';
import TabDepartmentsIcon from '../../assets/InsightsAssets/TabDepartmentsIcon.png';
import TabCampaignsIcon from '../../assets/InsightsAssets/TabCampaignsIcon.png';
import TabTrainingIcon from '../../assets/InsightsAssets/TabTrainingIcon.png';
import { Definition, Delta, Explain } from './InsightsBits';
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
// the Requests & Approvals style, and under them what the period holds. The
// period (30, 60 or 90 days, in the top bar) is the whole page's. On the
// right, one plain sheet: a heading says which tab (or department) is open;
// under it, seven measures, each against its target (Set targets in the top
// bar); below, the tab (InsightsPages.jsx). There are three levels at most:
// the tab, a department's own charts, and the people behind any bar, row or
// figure (InsightsPeopleList.jsx), which open in the Big Picture too. Green
// is within a target, red past it. It reports; it never says what to do.
// =============================================================================

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&display=swap');
  .ins-page { font-family: 'Segoe UI', Arial, sans-serif; scrollbar-width: thin; }
  .ins-scroll { overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--hair-strong) transparent; }
  /* short cards drop what they can do without, so nothing spills or scrolls */
  @container (max-height: 250px) { .ins-optional { display: none !important; } .ins-big { font-size: 30px !important; } }
  @container (max-height: 480px) { .ins-optional-tall { display: none !important; } }
  @container (max-height: 250px) { .ins-cbar { height: 22px !important; } .ins-vs { gap: 5px !important; } .ins-vs-head { margin-bottom: 2px !important; } .ins-vs-bar { height: 10px !important; } .ins-vs-row + .ins-vs-row { margin-top: 3px !important; } }
  @container (max-height: 460px) { .ins-prof-sub { display: none !important; } .ins-prof-head { padding-top: 7px !important; padding-bottom: 7px !important; } }

  /* Cards settle on hover; what opens something lifts a little and its arrow nudges */
  .ins-card { transition: box-shadow .25s ease, border-color .25s ease, background-color .25s ease; }
  .ins-card:hover { border-color: var(--hair-strong) !important; }
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
  /* the period switch, in frosted glass: a translucent track, the picked
     period a raised pane of glass with a bright top edge */
  .ins-glass { background: linear-gradient(180deg, rgba(15,23,42,0.05), rgba(15,23,42,0.02)); border: 1px solid rgba(15,23,42,0.06); box-shadow: inset 0 1px 2px rgba(15,23,42,0.06); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
  .ins-glass .ins-period[aria-checked="true"] { background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7)) !important; border-color: rgba(255,255,255,0.9) !important; box-shadow: 0 4px 12px rgba(15,23,42,0.1), inset 0 1px 0 rgba(255,255,255,1) !important; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  .ins-glass .ins-period[aria-checked="false"]:hover { background: rgba(255,255,255,0.55) !important; color: var(--text) !important; }
  .dark .ins-glass { background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); border-color: rgba(255,255,255,0.08); box-shadow: inset 0 1px 2px rgba(0,0,0,0.3); }
  .dark .ins-glass .ins-period[aria-checked="true"] { background: linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08)) !important; border-color: rgba(255,255,255,0.18) !important; box-shadow: 0 4px 14px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.22) !important; }
  .dark .ins-glass .ins-period[aria-checked="false"]:hover { background: rgba(255,255,255,0.08) !important; }
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

  /* No pop-up entrance on charts and cards */
  .ins-rise, .ins-pop-in, .ins-pop { animation: none !important; }

  /* The clay pieces float, very slowly */
  @keyframes ins-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-5px) rotate(1deg); } }
  .ins-float { animation: ins-float 7s ease-in-out infinite; }

  @media (prefers-reduced-motion: reduce) {
    .ins-card, .ins-kpi, .ins-row, .ins-go, .ins-find, .ins-arrow, .ins-go-arrow { transition: none !important; }
    .ins-float, .ins-in-x, .ins-rise, .ins-pop-in, .ins-pop, .ins-grow-x, .ins-fade { animation: none !important; }
  }
`;

// The sheet: one plain rounded panel (no corner tile, no L).
const SHEET_R = 10;
const KPI_H = 104; // height of the row of measures

// each tab's card on the left, its colour (its title when picked, its icon);
// `measures` are the ones it is about
const TABS = [
  { id: 'summary', label: 'Summary', sub: 'The company against its targets', art: TabSummaryIcon, color: '#8B5CF6', measures: ['risk', 'highRisk', 'opened', 'hooked', 'reported', 'gave', 'completion'] },
  { id: 'departments', label: 'Departments', sub: 'Every department, every target', art: TabDepartmentsIcon, color: '#3B82F6', measures: ['risk', 'highRisk', 'opened', 'hooked', 'reported', 'gave', 'completion'] },
  { id: 'campaigns', label: 'Campaigns', sub: 'Phishing campaigns and types', art: TabCampaignsIcon, color: '#F97316', measures: ['opened', 'hooked', 'reported', 'gave'] },
  { id: 'training', label: 'Training', sub: 'Training and what it changes', art: TabTrainingIcon, color: '#94A3B8', measures: ['completion'] },
];
// where each measure is shown
const HOME = { risk: 'departments', highRisk: 'departments', opened: 'campaigns', hooked: 'campaigns', reported: 'campaigns', gave: 'campaigns', completion: 'training' };
const PERIODS = [
  { id: 30, label: '30 days', title: 'The last 30 days' },
  { id: 60, label: '60 days', title: 'The last 60 days' },
  { id: 90, label: '90 days', title: 'The last 90 days' },
];

// Below this the page scrolls rather than squeeze; a laptop is well above it.
const FLOOR = 560;
const PAGE_DAYS = 30;
const DID_NOTE = { clicked: 'Clicked', reported: 'Reported', gave: 'Gave details away', twice: 'Clicked 2+ times' };
const LEFT_W = 266;

// The picked card is black, or white on the dark theme, as on Requests & Approvals.
function TabCard({ t, on, onPick, isDark }) {
  const fill = isDark ? '#FFFFFF' : '#000000';
  const ink = isDark ? '#0F172A' : '#FFFFFF';
  // the same card as Requests & Approvals: a 15.5px bold title, a 9px line
  return (
    <button type="button" role="tab" aria-selected={on} data-ins-tab={t.id} onClick={onPick} className="ins-tabcard" style={{ position: 'relative', overflow: 'hidden', flexShrink: 0, height: 72, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 12, borderRadius: 10, border: on ? `1px solid ${fill}` : '1px solid var(--card-edge)', background: on ? fill : 'var(--sheet)', color: on ? ink : 'var(--text)', textAlign: 'left', font: 'inherit', cursor: 'pointer', boxShadow: on ? '0 4px 10px rgba(15,23,42,0.14)' : 'none', transition: 'background .2s ease, color .2s ease' }}>
      <span className="text-[15.5px] font-bold tracking-tight leading-tight" style={{ position: 'relative', zIndex: 1, color: on ? (isDark ? '#0F172A' : t.color) : 'inherit' }}>{t.label}</span>
      <span className="text-[9px] font-medium leading-tight" style={{ position: 'relative', zIndex: 1, maxWidth: 170, color: on ? (isDark ? '#334155' : '#CBD5E1') : (isDark ? '#94A3B8' : '#64748B') }}>{t.sub}</span>
      <img src={t.art} alt="" aria-hidden width={56} height={56} style={{ position: 'absolute', right: -8, bottom: -8, width: 56, height: 56, objectFit: 'contain' }} />
    </button>
  );
}

// "7 Oct – 5 Nov": the period's first and last day
const dayText = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const rangeText = (from, end) => `${dayText(from + 86400000)} – ${dayText(end)}`;

// The period for the whole page, in the top bar: every tile, chart, table
// and total below is over it, and each change is against the period before.
function PeriodSwitch({ shownDays, onDays, range, isDark, reduce }) {
  const track = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)';
  return (
    <span data-ins-period-switch style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: TYPE.small, fontWeight: 600, opacity: 0.8 }}>Showing</span>
      <span role="radiogroup" aria-label="Period for the whole page" style={{ display: 'inline-flex', gap: 2, padding: 2, borderRadius: 9, background: track }}>
        {PERIODS.map((x) => {
          const on = shownDays === x.id;
          return <button key={x.id} type="button" role="radio" aria-checked={on} title={x.title} data-ins-period={x.id} className={on ? undefined : 'ins-bar-btn'} onClick={() => onDays(x.id)} style={{ height: 26, padding: '0 10px', borderRadius: 7, border: 'none', background: on ? '#FFFFFF' : 'transparent', color: on ? '#0F172A' : 'inherit', fontSize: TYPE.small, fontWeight: on ? 700 : 500, cursor: 'pointer', transition: reduce ? 'none' : 'background .2s ease, color .2s ease' }}>{x.label}</button>;
        })}
      </span>
      <span data-ins-range style={{ fontSize: TYPE.small, fontWeight: 600, opacity: 0.8, whiteSpace: 'nowrap' }}>{range}</span>
    </span>
  );
}

// What the period holds, in six boxes, on a light card like the tabs.
function ScopeCard({ totals, range }) {
  return (
    <section data-ins-scope aria-label="In this period" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', borderRadius: 14, border: '1px solid var(--card-edge)', background: 'var(--sheet)', color: 'var(--text)' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span style={eyebrow}>In this period</span><span style={{ ...small, fontWeight: 700 }}>{range}</span></span>
      <div data-ins-totals style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gridAutoRows: 'minmax(0,1fr)', gap: 6 }}>
        {totals.map(([label, v]) => (
          <div key={label} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, padding: '6px 10px', borderRadius: 10, background: 'var(--plate)' }}>
            <strong style={{ fontSize: TYPE.figure, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{num(v)}</strong>
            <span style={{ ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// The sheet's heading: the tab's name, or the department open with the way
// back. (Replaces the old corner tile; no description line.)
function SheetHeading({ tab, dept, people, onBack, reduce }) {
  const t = TABS.find((x) => x.id === tab);
  return (
    <div data-ins-corner={dept ? 'department' : tab} style={{ flexShrink: 0, padding: '14px 18px 0' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={dept || tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.15, ease: EASE }} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          {dept ? (
            <>
              <button type="button" className="ins-crumb" data-ins-back onClick={onBack} style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 2, padding: 0, border: 'none', background: 'none', color: 'var(--muted)', fontSize: TYPE.small, fontWeight: 700, cursor: 'pointer' }}><ChevronLeft size={12} strokeWidth={2.8} aria-hidden />All departments</button>
              <span style={{ fontSize: TYPE.heading, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept}</span>
              <span style={{ ...small, fontWeight: 700 }}>{num(people)} people</span>
            </>
          ) : (
            <span style={{ fontSize: TYPE.heading, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--text)' }}>{t.label}</span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Under the heading: seven measures (Open rate has no target), the company's
// or, with a department open, the department's, on tiles of one size, each on
// the same rows, centred: its name, its figure, its bar against its target,
// and the target in words. The company's open where they are explained. Its
// change against the period before is in its ⓘ, under what the measure
// means, so the tile stays clean.
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

// a measure with no target (Open rate): its share on a plain bar
function PlainBar({ value }) {
  const w = Number.isFinite(value) ? Math.max(0, Math.min(100, value * 100)) : 0;
  return (
    <span aria-hidden style={{ position: 'relative', display: 'block', width: '100%', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--tick)' }}>
      <span className="ins-grow-x" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${w}%`, background: 'var(--muted)', borderRadius: '0 999px 999px 0', transformOrigin: 'left' }} />
    </span>
  );
}

function TargetKpi({ k, ink, reduce, days, dim }) {
  const at = k.target ? standing(k.scaleValue, k.target) : null;
  const opens = Boolean(k.onOpen);
  const press = opens ? { role: 'button', tabIndex: 0, onClick: k.onOpen, onKeyDown: (e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); k.onOpen(); } } } : { role: 'group' };
  return (
    <motion.div {...press} className={opens ? 'ins-kpi' : undefined} data-ins-kpi={k.id} data-ins-standing={at || 'none'} aria-label={`${k.label}: ${k.format(k.value)}, ${k.target ? `${STANDING_WORD[at] || 'no figure'}, target ${k.targetText}` : 'no target'}${changeWords(k, days)}${opens ? '. Open it' : ''}`} initial={false} animate={{ opacity: dim ? 0.4 : 1 }} transition={{ duration: reduce ? 0 : 0.2, ease: EASE }} style={tileStyle(opens)}>
      <span data-ins-row="eyebrow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 0, maxWidth: '100%' }}>
        {/* on a narrow window the name takes two lines rather than being cut short */}
        <span style={{ ...eyebrow, letterSpacing: '0.02em', lineHeight: 1.15, textAlign: 'center', overflowWrap: 'normal' }}>{k.label}</span>
        <Explain label={`What ${k.label} means, and its change`}><Definition term={k.define}><ChangeNote k={k} ink={ink} days={days} /></Definition></Explain>
      </span>
      <span data-ins-row="value" style={{ fontSize: TYPE.number, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{k.format(k.value)}</span>
      <span data-ins-row="scale" style={{ width: '100%' }}>{k.target ? <TargetBar value={k.scaleValue} target={k.target} ink={ink} /> : <PlainBar value={k.scaleValue} />}</span>
      <span data-ins-row="target" style={{ ...small, fontWeight: 700, whiteSpace: 'nowrap' }}>{k.target ? `Target ${k.targetText}` : 'No target'}</span>
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
  const tip = <div ref={el} aria-hidden data-ins-hover-tip style={{ position: 'fixed', left: 0, top: 0, zIndex: 60, opacity: 0, pointerEvents: 'none', padding: '4px 9px', borderRadius: 7, background: '#0F172A', color: '#FFFFFF', fontSize: TYPE.body, fontWeight: 700, whiteSpace: 'nowrap', boxShadow: '0 6px 16px rgba(15,23,42,0.22)', transition: 'opacity .12s ease' }} />;
  return { tip, onMove, hide };
}

// GET/PUT /insights-targets' answer as the page keeps it; anything else
// (an older API, a stub) reads as nothing set
const savedOf = (r) => {
  const ok = r && typeof r === 'object' && !Array.isArray(r);
  return { targets: ok && r.targets && typeof r.targets === 'object' ? r.targets : {}, version: ok && Number.isInteger(r.version) ? r.version : 0, modifiedBy: ok ? r.modifiedBy ?? null : null, modifiedAt: ok ? r.modifiedAt ?? null : null, failed: false };
};

// What the page shows while GET /insights answers, or if it cannot.
function Waiting({ status, error, retry, isDark }) {
  const failed = status === 'failed';
  return (
    <div className="ins-page" data-ins-state={status} style={{ ...themeVars(isDark), width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'transparent', color: 'var(--text)' }}>
      <div role={failed ? 'alert' : 'status'} style={{ display: 'grid', justifyItems: 'center', gap: 10, textAlign: 'center', maxWidth: 360, padding: 16 }}>
        <strong style={{ fontSize: TYPE.figure, fontWeight: 800 }}>{failed ? 'Insights could not be loaded' : 'Working out Insights…'}</strong>
        <span style={{ ...small, fontSize: TYPE.body }}>{failed ? (error?.status === 403 ? 'Insights is for admins, campaign creators and campaign managers.' : error?.message || 'Try again in a minute.') : 'From every campaign, recipient and training record.'}</span>
        {failed && error?.status !== 403 && <button type="button" onClick={retry} style={{ height: 32, padding: '0 14px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}>Try again</button>}
      </div>
    </div>
  );
}

// Insights: the real campaigns, people and training from GET /insights
// (services/insightsData.js), worked out by the pure functions in services/.
const Insights = () => {
  const { isDark, user } = useUserType() || {};
  const source = useInsightsData(user?.role);
  if (source.status !== 'ready') return <Waiting {...source} isDark={isDark} />;
  return <InsightsView data={source.data} />;
};

function InsightsView({ data }) {
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

  // The period (30, 60 or 90 days) is the whole page's: the tiles, charts,
  // tables and totals are over it, each change against the period before.
  // The switch shows at once; what it changes renders in the background.
  const [scopeDays, setScopeDaysNow] = useState(restore?.scopeDays || PAGE_DAYS);
  const [days, setDays] = useState(restore?.scopeDays || PAGE_DAYS);
  const setScopeDays = (d) => { setScopeDaysNow(d); startTransition(() => setDays(d)); };
  const [tab, setTab] = useState(restore?.tab || 'summary');
  const [dept, setDept] = useState(restore?.dept || null); // a department's own charts, the second level
  const [who, setWho] = useState(null); // the people behind what was clicked, the third
  const hover = useHoverTip();

  // the sent campaigns' reports, and the organisation thirty days at a time,
  // each ending at the moment GET /insights worked them out
  const { items, org, asOf } = data;
  const m = useMemo(() => insights(items, { days, now: asOf }), [items, days, asOf]);
  const p = useMemo(() => peopleInsights(org, { days }), [org, days]);
  const list = useMemo(() => standsOut(m, p), [m, p]);
  const depts = useMemo(() => deptTargets(m, p, T), [m, p, T]);
  const types = useMemo(() => Object.fromEntries(items.map((x) => [x.campaign.name, x.campaign.type || 'Other'])), [items]);
  // one row per person, which every people list filters and the department
  // charts count from (services/insightsPeople.js)
  const table = data.people;
  // the training programmes over the period (or, from a source without
  // them per step, over the year)
  const TRAINING = { programmes: p.now.programmes?.length ? p.now.programmes : data.programmes.map((x) => ({ ...x, completion: x.completion / 100, quizScore: x.score, quizPassRate: x.pass == null ? null : x.pass / 100 })) };

  const pick = (id) => { setDept(null); startTransition(() => setTab(id)); };
  const openDept = (name) => startTransition(() => { setTab('departments'); setDept(name); });
  const where = dept || TABS.find((t) => t.id === tab)?.label;
  // what was clicked, as the people behind it; in a department, its people only
  // What was clicked, as the people list's filters: a department, the
  // campaigns (one, or every one of a type) and the levels are chosen in its
  // filters, ticked; the rest (who clicked, a reason, a training step, a
  // month) holds for the whole list and is named under its title.
  const people = (title, filters = {}) => {
    const { department, campaign, campaignType, level, levels, monthLabel, ...fixed } = dept ? { department: dept, ...filters } : filters;
    const campaigns = campaign ? [campaign] : campaignType ? Object.keys(types).filter((c) => types[c] === campaignType) : [];
    const notes = [
      monthLabel && `Risk level in ${monthLabel}`,
      fixed.did && DID_NOTE[fixed.did],
      fixed.driver && DRIVERS.find((d) => d.key === fixed.driver)?.rule,
      fixed.step && `Training: ${fixed.step}${fixed.step === 'Not started' ? '' : ' or further'}`,
    ].filter(Boolean);
    setWho({ title, where, picked: { department: department ? [department] : [], campaign: campaigns, level: levels || (level ? [level] : []) }, fixed, notes, lure: campaignType || types[campaign] || null });
  };

  // The Big Picture's People, narrowed to a department and a campaign type,
  // with the way back. This view is kept on the page's own history entry
  // first, so the browser's Back returns to it too.
  const seePeople = ({ dept: name, lure }) => {
    const back = { scopeDays, tab, dept };
    navigate(location.pathname, { replace: true, state: { restore: back } });
    navigate('/leaderboard', { state: { view: 'reports', people: { dept: name || 'all', lure: lure || null }, back: { path: location.pathname, label: ['Insights', name, lure].filter(Boolean).join(' · '), restore: back } } });
  };
  const ctx = { m, p, org, depts, table, types, targets: T, ink, isDark, reduce, people, openDept };

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
    { id: 'risk', define: 'riskScore', label: 'Risk score', value: p.now.score, before: p.before?.score, format: (v) => (Number.isFinite(v) ? v.toFixed(1) : '—'), scaleValue: p.now.score, target: T.riskScore, targetText: targetText(T.riskScore), delta: change(p.now.score, p.before?.score, { kind: 'pts', better: 'down' }) },
    { id: 'highRisk', define: 'highRisk', label: 'High risk', value: hundred(p.now.highRisk / p.now.people), before: hundred(p.before ? p.before.highRisk / p.before.people : null), format: pctText, scaleValue: p.now.highRisk / p.now.people, target: T.highRiskShare, targetText: targetText(T.highRiskShare, '%'), delta: change(p.now.highRisk / p.now.people, p.before ? p.before.highRisk / p.before.people : null, { kind: 'pct', better: 'down' }) },
    { id: 'opened', define: 'openRate', label: 'Open rate', value: hundred(n.openRate), before: hundred(b?.openRate), format: pctText, scaleValue: n.openRate, target: null, targetText: '', delta: change(n.openRate, b?.openRate, { kind: 'pct', better: null }) },
    { id: 'hooked', define: 'hookRate', label: 'Hook rate', value: hundred(n.hooked), before: hundred(b?.hooked), format: pctText, scaleValue: n.hooked, target: T.hookRate, targetText: targetText(T.hookRate, '%'), delta: change(n.hooked, b?.hooked, { kind: 'pct', better: 'down' }) },
    { id: 'reported', define: 'reportRate', label: 'Report rate', value: hundred(n.reportRate), before: hundred(b?.reportRate), format: pctText, scaleValue: n.reportRate, target: T.reportRate, targetText: targetText(T.reportRate, '%'), delta: change(n.reportRate, b?.reportRate, { kind: 'pct', better: 'up' }) },
    { id: 'gave', define: 'gaveDetails', label: 'Compromise rate', value: hundred(gave), before: hundred(b ? share(b.compromised, b.delivered) : null), format: pctText, scaleValue: gave, target: T.gaveDetails, targetText: targetText(T.gaveDetails, '%'), delta: change(gave, b ? share(b.compromised, b.delivered) : null, { kind: 'pct', better: 'down' }) },
    { id: 'completion', define: 'trainingCompletion', label: 'Trained rate', value: hundred(done), before: hundred(p.before?.training?.completion ?? null), format: pct0Text, scaleValue: done, target: T.trainingCompletion, targetText: targetText(T.trainingCompletion, '%'), delta: change(done, p.before?.training?.completion ?? null, { kind: 'pct', better: 'up' }) },
  ];
  // a department's seven, the same measures as its row on the Departments tab
  const ofDept = (d) => [
    ['risk', 'riskScore', 'riskScore', 'Risk score'],
    ['highRisk', 'highRiskShare', 'highRisk', 'High risk'],
    ['opened', 'openRate', 'openRate', 'Open rate'],
    ['hooked', 'hookRate', 'hookRate', 'Hook rate'],
    ['reported', 'reportRate', 'reportRate', 'Report rate'],
    ['gave', 'gaveDetails', 'gaveDetails', 'Compromise rate'],
    ['completion', 'trainingCompletion', 'trainingCompletion', 'Trained rate'],
  ].map(([id, key, define, label]) => {
    const score = key === 'riskScore';
    const t = T[key] || null; // Open rate has no target
    return { id, define, label, value: score ? d.now[key] : hundred(d.now[key]), before: score ? d.before[key] : hundred(d.before[key]), format: score ? (v) => (Number.isFinite(v) ? v.toFixed(1) : '—') : key === 'trainingCompletion' ? pct0Text : pctText, scaleValue: d.now[key], target: t, targetText: t ? targetText(t, score ? '' : '%') : '', delta: change(d.now[key], d.before[key], { kind: score ? 'pts' : 'pct', better: t ? t.better : null }) };
  });
  const deptRow = dept ? depts.find((d) => d.name === dept) : null;
  const kpis = (deptRow ? ofDept(deptRow) : company).map((k) => ({ ...k, onOpen: deptRow ? undefined : toHome(k.id) }));
  const focus = deptRow ? null : TABS.find((t) => t.id === tab).measures;

  const title = 'Insights';
  const exportItems = [
    { id: 'report', Icon: FileText, label: 'Full report', meta: 'Excel', run: () => downloadXlsx(xlsxName('insights', `last ${days} days`), insightsBook(m, list, TRAINING, { title: `${title} · last ${days} days`, p, source: 'VShield' })) },
    { id: 'copy', Icon: Copy, label: 'Copy a summary', doneLabel: 'Copied', apart: true, run: () => navigator.clipboard?.writeText(insightsSummary(m, list, title)).catch(() => {}) },
  ];
  const totals = [
    ['Campaigns', m.basis.campaigns],
    ['Emails delivered', m.now.delivered],
    ['People', p.now.people],
    ['Departments', p.departments.length],
    ['Emails reported', m.now.reported],
    ['Trainings assigned', p.now.training?.assigned],
  ];
  const range = rangeText(m.basis.from, m.basis.end);

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

      {/* no canvas colour: the page sits on whatever is behind it */}
      <div className="ins-page" data-ins-page={deptRow ? 'department' : tab} onMouseMove={hover.onMove} onMouseLeave={hover.hide} onClick={hover.hide} style={{ ...vars, position: 'relative', background: 'transparent', color: 'var(--text)', width: '100%', height: '100%', overflowX: 'hidden', overflowY: 'auto', marginTop: '-8px' }}>
        <div className="ins-sheet" style={{ position: 'relative', isolation: 'isolate', height: '100%', minHeight: FLOOR, boxSizing: 'border-box', padding: '6px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* top bar: black on the light theme, glass on the dark */}
          <div style={{ background: isDark ? 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' : '#000000', border: isDark ? '1px solid var(--card-edge)' : 'none', boxSizing: 'border-box', color: isDark ? 'var(--text)' : '#FFFFFF', borderRadius: 10, height: 38, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 0 24px', flexShrink: 0 }}>
            <h1 className="text-[13.5px] font-bold tracking-tight uppercase" style={{ margin: 0 }}>Insights</h1>
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <PeriodSwitch shownDays={scopeDays} onDays={setScopeDays} range={range} isDark={isDark} reduce={reduce} />
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
              <ScopeCard totals={totals} range={range} />
            </nav>

            {/* the sheet: one plain rounded panel */}
            <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', background: 'var(--sheet)', border: '1px solid var(--sheet-edge)', borderRadius: SHEET_R, overflow: 'hidden' }}>
              
              {/* the measures, each against its target (Open rate has none) */}
              <div style={{ height: KPI_H, boxSizing: 'border-box', flexShrink: 0, display: 'grid', gridTemplateColumns: `repeat(${kpis.length}, minmax(0,1fr))`, gap: 6, padding: '12px 14px 0', marginTop: 8, position: 'relative' }}>
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
          rows={table.rows}
          picked={who.picked}
          fixed={who.fixed}
          notes={who.notes}
          types={types}
          isDark={isDark}
          reduce={reduce}
          onBigPicture={canSeePeople ? (picked) => seePeople({ dept: picked.department.length === 1 ? picked.department[0] : null, lure: who.lure }) : undefined}
          onClose={() => setWho(null)}
        />
      )}
      {editing && <TargetsEditor saved={saved} now={{ riskScore: p.now.score, highRiskShare: p.now.highRisk / p.now.people, hookRate: n.hooked, reportRate: n.reportRate, gaveDetails: gave, firstReport: n.firstReport, trainingCompletion: done }} depts={depts} isDark={isDark} reduce={reduce} onSave={saveTargets} onClose={() => setEditing(false)} />}
    </>
  );
}

export default Insights;
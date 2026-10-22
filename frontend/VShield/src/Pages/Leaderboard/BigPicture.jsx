import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Building2, CalendarDays, Check, ChevronDown, ChevronRight, Copy, Download, FileSpreadsheet, FileText, LayoutGrid, Minus, Users } from 'lucide-react';

import { breakdown, count, findings, share, story } from '../../services/bigPictureFindings';
import { departmentsBook, findingBook, peopleBook, reportBook } from '../../services/bigPictureExport';
import { departmentsShown, findingPeople, peopleFiltered, peopleShown, verdict } from '../../services/bigPictureViews';
import { downloadXlsx, xlsxName } from '../../services/xlsx';
import { progress } from '../../services/bigPictureTrend';
import { FindingDetail } from './BigPictureDetail';
import { DepartmentPeople, DepartmentTable, PeopleTable } from './BigPictureTables';
import { REPORT_INK } from './reportInk';
import { TONE_ART, TONE_TINT, VERDICT_ART } from './bigPictureArt';

// The Big Picture: the leaderboard's reporting view for leaders and admins.
//
// It reports what the board shows; it never says what to do. It reads as a
// story, top to bottom and then left to right:
//   - along the top, the Security Pulse (the Campaign Pulse for one
//     campaign): are people improving through the phishing simulations?
//     The verdict, then per person, in the app's own terms: Avg Points
//     (and from what), Report Points earned and Hook Points lost;
//   - needs attention, going well, what could happen next: three findings
//     at most in each, every one a number, a line and where it sits.
// A finding opens to its detail: by department, and (admins) who exactly.
// People and Departments list everyone one by one. Their tabs, and the one
// Export menu (what you are looking at, the full report, a summary to
// paste), sit in the top-right corner, so the base is all story.
//
// Colours: teal for better, red for worse, checked for colour-blind
// separation on both themes; every arrow has its number beside it and every
// tone its own clay icon and word, never colour alone.

const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };
const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };

const VERDICT = {
  improving: { word: 'Improving', tile: '#D0FBDF' },
  steady: { word: 'Steady', tile: '#F3E7FD' },
  slipping: { word: 'Declining', tile: '#FBD3D3' },
};
const whole = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${whole(Math.abs(n))}`;

// Along the top: one slim strip answering the first question, are people
// improving through the phishing simulations? The verdict with its clay
// trend, then the numbers behind it, per person, named as the rest of the
// app names them (Report Rate, Hook Rate): Avg Points now (and before),
// Report Points earned by reporting, Hook Points lost to clicks and
// details given away. Over the organisation's period (30, 60 or 90 days);
// from one campaign for it.
function ProgressStrip({ r, campaign, ink, isDark }) {
  const p = progress(r, { campaign });
  const { word, tile } = VERDICT[p.word];
  const Arrow = p.word === 'improving' ? ArrowUpRight : p.word === 'slipping' ? ArrowDownRight : Minus;
  const arrow = p.word === 'improving' ? ink.good : p.word === 'slipping' ? ink.bad : 'var(--muted)';
  const cells = [
    { id: 'average', label: 'Avg Points', value: whole(p.to), sub: `from ${whole(p.from)}`, hint: 'Average points per person, now and at the start' },
    { id: 'earned', label: 'Report Points', value: `+${whole(p.earned)}`, sub: 'pts each', Icon: ArrowUpRight, color: ink.good, hint: 'Points earned per person by reporting phishing emails' },
    { id: 'lost', label: 'Hook Points', value: `−${whole(p.lost)}`, sub: 'pts each', Icon: ArrowDownRight, color: ink.bad, hint: 'Points lost per person to clicks and details given away' },
  ];
  return (
    <div data-bp-progress={p.word} style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.45fr) repeat(3, minmax(0,1fr))', alignItems: 'center', borderRadius: 14, background: 'var(--plate)' }}>
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 0 12px' }}>
        <span aria-hidden style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: tile }}>
          <img src={VERDICT_ART[p.word]} alt="" width={26} height={26} />
        </span>
        <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', rowGap: 4 }}>
          <span className="vs-rank" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--text)', whiteSpace: 'nowrap' }}>{word}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 20, padding: '0 8px', borderRadius: 999, background: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', fontSize: 9.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>
            <Arrow size={11} strokeWidth={3} color={arrow} aria-hidden />{signed(p.change)} pts each
          </span>
        </span>
      </div>
      {cells.map((c) => (
        <div key={c.id} data-bp-progress-cell={c.id} title={c.hint} style={{ minWidth: 0, padding: '2px 16px', borderLeft: '1px solid var(--hair)' }}>
          <div style={{ ...eyebrow, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 5, whiteSpace: 'nowrap' }}>
            {c.Icon && <c.Icon size={12} strokeWidth={3} color={c.color} aria-hidden style={{ alignSelf: 'center' }} />}
            <span className="vs-rank" style={{ fontSize: 18, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text)' }}>{c.value}</span>
            <span style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// The three parts of the story, in reading order.
const CHAPTER_OF = { bad: 'Needs attention', good: 'Going well', watch: 'What could happen next' };
const CHAPTERS = [
  { id: 'wrong', title: 'Needs attention', sub: (when) => `What went wrong ${when}`, tone: 'bad' },
  { id: 'right', title: 'Going well', sub: (when) => `What went right ${when}`, tone: 'good' },
  { id: 'next', title: 'What could happen next', sub: () => 'If everyone gets one more email', tone: 'watch' },
];

// One finding: its number and one line. The whole item opens its detail,
// where the rest (how many, where) is.
function Item({ f, onOpen }) {
  const Tag = f.link ? 'button' : 'div';
  return (
    <Tag
      {...(f.link ? { type: 'button', onClick: onOpen, className: 'bp-finding', 'aria-label': `${f.value} ${f.unit} ${f.headline}. ${f.sub}. See the detail` } : null)}
      data-bp-finding={f.id}
      style={{ position: 'relative', width: 'calc(100% + 24px)', boxSizing: 'border-box', minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '0 34px 0 12px', margin: '0 -12px', border: 'none', borderRadius: 12, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: f.link ? 'pointer' : 'default' }}
    >
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span className="vs-rank" style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{f.value}</span>
        {f.unit && <span style={{ ...small, fontWeight: 800 }}>{f.unit}</span>}
      </span>
      <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.3 }}>{f.headline}</span>
      {f.link && <ChevronRight className="bp-go" size={16} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />}
    </Tag>
  );
}

// One part of the story: a slim tinted header with its clay icon and title,
// then its findings.
function Chapter({ c, items, when, isDark, onOpen }) {
  const t = (isDark ? TONE_TINT.dark : TONE_TINT.light)[c.tone];
  return (
    <section aria-label={c.title} data-bp-chapter={c.id} style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <header style={{ flexShrink: 0, height: 46, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderRadius: 12, background: t.wash, border: `1px solid ${t.edge}` }}>
        <img src={TONE_ART[c.tone]} alt="" width={24} height={24} style={{ flexShrink: 0 }} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '-0.005em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
          <span style={{ display: 'block', ...small, fontSize: 9.5, marginTop: 1 }}>{c.sub(when)}</span>
        </span>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '6px 4px 0' }}>
        {items.length
          ? items.map((f, i) => (
            <div key={f.id} style={{ flex: '0 0 auto', height: '33.333%', minHeight: 0, display: 'flex', alignItems: 'stretch', borderTop: i ? '1px solid var(--hair)' : 'none' }}>
              <Item f={f} onOpen={() => onOpen(f)} />
            </div>
          ))
          : <p style={{ ...small, fontSize: 10.5, margin: '14px 0 0' }}>Nothing stands out here.</p>}
      </div>
    </section>
  );
}

/** The picture as plain text, for "Copy a short summary". */
function summaryText(r, title, campaign) {
  const v = verdict(r);
  const p = progress(r, { campaign });
  return [
    title,
    `${campaign ? 'From this campaign' : `Over the last ${r.basis.days} days`}: ${VERDICT[p.word].word.toLowerCase()}, ${signed(p.change)} points per person.`,
    `${campaign ? 'In this campaign' : `In the last ${r.basis.days} days`}: ${share(r.moved.climbed, r.basis.people)} moved up a level, ${share(r.moved.slipped, r.basis.people)} down (${VERDICT[v.word].word.toLowerCase()}).`,
    '',
    'What stands out:',
    ...findings(r, { campaign }).map((f) => `- ${f.value}${f.unit ? ` ${f.unit}` : ''} ${f.headline} (${f.sub}).`),
  ].join('\n');
}

// The organisation's period: a month, two months or a quarter, chosen on
// the top row beside the Security Pulse it sets. The pulse, the story, the
// lists and the exports all read the window chosen here.
const PERIODS = [
  { days: 30, title: 'Monthly' },
  { days: 60, title: 'Every two months' },
  { days: 90, title: 'Quarterly' },
];
function PeriodPicker({ days, onDays }) {
  return (
    <div role="radiogroup" aria-label="Period" data-bp-period style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2, padding: 2, borderRadius: 10, background: 'var(--track)' }}>
      <CalendarDays size={12} strokeWidth={2.4} aria-hidden style={{ margin: '0 4px 0 6px', color: 'var(--muted)' }} />
      {PERIODS.map((p) => {
        const on = p.days === days;
        return (
          <button key={p.days} type="button" role="radio" aria-checked={on} data-bp-days={p.days} title={`${p.title}: the last ${p.days} days`} onClick={() => onDays(p.days)} style={{ height: 26, padding: '0 10px', borderRadius: 8, border: 'none', cursor: on ? 'default' : 'pointer', fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', background: on ? 'var(--base)' : 'transparent', color: on ? 'var(--text)' : 'var(--muted)', boxShadow: on ? '0 1px 3px rgba(15,23,42,0.12)' : 'none' }}>
            {p.days} days
          </button>
        );
      })}
    </div>
  );
}

/**
 * The one Export button: a short menu of at most three lines. What you are
 * looking at first, then the full report, then a summary to paste. `items`
 * are { id, label, meta, Icon, run, doneLabel, apart }.
 */
export function ExportMenu({ items, picked = 0 }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(null); // the item just run, for a moment
  const box = useRef(null);
  const first = useRef(null);
  // closing also drops a pending "Downloaded", so its timer can't close the menu once reopened
  const close = () => { setOpen(false); setDone(null); };
  useEffect(() => {
    if (!open) return undefined;
    first.current?.focus();
    const onDown = (e) => { if (!box.current?.contains(e.target)) { setOpen(false); setDone(null); } };
    // in the capture phase, so Escape closes the menu and nothing else
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); setDone(null); } };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey, true); };
  }, [open]);
  useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => { setDone(null); setOpen(false); }, 900);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button type="button" data-bp-export onClick={() => (open ? close() : setOpen(true))} aria-haspopup="menu" aria-expanded={open} style={{ height: 28, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px 0 12px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--ink-on)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
        <Download size={13} strokeWidth={2.6} aria-hidden /> Export
        {picked > 0 && <span data-bp-export-count aria-label={`${picked} selected`} title={`${picked} selected: Export takes them`} style={{ minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box', display: 'inline-grid', placeItems: 'center', borderRadius: 999, background: 'var(--bp-accent)', color: 'var(--ink-on)', fontSize: 9.5, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{count(picked)}</span>}
        <ChevronDown size={13} strokeWidth={2.6} aria-hidden style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }} />
      </button>
      {open && (
        <div role="menu" aria-label="Export" data-bp-export-menu style={{ position: 'absolute', right: 0, top: 34, width: 268, zIndex: 30, padding: 5, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--base)', boxShadow: '0 16px 36px rgba(15,23,42,0.16)' }}>
          {items.map((it, i) => {
            const Icon = done === it.id ? Check : it.Icon || FileSpreadsheet;
            return (
              <button
                key={it.id}
                ref={i === 0 ? first : undefined}
                type="button"
                role="menuitem"
                data-bp-export-item={it.id}
                className="bp-row"
                onClick={() => { it.run(); setDone(it.id); }}
                style={{ width: '100%', height: 34, display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px', marginTop: it.apart ? 5 : 0, border: 'none', borderTop: it.apart ? '1px solid var(--hair)' : 'none', borderRadius: it.apart ? '0 0 8px 8px' : 8, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
              >
                <Icon size={14} strokeWidth={2.4} aria-hidden style={{ flexShrink: 0, color: 'var(--muted)' }} />
                <span style={{ flexShrink: 0, flex: 1, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>{done === it.id ? it.doneLabel || 'Downloaded' : it.label}</span>
                {it.meta && <span style={{ ...small, flexShrink: 1, minWidth: 0, maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.meta}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * The Big Picture, in the board's L shape: a colour tile top left naming what
 * it covers; along the arm, a title with the tabs (Overview, People,
 * Departments) and the Export menu in its corner, and under them a strip
 * saying whether people are improving; below, the story in three parts.
 */
export function BigPictureSheet({ r, campaign, isDark, canSeePeople, shell, onDays }) {
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  const { CAP_W, CAP_H, L_GAP, L_R, FILLET, PASTEL_INK } = shell;
  const scopeKey = campaign ? campaign.id : 'org';
  const fresh = () => ({
    scope: scopeKey,
    tab: 'overview',
    detail: null, // the finding opened, by id
    detailView: { dept: null, q: '', page: 0, deptQ: '', deptPage: 0 },
    people: { show: 'all', dept: 'all', level: 'all', q: '', sort: { key: 'points', dir: 'asc' }, page: 0 },
    picked: new Set(),
    depts: { sort: { key: 'perPerson', dir: 'asc' }, q: '', page: 0, open: null, openView: { q: '', page: 0 } },
    deptPicked: new Set(),
  });
  const [kept, setState] = useState(fresh);
  const state = kept.scope === scopeKey ? kept : fresh(); // a new scope starts afresh
  const { tab } = state;
  const set = (patch) => setState({ ...state, ...patch });

  const openDept = (name) => set({ depts: { ...state.depts, open: name, openView: { q: '', page: 0 } } });
  const closeDept = () => set({ depts: { ...state.depts, open: null } });
  const openFinding = (f) => set({ detail: f.id, detailView: { dept: f.link?.dept || null, q: '', page: 0, deptQ: '', deptPage: 0 } });

  const parts = story(r, { campaign: Boolean(campaign) });
  const days = r.basis.days; // the organisation's period; null for a campaign
  const when = campaign ? 'in this campaign' : `in the last ${days} days`;
  const opened = state.detail ? [...parts.wrong, ...parts.right, ...parts.next].find((f) => f.id === state.detail) : null;
  const deptOpen = tab === 'departments' && canSeePeople && state.depts.open && r.departments.some((d) => d.name === state.depts.open) ? state.depts.open : null;
  const title = campaign ? `The big picture: ${campaign.name}` : `The big picture: the organisation, last ${days} days`;
  const scopeName = campaign ? campaign.name : 'organisation';
  const scopeTitle = campaign ? campaign.name : 'The organisation';
  const file = (...what) => xlsxName('big picture', scopeName, ...what);
  const tokens = isDark
    ? { '--bp-accent': '#5EEAD4', '--bp-soft': 'rgba(94,234,212,0.14)', '--bp-ink': '#5EEAD4' }
    : { '--bp-accent': '#0F766E', '--bp-soft': '#D5F5F0', '--bp-ink': '#0F766E' };
  const TABS = [
    { id: 'overview', label: 'Overview', Icon: LayoutGrid },
    ...(canSeePeople ? [{ id: 'people', label: 'People', Icon: Users, count: r.people.length }] : []),
    { id: 'departments', label: 'Departments', Icon: Building2, count: r.departments.length },
  ];

  // The Export menu: what you are looking at (a finding, the people or
  // departments shown, or those ticked), then the full report, then a summary.
  const here = [];
  if (tab === 'overview' && opened) {
    const b = breakdown(r, opened);
    // the department shown: the one picked, or a team finding's own team
    const narrowed = state.detailView.dept || opened.link?.dept || null;
    const list = canSeePeople ? findingPeople(b, { ...state.detailView, dept: narrowed }) : null;
    const howMany = list ? `${count(list.length)} ${list.length === 1 ? 'person' : 'people'}` : `${b.departments.length} depts`;
    here.push({ id: 'finding', Icon: FileSpreadsheet, label: 'This finding', meta: narrowed ? `${narrowed} · ${howMany}` : howMany, run: () => downloadXlsx(file(opened.headline, narrowed), findingBook(opened, b, list, { scope: scopeTitle, chapter: CHAPTER_OF[opened.tone], dept: narrowed })) });
  }
  if (tab === 'people' && canSeePeople) {
    const ticked = state.picked.size > 0;
    const list = ticked ? r.people.filter((x) => state.picked.has(x.key)) : peopleShown(r, state.people);
    here.push({ id: ticked ? 'people-selected' : 'people-shown', Icon: Users, label: ticked ? 'Selected people' : peopleFiltered(state.people) ? 'People shown' : 'Everyone', meta: count(list.length), run: () => downloadXlsx(file(ticked ? 'selected people' : 'people'), peopleBook(list, { scope: scopeTitle, what: ticked ? 'Selected people' : peopleFiltered(state.people) ? 'People shown with your filters' : 'Everyone' })) });
  }
  if (deptOpen) {
    const list = peopleShown(r, { show: 'all', dept: deptOpen, level: 'all', q: state.depts.openView.q, sort: { key: 'points', dir: 'asc' } });
    here.push({ id: 'department-people', Icon: Users, label: 'This department', meta: `${deptOpen} · ${count(list.length)}`, run: () => downloadXlsx(file(deptOpen, 'people'), peopleBook(list, { scope: scopeTitle, what: state.depts.openView.q.trim() ? `People in ${deptOpen} matching your search` : `People in ${deptOpen}` })) });
  }
  if (tab === 'departments' && !deptOpen) {
    const ticked = state.deptPicked.size > 0;
    const list = ticked ? r.departments.filter((d) => state.deptPicked.has(d.name)) : departmentsShown(r, state.depts);
    here.push({ id: ticked ? 'departments-selected' : 'departments-shown', Icon: Building2, label: ticked ? 'Selected departments' : state.depts.q.trim() ? 'Departments shown' : 'All departments', meta: count(list.length), run: () => downloadXlsx(file(ticked ? 'selected departments' : 'departments'), departmentsBook(list, { scope: scopeTitle, what: ticked ? 'Selected departments' : state.depts.q.trim() ? 'Departments shown with your search' : 'All departments' })) });
  }
  const exportItems = [
    ...here,
    { id: 'report', Icon: FileText, label: 'Full report', meta: 'Excel', run: () => downloadXlsx(file('report'), reportBook(r, { title: `The Big Picture · ${scopeTitle}`, scope: campaign ? `${campaign.name} · started ${campaign.started}` : `The organisation · last ${days} days`, withPeople: canSeePeople, campaign })) },
    { id: 'copy', Icon: Copy, label: 'Copy a summary', doneLabel: 'Copied', apart: true, run: () => navigator.clipboard?.writeText(summaryText(r, title, Boolean(campaign))).catch(() => {}) },
  ];

  // The top-right corner: the tabs, and Export beside them. Inside a finding
  // or an opened department the tabs step aside: the back button leads out.
  const inFinding = (tab === 'overview' && Boolean(opened)) || Boolean(deptOpen);
  const toolbar = (
    <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      {!inFinding && <div role="tablist" aria-label="The big picture" style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 2, borderRadius: 10, background: 'var(--track)' }}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={on} data-bp-tab={t.id} onClick={() => set({ tab: t.id, detail: null })} style={{ height: 26, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 11px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 10.5, fontWeight: 800, background: on ? 'var(--base)' : 'transparent', color: on ? 'var(--text)' : 'var(--muted)', boxShadow: on ? '0 1px 3px rgba(15,23,42,0.12)' : 'none' }}>
              <t.Icon size={12} strokeWidth={2.4} aria-hidden />{t.label}
              {t.count !== undefined && <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)' }}>{count(t.count)}</span>}
            </button>
          );
        })}
      </div>}
      <ExportMenu items={exportItems} picked={tab === 'people' && canSeePeople ? state.picked.size : tab === 'departments' && !deptOpen ? state.deptPicked.size : 0} />
    </div>
  );

  return (
    <div data-lb-reports={campaign ? 'campaign' : 'org'} style={{ ...tokens, flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...(isDark ? PASTEL_INK : null), position: 'absolute', top: 0, left: 0, width: CAP_W, height: CAP_H, zIndex: 2, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, background: 'var(--cap-reports)', borderRadius: L_R, overflow: 'hidden' }}>
        <div style={{ ...eyebrow, color: 'var(--t-reports)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {campaign ? <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A' }} /> : <Building2 size={12} strokeWidth={2.6} aria-hidden />}
          The big picture
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.16, color: 'var(--text)' }}>{campaign ? campaign.name : 'The organisation'}</div>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.35, maxWidth: 196 }}>{campaign ? `Started ${campaign.started}` : `Last ${days} days`}</div>
      </div>
      <svg aria-hidden width={FILLET} height={FILLET} viewBox={`0 0 ${FILLET} ${FILLET}`} style={{ position: 'absolute', top: CAP_H - L_R, left: CAP_W - L_R, zIndex: 1, display: 'block' }}>
        <path d={`M 0 ${FILLET} A ${FILLET} ${FILLET} 0 0 0 ${FILLET} 0 V ${FILLET} H 0 Z`} fill="var(--base)" />
      </svg>

      {/* the arm: a title and, in the corner, the tabs and Export; under them, are people improving */}
      <div data-bp-standing style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, boxSizing: 'border-box', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: `12px 16px ${L_GAP + 3}px 22px`, background: 'var(--base)', borderTop: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderRadius: `${L_R}px ${L_R}px 0 0` }}>
        <div style={{ flexShrink: 0, height: 30, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 11, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span aria-hidden style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--bp-accent)', flexShrink: 0 }} />
            {campaign ? 'Campaign Pulse' : 'Security Pulse'}
            {(campaign || !onDays) && <span style={{ fontWeight: 600, color: 'var(--muted)' }}>{campaign ? `· since ${campaign.started}` : `· last ${days} days`}</span>}
          </span>
          {!campaign && onDays && <PeriodPicker days={days} onDays={onDays} />}
          {toolbar}
        </div>
        <ProgressStrip r={r} campaign={Boolean(campaign)} ink={ink} isDark={isDark} />
      </div>

      {/* the base: the story in three parts, or a full list */}
      <div data-bp-body style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 18, padding: '14px 16px 18px 22px', background: 'var(--base)', borderLeft: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', borderRadius: `${L_R}px 0 ${L_R}px ${L_R}px` }}>
        {tab === 'overview' && opened && (
          <FindingDetail
            key={`${scopeKey}-${opened.id}`}
            f={opened}
            r={r}
            view={state.detailView}
            onView={(detailView) => set({ detailView })}
            canSeePeople={canSeePeople}
            isDark={isDark}
            ink={ink}
            onBack={() => set({ detail: null })}
          />
        )}
        {tab === 'overview' && !opened && (
          <div data-bp-story style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14 }}>
            {CHAPTERS.map((c) => <Chapter key={c.id} c={c} items={parts[c.id]} when={when} isDark={isDark} onOpen={openFinding} />)}
          </div>
        )}
        {tab === 'people' && canSeePeople && (
          <PeopleTable r={r} view={state.people} onView={(people) => set({ people })} selected={state.picked} onSelected={(picked) => set({ picked })} isDark={isDark} ink={ink} />
        )}
        {deptOpen && (
          <DepartmentPeople
            key={`${scopeKey}-${deptOpen}`}
            r={r}
            name={deptOpen}
            view={state.depts.openView}
            onView={(openView) => set({ depts: { ...state.depts, openView } })}
            onBack={closeDept}
            isDark={isDark}
            ink={ink}
          />
        )}
        {tab === 'departments' && !deptOpen && (
          <DepartmentTable
            r={r}
            view={state.depts}
            onView={(depts) => set({ depts })}
            isDark={isDark}
            selected={state.deptPicked}
            onSelected={(deptPicked) => set({ deptPicked })}
            onOpen={canSeePeople ? openDept : null}
          />
        )}
      </div>
    </div>
  );
}

/** Staff see this where colleagues see How to earn points: the story's opening line from each part. */
export function BigPictureTeaser({ r, onOpen }) {
  const parts = story(r);
  const top = CHAPTERS.map((c) => parts[c.id][0]).filter(Boolean);
  return (
    <div data-bp-teaser style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--rail)', border: '1px solid var(--hair)', borderRadius: 16, padding: '14px 16px' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>The big picture</span>
      <span style={{ ...small, marginTop: 2 }}>The last {r.basis.days} days on the board</span>
      <div style={{ flex: 1, minHeight: 0, maxHeight: 250, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', marginTop: 6 }}>
        {top.map((f) => {
          return (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--hair)' }}>
              <img src={TONE_ART[f.tone]} alt="" width={24} height={24} style={{ flexShrink: 0 }} />
              <span style={{ minWidth: 0, fontSize: 10.5, fontWeight: 600, lineHeight: 1.4, color: 'var(--text)' }}>
                <strong className="vs-rank" style={{ fontSize: 12.5, fontWeight: 900 }}>{f.value}{f.unit ? ` ${f.unit}` : ''}</strong> {f.headline}
              </span>
            </div>
          );
        })}
      </div>
      <button type="button" data-bp-open onClick={onOpen} style={{ marginTop: 10, alignSelf: 'stretch', height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--track)', color: 'var(--text)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
        Open the big picture <ArrowRight size={13} strokeWidth={2.6} aria-hidden />
      </button>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Building2, Check, ChevronDown, ChevronRight, Copy, Download, FileSpreadsheet, LayoutGrid, Minus, Users } from 'lucide-react';

import { breakdown, count, findings, share, story } from '../../services/bigPictureFindings';
import { breakdownCsv, departmentsCsv, peopleCsv, reportCsv } from '../../services/bigPictureExport';
import { departmentsShown, findingPeople, peopleFiltered, peopleShown, verdict } from '../../services/bigPictureViews';
import { csvName, downloadCsv } from '../../services/csv';
import { progress } from '../../services/bigPictureTrend';
import { FindingDetail } from './BigPictureDetail';
import { DepartmentTable, PeopleTable } from './BigPictureTables';
import { REPORT_INK } from './reportInk';
import { TONE_ART, TONE_TINT, VERDICT_ART } from './bigPictureArt';

// The Big Picture: the leaderboard's reporting view for leaders and admins.
//
// It reports what the board shows; it never says what to do. It reads as a
// story, top to bottom and then left to right:
//   - along the top, one small card: are people improving through the
//     phishing simulations? The verdict in a word, the points per person
//     behind it, and a line on why;
//   - needs attention, going well, what could happen next: three findings
//     at most in each, every one a number, a line and where it sits.
// A finding opens to its detail: by department, and (admins) who exactly.
// People and Departments list everyone one by one. Their tabs, and the one
// Export menu (the full report, the lists, whatever is on screen), sit in
// the top-right corner, so the base is all story.
//
// Colours: teal for better, red for worse, checked for colour-blind
// separation on both themes; every arrow has its number beside it and every
// tone its own clay icon and word, never colour alone.

const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };
const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };

const VERDICT = {
  improving: { word: 'Improving', why: 'More points earned by reporting than lost to clicks', tile: '#D0FBDF' },
  steady: { word: 'Holding steady', why: 'Points earned by reporting and lost to clicks are about even', tile: '#F3E7FD' },
  slipping: { word: 'Slipping', why: 'More points lost to clicks than earned by reporting', tile: '#FBD3D3' },
};
const whole = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${whole(Math.abs(n))}`;

// Along the top: one small card answering the first question, are people
// improving through the phishing simulations? Its clay trend on a pastel
// tile, the verdict, the points per person behind it (over six months for
// the organisation; from this campaign for one campaign), and why.
function ProgressCard({ r, campaign, ink, isDark }) {
  const p = progress(r, { campaign });
  const { word, why, tile } = VERDICT[p.word];
  const Arrow = p.word === 'improving' ? ArrowUpRight : p.word === 'slipping' ? ArrowDownRight : Minus;
  const arrow = p.word === 'improving' ? ink.good : p.word === 'slipping' ? ink.bad : 'var(--muted)';
  return (
    <div data-bp-progress={p.word} style={{ flex: '0 1 470px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px 0 12px', borderRadius: 14, background: 'var(--plate)' }}>
      <span aria-hidden style={{ flexShrink: 0, width: 58, height: 58, borderRadius: 14, display: 'grid', placeItems: 'center', background: tile }}>
        <img src={VERDICT_ART[p.word]} alt="" width={34} height={34} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ ...eyebrow, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{campaign ? 'This campaign · its recipients' : 'Phishing simulations · last 6 months'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <span className="vs-rank" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--text)', whiteSpace: 'nowrap' }}>{word}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 20, padding: '0 8px', borderRadius: 999, background: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', fontSize: 9.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>
            <Arrow size={11} strokeWidth={3} color={arrow} aria-hidden />{signed(p.change)} pts per person
          </span>
        </div>
        <div style={{ ...small, fontSize: 10, marginTop: 5 }}>{why}.</div>
      </div>
    </div>
  );
}

// The three parts of the story, in reading order.
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
    `${campaign ? 'From this campaign' : 'Over the last 6 months'}: ${VERDICT[p.word].word.toLowerCase()}, ${signed(p.change)} points per person.`,
    `${campaign ? 'In this campaign' : 'In the last 30 days'}: ${share(r.moved.climbed, r.basis.people)} moved up a level, ${share(r.moved.slipped, r.basis.people)} down (${VERDICT[v.word].word.toLowerCase()}).`,
    '',
    'What stands out:',
    ...findings(r, { campaign }).map((f) => `- ${f.value}${f.unit ? ` ${f.unit}` : ''} ${f.headline} (${f.sub}).`),
  ].join('\n');
}

/**
 * The one Export button: a short menu of what can be downloaded, in groups,
 * the first being whatever is on screen. `groups` are { name, items } with
 * items { id, label, note, run, Icon }.
 */
function ExportMenu({ scope, groups }) {
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
  const firstId = groups.find((g) => g.items.length)?.items[0]?.id;
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button type="button" data-bp-export onClick={() => (open ? close() : setOpen(true))} aria-haspopup="menu" aria-expanded={open} style={{ height: 28, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px 0 12px', borderRadius: 8, border: 'none', background: 'var(--ink)', color: 'var(--ink-on)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
        <Download size={13} strokeWidth={2.6} aria-hidden /> Export <ChevronDown size={13} strokeWidth={2.6} aria-hidden style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }} />
      </button>
      {open && (
        <div role="menu" aria-label="Export" data-bp-export-menu style={{ position: 'absolute', right: 0, top: 34, width: 320, zIndex: 30, padding: 6, borderRadius: 14, border: '1px solid var(--hair)', background: 'var(--base)', boxShadow: '0 18px 40px rgba(15,23,42,0.18)' }}>
          <div style={{ ...small, padding: '6px 10px 4px' }}>Download as a spreadsheet (CSV) · {scope}</div>
          {groups.filter((g) => g.items.length).map((g, gi) => (
            <div key={g.name} style={{ borderTop: gi ? '1px solid var(--hair)' : 'none', marginTop: gi ? 4 : 0, paddingTop: 4 }}>
              <div style={{ ...eyebrow, padding: '6px 10px 4px' }}>{g.name}</div>
              {g.items.map((it) => {
                const Icon = done === it.id ? Check : it.Icon || FileSpreadsheet;
                return (
                  <button
                    key={it.id}
                    ref={it.id === firstId ? first : undefined}
                    type="button"
                    role="menuitem"
                    data-bp-export-item={it.id}
                    className="bp-row"
                    onClick={() => { it.run(); setDone(it.id); }}
                    style={{ width: '100%', display: 'grid', gridTemplateColumns: '28px minmax(0,1fr)', alignItems: 'center', gap: 10, padding: '7px 10px', border: 'none', borderRadius: 9, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <span aria-hidden style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--track)', color: 'var(--text)' }}><Icon size={14} strokeWidth={2.4} /></span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{done === it.id ? it.doneLabel || 'Downloaded' : it.label}</span>
                      <span style={{ display: 'block', ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.note}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The Big Picture, in the board's L shape: a colour tile top left naming what
 * it covers; along the arm, a small card saying whether people are
 * improving, with the tabs (Overview, People, Departments) and the Export
 * menu in the top-right corner; below, the story in three parts.
 */
export function BigPictureSheet({ r, campaign, isDark, canSeePeople, shell }) {
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  const { CAP_W, CAP_H, L_GAP, L_R, FILLET, PASTEL_INK } = shell;
  const scopeKey = campaign ? campaign.id : 'org';
  const fresh = () => ({
    scope: scopeKey,
    tab: 'overview',
    detail: null, // the finding opened, by id
    detailView: { tab: 'departments', dept: null, q: '', page: 0, deptPage: 0 },
    people: { show: 'all', dept: 'all', level: 'all', q: '', sort: { key: 'points', dir: 'asc' }, page: 0 },
    picked: new Set(),
    depts: { sort: { key: 'perPerson', dir: 'asc' }, q: '', page: 0 },
    deptPicked: new Set(),
  });
  const [kept, setState] = useState(fresh);
  const state = kept.scope === scopeKey ? kept : fresh(); // a new scope starts afresh
  const { tab } = state;
  const set = (patch) => setState({ ...state, ...patch });

  const pinpoint = ({ show = 'all', dept = 'all', q = '' }) => {
    set({ tab: 'people', detail: null, people: { ...state.people, show, dept, level: 'all', q, page: 0 } });
  };
  const openFinding = (f) => set({ detail: f.id, detailView: { tab: 'departments', dept: f.link?.dept || null, q: '', page: 0, deptPage: 0 } });

  const parts = story(r, { campaign: Boolean(campaign) });
  const when = campaign ? 'in this campaign' : 'in the last 30 days';
  const opened = state.detail ? [...parts.wrong, ...parts.right, ...parts.next].find((f) => f.id === state.detail) : null;
  const title = campaign ? `The big picture: ${campaign.name}` : 'The big picture: the organisation, last 30 days';
  const scopeName = campaign ? campaign.name : 'organisation';
  const scopeLabel = campaign ? campaign.name : 'the organisation, last 30 days';
  const file = (...what) => csvName('big picture', scopeName, ...what);
  const tokens = isDark
    ? { '--bp-accent': '#5EEAD4', '--bp-soft': 'rgba(94,234,212,0.14)', '--bp-ink': '#5EEAD4' }
    : { '--bp-accent': '#0F766E', '--bp-soft': '#D5F5F0', '--bp-ink': '#0F766E' };
  const TABS = [
    { id: 'overview', label: 'Overview', Icon: LayoutGrid },
    ...(canSeePeople ? [{ id: 'people', label: 'People', Icon: Users, count: r.people.length }] : []),
    { id: 'departments', label: 'Departments', Icon: Building2, count: r.departments.length },
  ];

  // The Export menu: what is on screen first, then everything.
  const onScreen = [];
  if (tab === 'overview' && opened) {
    const b = breakdown(r, opened);
    const team = Boolean(opened.link?.dept);
    const what = `${opened.value}${opened.unit ? ` ${opened.unit}` : ''} ${opened.headline}`;
    onScreen.push({ id: 'finding-departments', Icon: Building2, label: 'This finding, by department', note: `${what} · ${b.departments.length} departments`, run: () => downloadCsv(file(opened.headline, 'by department'), breakdownCsv(b)) });
    if (canSeePeople) {
      const list = findingPeople(b, state.detailView, team);
      const narrowed = state.detailView.dept && !team;
      onScreen.push({ id: 'finding-people', Icon: Users, label: narrowed ? `This finding’s people in ${state.detailView.dept}` : 'This finding’s people', note: `${count(list.length)} ${list.length === 1 ? 'person' : 'people'} · ${what}`, run: () => downloadCsv(file(opened.headline, narrowed ? state.detailView.dept : 'people'), peopleCsv(list)) });
    }
  }
  if (tab === 'people' && canSeePeople) {
    if (peopleFiltered(state.people)) {
      const list = peopleShown(r, state.people);
      onScreen.push({ id: 'people-shown', Icon: Users, label: 'The people shown', note: `${count(list.length)} people, with your filters`, run: () => downloadCsv(file('people shown'), peopleCsv(list)) });
    }
    if (state.picked.size) onScreen.push({ id: 'people-selected', Icon: Check, label: 'The people you selected', note: `${count(state.picked.size)} ${state.picked.size === 1 ? 'person' : 'people'}`, run: () => downloadCsv(file('selected people'), peopleCsv(r.people.filter((x) => state.picked.has(x.key)))) });
  }
  if (tab === 'departments') {
    if (state.depts.q.trim()) {
      const list = departmentsShown(r, state.depts);
      onScreen.push({ id: 'departments-shown', Icon: Building2, label: 'The departments shown', note: `${list.length} departments, with your search`, run: () => downloadCsv(file('departments shown'), departmentsCsv(list)) });
    }
    if (state.deptPicked.size) onScreen.push({ id: 'departments-selected', Icon: Check, label: 'The departments you selected', note: `${state.deptPicked.size} departments`, run: () => downloadCsv(file('selected departments'), departmentsCsv(r.departments.filter((d) => state.deptPicked.has(d.name)))) });
  }
  const everything = [
    { id: 'report', Icon: FileSpreadsheet, label: 'Full report', note: canSeePeople ? 'Story, levels, departments and everyone' : 'Story, levels and departments', run: () => downloadCsv(file('report'), reportCsv(r, { title, withPeople: canSeePeople, campaign: Boolean(campaign) })) },
    { id: 'departments', Icon: Building2, label: 'All departments', note: `${r.departments.length} departments, every measure`, run: () => downloadCsv(file('departments'), departmentsCsv(departmentsShown(r, { q: '', sort: state.depts.sort }))) },
    ...(canSeePeople ? [{ id: 'everyone', Icon: Users, label: 'Everyone', note: `${count(r.people.length)} people, lowest points first`, run: () => downloadCsv(file('people'), peopleCsv(r.people)) }] : []),
  ];
  const share_ = [{ id: 'copy', Icon: Copy, label: 'Copy a short summary', doneLabel: 'Copied', note: 'To paste into an email or a chat', run: () => navigator.clipboard?.writeText(summaryText(r, title, Boolean(campaign))).catch(() => {}) }];
  const groups = [
    { name: tab === 'overview' && opened ? 'What you’re looking at' : 'Your selection', items: onScreen },
    { name: 'Everything', items: everything },
    { name: 'Share', items: share_ },
  ];

  // The top-right corner: the tabs, and Export beside them.
  const toolbar = (
    <div style={{ marginLeft: 'auto', flexShrink: 0, alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div role="tablist" aria-label="The big picture" style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 2, borderRadius: 10, background: 'var(--track)' }}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={on} data-bp-tab={t.id} onClick={() => set({ tab: t.id, detail: null })} style={{ height: 26, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 11px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 10.5, fontWeight: 800, background: on ? 'var(--base)' : 'transparent', color: on ? 'var(--text)' : 'var(--muted)', boxShadow: on ? '0 1px 3px rgba(15,23,42,0.12)' : 'none' }}>
              <t.Icon size={12} strokeWidth={2.4} aria-hidden />{t.label}
              {t.count !== undefined && <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)' }}>{count(t.count)}</span>}
            </button>
          );
        })}
      </div>
      <ExportMenu scope={scopeLabel} groups={groups} />
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
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.35, maxWidth: 196 }}>
          {campaign ? `${campaign.type} · started ${campaign.started} · ${count(r.basis.people)} recipients` : `Last 30 days · ${r.basis.campaigns} campaigns · ${count(r.basis.population)} people on the board`}
        </div>
      </div>
      <svg aria-hidden width={FILLET} height={FILLET} viewBox={`0 0 ${FILLET} ${FILLET}`} style={{ position: 'absolute', top: CAP_H - L_R, left: CAP_W - L_R, zIndex: 1, display: 'block' }}>
        <path d={`M 0 ${FILLET} A ${FILLET} ${FILLET} 0 0 0 ${FILLET} 0 V ${FILLET} H 0 Z`} fill="var(--base)" />
      </svg>

      {/* the arm: are people improving, and in the corner the tabs and Export */}
      <div data-bp-standing style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, boxSizing: 'border-box', flexShrink: 0, display: 'flex', gap: 14, padding: `14px 16px ${L_GAP + 7}px 22px`, background: 'var(--base)', borderTop: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderRadius: `${L_R}px ${L_R}px 0 0` }}>
        <ProgressCard r={r} campaign={Boolean(campaign)} ink={ink} isDark={isDark} />
        {toolbar}
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
            onOpenPeople={({ dept }) => pinpoint({ show: opened.link?.show || 'all', dept: dept || 'all' })}
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
        {tab === 'departments' && (
          <DepartmentTable
            r={r}
            view={state.depts}
            onView={(depts) => set({ depts })}
            isDark={isDark}
            selected={state.deptPicked}
            onSelected={(deptPicked) => set({ deptPicked })}
            onPeople={canSeePeople ? (dept) => pinpoint({ dept }) : null}
            ink={ink}
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
      <span style={{ ...small, marginTop: 2 }}>The last 30 days on the board</span>
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

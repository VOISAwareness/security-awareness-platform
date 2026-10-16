import { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, Search } from 'lucide-react';

import { breakdown, count } from '../../services/bigPictureFindings';
import { findingPeople, health, recordOf } from '../../services/bigPictureViews';
import { Chip, Pager, PersonRow } from './BigPictureTables';
import { useFitRows } from './useFitRows';
import { TONE_ART } from './bigPictureArt';

// A finding opened. A slim header says what it is and no more: a back
// button, the chapter it belongs to and the finding (the counts are on the
// panes). Below it,
// two panes side by side: the departments, each with its share (so a team
// of 40 and a team of 4,000 compare fairly), and, for admins, the people in
// whichever department is picked. The two panes are built alike (a header,
// column names, rows of one height, a pager), so their lines meet across the
// page; both come a page at a time and are searchable, so it reads the same
// at 100 people or 30,000. The same view serves the organisation and a
// single campaign; the Export menu offers the finding as one file.

const num = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;
const pc = (v) => `${Math.round((v || 0) * 100)}%`;
const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };
const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };
const CHAPTER = { bad: 'Needs attention', good: 'Going well', watch: 'What could happen next' };
// the person takes the room; points, change and what stands out (or a
// chance) keep set widths against the right edge, each in the middle of its
// column under its name
const PEOPLE_COLS = 'minmax(0,1fr) 88px 72px 140px';
const mid = { textAlign: 'center' };
// a department, the finding's number for it, and its health
const DEPT_COLS = 'minmax(0,1fr) 72px 92px';
// a count finding's number is how many of its people are in each department
const VALUE_HEAD = { count: 'People', rate: 'Reported', points: 'Points each' };
const num11 = { fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' };
const ROW_H = 42; // one row height in both panes, so their lines meet

// A pane's column names, the same height in both panes.
function Heads({ cols, children }) {
  return <div role="row" style={{ flexShrink: 0, height: 30, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 12px', borderBottom: '1px solid var(--hair)', whiteSpace: 'nowrap', ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{children}</div>;
}
// A forecast finding's people show their record: what they did with the
// emails they got, the clicks for a level down, the reports for a level up
// (their chance is in the export, with the formula). With one email (a
// campaign), what they did with it.
const did = (x) => (x.gave ? 'Gave details away' : x.clicked ? 'Clicked' : x.reported ? 'Reported' : 'No action');
const RECORD = {
  mayDrop: { text: (x) => `Clicked ${count(x.clicked)} of ${count(x.campaigns)}`, tone: (x) => (x.clicked ? 'bad' : 'steady') },
  mayClimb: { text: (x) => `Reported ${count(x.reported)} of ${count(x.campaigns)}`, tone: (x) => (x.reported ? 'good' : 'steady') },
};
const recordText = (x, how) => (!x.campaigns ? 'No emails yet' : x.campaigns === 1 ? did(x) : how.text(x));
// the colour says what the words say: clicks red, reports teal, nothing either way grey
const recordTone = (x, how) => (!x.campaigns ? 'steady' : x.campaigns === 1 ? (x.clicked ? 'bad' : x.reported ? 'good' : 'steady') : how.tone(x));
const recordHint = (x) => `Got ${count(x.campaigns)} ${x.campaigns === 1 ? 'email' : 'emails'}: reported ${count(x.reported)}, clicked ${count(x.clicked)}${x.gave ? `, gave details away ${count(x.gave)}` : ''}`;

const STEADY_INK = '#94A3B8';
function Record({ x, how, ink }) {
  const tone = recordTone(x, how);
  return <Chip color={tone === 'steady' ? STEADY_INK : ink[tone]} width={128} title={x.campaigns ? recordHint(x) : 'Not sent a phishing email yet'}>{recordText(x, how)}</Chip>;
}

// A department's health (health() in bigPictureViews.js): Protected,
// Holding or Exposed, with its Report and Hook Rates on hover.
const HEALTH_TONE = { Protected: 'good', Holding: 'steady', Exposed: 'bad' };
function Health({ of, ink }) {
  const h = health(of);
  if (!h) return <span style={small}>—</span>;
  const color = HEALTH_TONE[h.word] === 'steady' ? STEADY_INK : ink[HEALTH_TONE[h.word]];
  return <Chip color={color} width={86} title={`Reported ${pc(h.reportRate)} of emails · clicked ${pc(h.clickRate)}`}>{h.word}</Chip>;
}

// A small search box for a pane's header.
function Find({ value, onChange, label, isDark }) {
  return (
    <label style={{ position: 'relative', width: 168, flexShrink: 0 }}>
      <span className="sr-only">{label}</span>
      <Search size={12} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} style={{ height: 28, width: '100%', boxSizing: 'border-box', borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)', fontSize: 10, fontWeight: 600, padding: '0 8px 0 26px', outline: 'none', colorScheme: isDark ? 'dark' : 'light' }} />
    </label>
  );
}

// A pane: a header line (title, a search), then its body. How many it
// holds is on its pager.
function Pane({ title, children, tools, label }) {
  return (
    <section aria-label={label || title} style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
      <header style={{ flexShrink: 0, height: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 0 14px', borderBottom: '1px solid var(--hair)' }}>
        <span style={{ minWidth: 0, fontSize: 11.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        <span style={{ marginLeft: 'auto' }} />
        {tools}
      </header>
      {children}
    </section>
  );
}

/** `view` is { dept, q, page, deptQ, deptPage }, kept by the sheet so Export knows it. */
export function FindingDetail({ f, r, view, onView: setView, canSeePeople, isDark, ink, onBack }) {
  const reduce = useReducedMotion();
  const b = useMemo(() => breakdown(r, f), [r, f]);
  const team = f.link?.dept || null;
  const record = RECORD[f.link?.show];
  const backRef = useRef(null);
  useEffect(() => { backRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const people = useMemo(() => findingPeople(b, view, Boolean(team)), [b, view, team]);
  const [peopleBox, peopleSize] = useFitRows(ROW_H);
  const pages = Math.max(1, Math.ceil(people.length / peopleSize));
  const page = Math.min(view.page, pages - 1);
  const shown = people.slice(page * peopleSize, (page + 1) * peopleSize);

  const value = (d) => (b.kind === 'count' ? count(d.value) : b.kind === 'rate' ? pc(d.value) : signed(d.value));
  const dq = view.deptQ.trim().toLowerCase();
  const depts = dq ? b.departments.filter((d) => d.name.toLowerCase().includes(dq)) : b.departments;
  const pick = !team && canSeePeople; // departments narrow the people
  const everyone = r.people.length;
  const overall = useMemo(() => recordOf(r.departments), [r.departments]); // the whole organisation or campaign
  const pinned = pick && !dq; // "All departments" leads every page
  const [deptBox, deptFit] = useFitRows(ROW_H);
  const deptSize = Math.max(1, deptFit - (pinned ? 1 : 0));
  const deptPages = Math.max(1, Math.ceil(depts.length / deptSize));
  const deptPage = Math.min(view.deptPage || 0, deptPages - 1);
  const deptShown = depts.slice(deptPage * deptSize, (deptPage + 1) * deptSize);

  const pickDept = (name) => setView({ ...view, dept: name, page: 0 });
  const row = (on, mark, first) => ({ width: '100%', flexShrink: 0, height: ROW_H, boxSizing: 'border-box', display: 'grid', gridTemplateColumns: DEPT_COLS, alignItems: 'center', gap: 12, padding: '0 12px 0 9px', border: 'none', borderLeft: `3px solid ${on ? 'var(--bp-accent)' : 'transparent'}`, borderTop: first ? 'none' : '1px solid var(--hair)', background: on || mark ? 'var(--bp-soft)' : 'none', color: 'var(--text)', textAlign: 'left', cursor: pick ? 'pointer' : 'default' });
  const peopleTitle = team ? `People in ${team}` : view.dept ? `People in ${view.dept}` : 'Everyone in this finding';

  return (
    <motion.div
      data-bp-detail={f.id}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {/* what it is */}
      <div data-bp-detail-head style={{ flexShrink: 0, height: 52, display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px 0 9px', borderRadius: 14, background: 'var(--plate)' }}>
        <button ref={backRef} type="button" data-bp-back onClick={onBack} aria-label="Back to the overview" title="Back to the overview (Esc)" className="bp-row" style={{ flexShrink: 0, width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--base)', color: 'var(--text)', cursor: 'pointer' }}>
          <ChevronLeft size={16} strokeWidth={2.6} aria-hidden />
        </button>
        <img src={TONE_ART[f.tone]} alt="" width={24} height={24} style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={eyebrow}>{CHAPTER[f.tone]}</div>
          {/* "3.8% are below zero" reads as a sentence; a team's finding ("IT Security gained the most ground") says it without points: each team's are on the departments pane */}
          <div style={{ marginTop: 2, minWidth: 0, fontSize: 13, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {f.unit ? f.headline : `${f.value} ${f.headline}`}
          </div>
        </div>
      </div>

      {/* where it sits, and who */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: canSeePeople ? 'minmax(0,0.9fr) minmax(0,1.7fr)' : 'minmax(0,1fr)', gap: 14 }}>
        <Pane
          title="Departments"
          tools={b.departments.length > 8 ? <Find value={view.deptQ} onChange={(deptQ) => setView({ ...view, deptQ, deptPage: 0 })} label="Find a department" isDark={isDark} /> : null}
        >
          <Heads cols={DEPT_COLS}><span>Department</span><span>{VALUE_HEAD[b.kind]}</span><span style={mid}>Health</span></Heads>
          <div ref={deptBox} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {pinned && (
              <button type="button" data-bp-detail-dept="" onClick={() => pickDept(null)} title={`${count(b.people.length)} of ${count(everyone)} people`} style={row(!view.dept, false, true)}>
                <span style={{ minWidth: 0, fontSize: 11, fontWeight: 800 }}>All departments</span>
                <strong style={num11}>{count(b.people.length)}</strong>
                <span style={{ display: 'flex', justifyContent: 'center' }}><Health of={overall} ink={ink} /></span>
              </button>
            )}
            {deptShown.map((d, i) => {
              const Tag = pick ? 'button' : 'div';
              const on = pick && view.dept === d.name;
              return (
                <Tag key={d.name} {...(pick ? { type: 'button', onClick: () => pickDept(d.name), 'aria-pressed': on } : null)} data-bp-detail-dept={d.name} className={pick ? 'bp-row' : undefined} title={b.kind === 'count' ? `${count(d.value)} of ${count(d.size)} people in ${d.name}` : undefined} style={row(on, d.mark, !pinned && i === 0)}>
                  <span style={{ minWidth: 0, fontSize: 11, fontWeight: d.mark ? 900 : 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                  <strong style={num11}>{value(d)}</strong>
                  <span style={{ display: 'flex', justifyContent: 'center' }}><Health of={d} ink={ink} /></span>
                </Tag>
              );
            })}
            {!depts.length && <div style={{ ...small, fontSize: 10.5, padding: '16px 14px' }}>No department matches.</div>}
          </div>
          <div style={{ flexShrink: 0, padding: '0 12px 10px' }}>
            <Pager page={deptPage} pages={deptPages} total={depts.length} size={deptSize} onPage={(p) => setView({ ...view, deptPage: p })} what="departments" />
          </div>
        </Pane>

        {canSeePeople && (
          <Pane
            title={peopleTitle}
            label="People"
            tools={<Find value={view.q} onChange={(q) => setView({ ...view, q, page: 0 })} label="Find a person" isDark={isDark} />}
          >
            <Heads cols={PEOPLE_COLS}><span>Person</span><span style={mid}>Points</span><span style={mid}>Change</span><span style={mid}>{record ? 'Their record' : 'Stands out'}</span></Heads>
            <div ref={peopleBox} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {!people.length && <div style={{ ...small, fontSize: 10.5, padding: '16px 14px' }}>No one matches.</div>}
              {shown.map((x, i) => <PersonRow key={x.key} x={x} ink={ink} cols={PEOPLE_COLS} rowH={ROW_H} first={i === 0} flat noRank center dept={!team && !view.dept} note={record ? <Record x={x} how={record} ink={ink} /> : null} />)}
            </div>
            <div style={{ flexShrink: 0, padding: '0 12px 10px' }}>
              <Pager page={page} pages={pages} total={people.length} size={peopleSize} onPage={(p) => setView({ ...view, page: p })} />
            </div>
          </Pane>
        )}
      </div>
    </motion.div>
  );
}

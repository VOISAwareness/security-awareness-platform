import { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, Info, Search } from 'lucide-react';

import { breakdown, count, share } from '../../services/bigPictureFindings';
import { findingPeople } from '../../services/bigPictureViews';
import { Pager, PersonRow } from './BigPictureTables';
import { useFitRows } from './useFitRows';
import { TONE_ART } from './bigPictureArt';

// A finding opened. A slim header says what it is and no more: a back
// button, the chapter it belongs to and the finding (the line behind it is
// one hover away, on the info mark; the counts are on the panes). Below it,
// two panes side by side: the departments, each with its share (so a team
// of 40 and a team of 4,000 compare fairly), and, for admins, the people in
// whichever department is picked. The department list scrolls and the
// people come a page at a time, each searchable, so it reads the same at
// 100 people or 30,000. The same view serves the organisation and a single
// campaign; the Export menu offers the finding as one file.

const num = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;
const pc = (v) => `${Math.round((v || 0) * 100)}%`;
const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };
const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };
const CHAPTER = { bad: 'Needs attention', good: 'Going well', watch: 'What could happen next' };
// rank, the person (taking the room), points, change, and what stands out against the right edge
const PEOPLE_COLS = '44px minmax(0,1fr) 72px 64px minmax(140px,200px)';
const P_ROW_H = 42;
// The forecast findings list each person's own chance, from the formula.
const CHANCE = { mayDrop: ['pDrop', 'bad', 'of a level down'], mayClimb: ['pUp', 'good', 'of a level up'] };

// One person's chance, e.g. "34% of a level down".
function Chance({ p, color, what }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 10, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, flexShrink: 0, background: color }} />
      <strong style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{p > 0 && p < 0.005 ? '<1%' : pc(p)}</strong>{what}
    </span>
  );
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

// A pane: a header line (title, count, a search), then its body.
function Pane({ title, n, children, tools, label }) {
  return (
    <section aria-label={label || title} style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--hair)', borderRadius: 14, overflow: 'hidden' }}>
      <header style={{ flexShrink: 0, height: 44, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 0 14px', borderBottom: '1px solid var(--hair)' }}>
        <span style={{ minWidth: 0, fontSize: 11.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        {n !== undefined && <span style={{ flexShrink: 0, height: 18, display: 'inline-flex', alignItems: 'center', padding: '0 7px', borderRadius: 999, background: 'var(--track)', fontSize: 9, fontWeight: 800, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{count(n)}</span>}
        <span style={{ marginLeft: 'auto' }} />
        {tools}
      </header>
      {children}
    </section>
  );
}

/** `view` is { dept, q, page, deptQ }, kept by the sheet so Export knows it. */
export function FindingDetail({ f, r, view, onView: setView, canSeePeople, isDark, ink, onBack }) {
  const reduce = useReducedMotion();
  const b = useMemo(() => breakdown(r, f), [r, f]);
  const team = f.link?.dept || null;
  const chance = CHANCE[f.link?.show];
  const backRef = useRef(null);
  useEffect(() => { backRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const people = useMemo(() => findingPeople(b, view, Boolean(team)), [b, view, team]);
  const [peopleBox, peopleSize] = useFitRows(P_ROW_H);
  const pages = Math.max(1, Math.ceil(people.length / peopleSize));
  const page = Math.min(view.page, pages - 1);
  const shown = people.slice(page * peopleSize, (page + 1) * peopleSize);

  const tone = f.tone === 'good' ? ink.good : f.tone === 'bad' ? ink.bad : isDark ? '#8F88F2' : '#6C63E8'; // indigo, as the hourglass
  const value = (d) => (b.kind === 'count' ? share(d.value, d.size) : b.kind === 'rate' ? pc(d.value) : signed(d.value));
  const max = Math.max(1e-6, ...b.departments.map((d) => (b.kind === 'count' ? d.share : Math.abs(d.value))));
  const dq = view.deptQ.trim().toLowerCase();
  const depts = dq ? b.departments.filter((d) => d.name.toLowerCase().includes(dq)) : b.departments;
  const pick = !team && canSeePeople; // departments narrow the people
  const everyone = r.people.length;

  const pickDept = (name) => setView({ ...view, dept: name, page: 0 });
  const row = (on, mark) => ({ width: '100%', minHeight: 46, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '0 14px', border: 'none', borderLeft: `3px solid ${on ? 'var(--bp-accent)' : 'transparent'}`, borderBottom: '1px solid var(--hair)', background: on || mark ? 'var(--bp-soft)' : 'none', color: 'var(--text)', textAlign: 'left', cursor: pick ? 'pointer' : 'default' });
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, minWidth: 0 }}>
            <span style={{ minWidth: 0, fontSize: 13, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {f.value}{f.unit ? ` ${f.unit}` : ''} {f.headline}
            </span>
            {f.detail && (
              <span tabIndex={0} role="img" aria-label={f.detail} title={f.detail} style={{ flexShrink: 0, display: 'inline-grid', placeItems: 'center', color: 'var(--muted)', cursor: 'help' }}>
                <Info size={13} strokeWidth={2.4} aria-hidden />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* where it sits, and who */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: canSeePeople ? 'minmax(0,0.9fr) minmax(0,1.7fr)' : 'minmax(0,1fr)', gap: 14 }}>
        <Pane
          title="Departments"
          n={b.departments.length}
          tools={b.departments.length > 8 ? <Find value={view.deptQ} onChange={(deptQ) => setView({ ...view, deptQ })} label="Find a department" isDark={isDark} /> : null}
        >
          <div className="lb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {pick && !dq && (
              <button type="button" data-bp-detail-dept="" onClick={() => pickDept(null)} style={row(!view.dept, false)}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, width: '100%' }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 800 }}>All departments</span>
                  <strong style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{share(b.people.length, everyone)}</strong>
                </span>
                <span style={{ ...small, fontSize: 9 }}>{count(b.people.length)} of {count(everyone)} people</span>
              </button>
            )}
            {depts.map((d) => {
              const Tag = pick ? 'button' : 'div';
              const v = b.kind === 'count' ? d.share : Math.abs(d.value);
              const fill = b.kind === 'points' ? (d.value >= 0 ? ink.good : ink.bad) : tone;
              const on = pick && view.dept === d.name;
              return (
                <Tag key={d.name} {...(pick ? { type: 'button', onClick: () => pickDept(d.name), 'aria-pressed': on } : null)} data-bp-detail-dept={d.name} className={pick ? 'bp-row' : undefined} style={row(on, d.mark)}>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, width: '100%', minWidth: 0 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: d.mark ? 900 : 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                    <strong style={{ flexShrink: 0, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{value(d)}</strong>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                    <span aria-hidden style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${Math.max(2, (v / max) * 100)}%`, borderRadius: 999, background: fill, opacity: team && !d.mark ? 0.45 : 1 }} />
                    </span>
                    <span style={{ ...small, fontSize: 9, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{b.kind === 'count' ? `${count(d.value)} of ${count(d.size)}` : `${count(d.size)} ${d.size === 1 ? 'person' : 'people'}`}</span>
                  </span>
                </Tag>
              );
            })}
            {!depts.length && <div style={{ ...small, fontSize: 10.5, padding: '16px 14px' }}>No department matches.</div>}
          </div>
        </Pane>

        {canSeePeople && (
          <Pane
            title={peopleTitle}
            n={people.length}
            label="People"
            tools={<Find value={view.q} onChange={(q) => setView({ ...view, q, page: 0 })} label="Find a person" isDark={isDark} />}
          >
            <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: PEOPLE_COLS, gap: 12, padding: '8px 12px', borderBottom: '1px solid var(--hair)', ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              <span>Rank</span><span>Person</span><span style={{ textAlign: 'right' }}>Points</span><span style={{ textAlign: 'right' }}>Change</span><span style={{ textAlign: 'right' }}>{chance ? 'Chance after one more email' : 'Stands out'}</span>
            </div>
            <div ref={peopleBox} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {!people.length && <div style={{ ...small, fontSize: 10.5, padding: '16px 14px' }}>No one matches.</div>}
              {shown.map((x, i) => <PersonRow key={x.key} x={x} ink={ink} cols={PEOPLE_COLS} rowH={P_ROW_H} first={i === 0} end note={chance ? <Chance p={x[chance[0]]} color={ink[chance[1]]} what={chance[2]} /> : null} />)}
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

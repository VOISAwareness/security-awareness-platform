import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Building2, ChevronLeft, Download, Hourglass, Search, ThumbsUp, TriangleAlert, Users, X } from 'lucide-react';

import { breakdown, count, share } from '../../services/bigPictureFindings';
import { breakdownCsv, peopleCsv } from '../../services/bigPictureExport';
import { csvName, downloadCsv } from '../../services/csv';
import { Pager, PersonRow } from './BigPictureTables';
import { useFitRows } from './useFitRows';

// A finding opened. First by department: where it sits, each team as a bar
// of its share (so a team of 40 and a team of 4,000 compare fairly). Then,
// for admins, the people: a page at a time, searchable, narrowed to a
// department with one click. Each view exports what it shows. The same view
// serves the organisation and a single campaign.

const num = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;
const pc = (v) => `${Math.round((v || 0) * 100)}%`;
const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };
const TONE = { bad: TriangleAlert, watch: Hourglass, good: ThumbsUp };
const PEOPLE_COLS = '52px minmax(0,2.2fr) 70px 66px minmax(0,1.3fr)';
const D_ROW_H = 40;
const P_ROW_H = 44;

const button = (primary) => ({
  height: 30, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 9, fontSize: 10.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
  border: primary ? 'none' : '1px solid var(--hair)', background: primary ? 'var(--ink)' : 'transparent', color: primary ? 'var(--ink-on)' : 'var(--text)',
});

export function FindingDetail({ f, r, canSeePeople, isDark, ink, scopeName, onBack, onOpenPeople }) {
  const reduce = useReducedMotion();
  const b = useMemo(() => breakdown(r, f), [r, f]);
  const team = Boolean(f.link?.dept);
  const [view, setView] = useState({ tab: 'departments', dept: team ? f.link.dept : null, q: '', page: 0, deptPage: 0 });
  const backRef = useRef(null);
  useEffect(() => { backRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const q = view.q.trim().toLowerCase();
  const people = useMemo(() => {
    let list = view.dept && !team ? b.people.filter((x) => x.dept === view.dept) : b.people;
    if (q) list = list.filter((x) => x.name.toLowerCase().includes(q) || x.email.toLowerCase().includes(q));
    return list;
  }, [b.people, view.dept, team, q]);

  const [deptBox, deptSize] = useFitRows(D_ROW_H);
  const [peopleBox, peopleSize] = useFitRows(P_ROW_H);
  const deptPages = Math.max(1, Math.ceil(b.departments.length / deptSize));
  const deptPage = Math.min(view.deptPage, deptPages - 1);
  const depts = b.departments.slice(deptPage * deptSize, (deptPage + 1) * deptSize);
  const pages = Math.max(1, Math.ceil(people.length / peopleSize));
  const page = Math.min(view.page, pages - 1);
  const shown = people.slice(page * peopleSize, (page + 1) * peopleSize);

  const Icon = TONE[f.tone];
  const tone = f.tone === 'good' ? ink.good : f.tone === 'bad' ? ink.bad : 'var(--text)';
  const max = Math.max(1e-6, ...b.departments.map((d) => (b.kind === 'count' ? d.share : Math.abs(d.value))));
  const file = (what) => csvName('big picture', scopeName, f.headline, what);
  const tabs = [
    { id: 'departments', label: 'By department', Icon: Building2, n: b.departments.length },
    ...(canSeePeople ? [{ id: 'people', label: 'People', Icon: Users, n: b.people.length }] : []),
  ];

  return (
    <motion.div
      data-bp-detail={f.id}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* the finding */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button ref={backRef} type="button" onClick={onBack} aria-label="Back to the story" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, height: 30, padding: '0 12px 0 8px', borderRadius: 999, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
          <ChevronLeft size={14} strokeWidth={2.6} aria-hidden /> The story
        </button>
        <span aria-hidden style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--track)', color: tone }}><Icon size={15} strokeWidth={2.5} /></span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <span className="vs-rank" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)', whiteSpace: 'nowrap' }}>{f.value}{f.unit && <span style={{ ...small, fontWeight: 800, marginLeft: 4 }}>{f.unit}</span>}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.headline}</span>
          </span>
          <span style={{ display: 'block', ...small, fontSize: 10, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.detail}</span>
        </span>
      </div>

      {/* the two views, and what they export */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div role="tablist" aria-label="The detail" style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 11, background: 'var(--track)' }}>
          {tabs.map((t) => {
            const on = view.tab === t.id;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={on} data-bp-detail-tab={t.id} onClick={() => setView({ ...view, tab: t.id })} style={{ height: 28, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 10.5, fontWeight: 800, background: on ? 'var(--base)' : 'transparent', color: on ? 'var(--text)' : 'var(--muted)', boxShadow: on ? '0 1px 3px rgba(15,23,42,0.12)' : 'none' }}>
                <t.Icon size={13} strokeWidth={2.4} aria-hidden />{t.label}<span style={{ fontSize: 9, color: 'var(--muted)' }}>{count(t.n)}</span>
              </button>
            );
          })}
        </div>
        {view.tab === 'people' && (
          <>
            <label style={{ position: 'relative', width: 190 }}>
              <span className="sr-only">Find a person</span>
              <Search size={13} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input type="search" value={view.q} onChange={(e) => setView({ ...view, q: e.target.value, page: 0 })} placeholder="Find a person" style={{ height: 30, width: '100%', boxSizing: 'border-box', borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)', fontSize: 10.5, fontWeight: 600, padding: '0 8px 0 28px', outline: 'none', colorScheme: isDark ? 'dark' : 'light' }} />
            </label>
            {view.dept && !team && (
              <button type="button" data-bp-detail-chip onClick={() => setView({ ...view, dept: null, page: 0 })} aria-label={`Show every department, not only ${view.dept}`} style={{ height: 28, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px', borderRadius: 999, border: 'none', background: 'var(--bp-soft)', color: 'var(--text)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>
                {view.dept} <X size={12} strokeWidth={2.8} aria-hidden />
              </button>
            )}
          </>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {view.tab === 'people' ? (
            <>
              <button type="button" onClick={() => onOpenPeople({ dept: view.dept || f.link?.dept })} className="bp-link" style={{ ...button(false), border: 'none', padding: '0 4px' }}>
                Open in People <ArrowRight size={12} strokeWidth={2.6} aria-hidden />
              </button>
              <button type="button" data-bp-export-finding onClick={() => downloadCsv(file(view.dept && !team ? view.dept : 'people'), peopleCsv(people))} style={button(true)}>
                <Download size={13} strokeWidth={2.6} aria-hidden />Export {count(people.length)}
              </button>
            </>
          ) : (
            <button type="button" data-bp-export-breakdown onClick={() => downloadCsv(file('departments'), breakdownCsv(b))} style={button(true)}>
              <Download size={13} strokeWidth={2.6} aria-hidden />Export
            </button>
          )}
        </span>
      </div>

      {/* by department: share of each team, highest first */}
      {view.tab === 'departments' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,2fr) 150px', gap: 16, padding: '0 12px 8px', borderBottom: '1px solid var(--hair)', ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <span>Department</span>
            <span>{b.kind === 'count' ? 'Share of the team' : b.kind === 'rate' ? 'Report rate' : 'Points per person'}</span>
            <span style={{ textAlign: 'right' }}>{b.kind === 'count' ? 'People' : 'Team size'}</span>
          </div>
          <div ref={deptBox} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {depts.map((d, i) => {
              const Tag = !team && canSeePeople ? 'button' : 'div';
              const v = b.kind === 'count' ? d.share : Math.abs(d.value);
              const fill = b.kind === 'points' ? (d.value >= 0 ? ink.good : ink.bad) : tone;
              return (
                <Tag
                  key={d.name}
                  {...(Tag === 'button' ? { type: 'button', className: 'bp-row', onClick: () => setView({ ...view, tab: 'people', dept: d.name, page: 0 }), title: `See the people in ${d.name}` } : null)}
                  data-bp-detail-dept={d.name}
                  style={{ width: '100%', height: D_ROW_H, display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,2fr) 150px', alignItems: 'center', gap: 16, padding: '0 12px', border: 'none', borderTop: i ? '1px solid var(--hair)' : 'none', background: d.mark ? 'var(--bp-soft)' : 'none', color: 'var(--text)', textAlign: 'left', cursor: Tag === 'button' ? 'pointer' : 'default' }}
                >
                  <span style={{ fontSize: 11, fontWeight: d.mark ? 900 : 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                  <span style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 48px', alignItems: 'center', gap: 10 }}>
                    <span aria-hidden style={{ height: 6, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${Math.max(2, (v / max) * 100)}%`, borderRadius: '0 4px 4px 0', background: fill, opacity: team && !d.mark ? 0.4 : 1 }} />
                    </span>
                    <strong style={{ fontSize: 11, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{b.kind === 'count' ? share(d.value, d.size) : b.kind === 'rate' ? pc(d.value) : signed(d.value)}</strong>
                  </span>
                  <span style={{ ...small, fontSize: 10, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {b.kind === 'count' ? <><strong style={{ color: 'var(--text)' }}>{count(d.value)}</strong> of {count(d.size)}</> : `${count(d.size)} people`}
                  </span>
                </Tag>
              );
            })}
          </div>
          <Pager page={deptPage} pages={deptPages} total={b.departments.length} size={deptSize} onPage={(p) => setView({ ...view, deptPage: p })} what="departments" />
        </div>
      )}

      {/* the people: a page at a time */}
      {view.tab === 'people' && canSeePeople && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: PEOPLE_COLS, gap: 12, padding: '0 12px 8px', borderBottom: '1px solid var(--hair)', ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <span>Rank</span><span>Person</span><span style={{ textAlign: 'right' }}>Points</span><span style={{ textAlign: 'right' }}>Change</span><span>Stands out</span>
          </div>
          <div ref={peopleBox} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {!people.length && <div style={{ ...small, fontSize: 10.5, padding: '18px 12px' }}>No one matches.</div>}
            {shown.map((x, i) => <PersonRow key={x.key} x={x} ink={ink} cols={PEOPLE_COLS} rowH={P_ROW_H} first={i === 0} />)}
          </div>
          <Pager page={page} pages={pages} total={people.length} size={peopleSize} onPage={(p) => setView({ ...view, page: p })} />
        </div>
      )}
    </motion.div>
  );
}

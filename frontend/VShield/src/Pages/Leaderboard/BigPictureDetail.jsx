import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronLeft, Download, Hourglass, ThumbsUp, TriangleAlert } from 'lucide-react';

import LevelBadge from '../../GlobalComponents/LevelBadge';
import { LEVEL_BY_ID, rankName } from '../../services/levels';
import { breakdown } from '../../services/bigPictureFindings';
import { breakdownCsv, peopleCsv } from '../../services/bigPictureExport';
import { csvName, downloadCsv } from '../../services/csv';

// A finding opened: where it sits, department by department, and (for
// admins) exactly who is in it. Click a department to narrow the people to
// it. Both lists export. The same view serves the organisation and a single
// campaign, as the finding carries its own scope.

const num = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;
const pc = (v) => `${Math.round((v || 0) * 100)}%`;
const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };
const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };
const TONE = { bad: TriangleAlert, watch: Hourglass, good: ThumbsUp };
const SHOWN = 200; // people drawn here; the full list is in People

const button = (primary) => ({
  height: 30, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 9, fontSize: 10.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
  border: primary ? 'none' : '1px solid var(--hair)', background: primary ? 'var(--ink)' : 'transparent', color: primary ? 'var(--ink-on)' : 'var(--text)',
});

// What stands out about a person, for the list: the first that applies.
const flagOf = (x) => (x.fellBelowZero ? 'Fell below zero' : x.belowZero ? 'Below zero' : x.nearZero ? '1 click from below zero' : x.nearSlip ? '1 click from a level down' : x.moved === 'down' ? 'Slipped a level' : x.gave ? 'Gave details away' : x.backAbove ? 'Back above zero' : x.moved === 'up' ? 'Climbed a level' : x.nearUp ? '1 report from a level up' : '');

export function FindingDetail({ f, r, canSeePeople, ink, scopeName, onBack, onOpenPeople }) {
  const reduce = useReducedMotion();
  const b = useMemo(() => breakdown(r, f), [r, f]);
  const [dept, setDept] = useState(f.link?.dept || null);
  const back = useRef(null);
  useEffect(() => { back.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  const team = Boolean(f.link?.dept);
  const people = dept && !team ? b.people.filter((x) => x.dept === dept) : b.people;
  const Icon = TONE[f.tone];
  const tone = f.tone === 'good' ? ink.good : f.tone === 'bad' ? ink.bad : 'var(--text)';
  const bar = f.tone === 'good' ? ink.good : f.tone === 'bad' ? ink.bad : 'var(--text)';
  const max = Math.max(1e-6, ...b.departments.map((d) => Math.abs(d.value)));
  const valueText = (d) => (b.kind === 'rate' ? pc(d.value) : b.kind === 'points' ? `${signed(d.value)} pts` : num(d.value));
  const file = (what) => csvName('big picture', scopeName, f.id, what);

  return (
    <motion.div
      data-bp-detail={f.id}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* the finding itself */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
        <button ref={back} type="button" onClick={onBack} aria-label="Back to the story" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, height: 30, padding: '0 12px 0 8px', borderRadius: 999, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
          <ChevronLeft size={14} strokeWidth={2.6} aria-hidden /> The story
        </button>
        <span aria-hidden style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--track)', color: tone }}><Icon size={15} strokeWidth={2.5} /></span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <span className="vs-rank" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)' }}>{f.value}{f.unit ? <span style={{ ...small, fontWeight: 800, marginLeft: 4 }}>{f.unit}</span> : null}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.headline}</span>
          </span>
          <span style={{ display: 'block', ...small, fontSize: 10, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.detail}</span>
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: canSeePeople ? 'minmax(0,1fr) minmax(0,1.35fr)' : 'minmax(0,1fr)', gap: 28 }}>
        {/* by department */}
        <section aria-label="By department" style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--hair)' }}>
            <span>
              <span style={eyebrow}>By department</span>
              <span style={{ display: 'block', ...small, marginTop: 3 }}>
                {b.kind === 'count' ? `${b.departments.length} department${b.departments.length === 1 ? '' : 's'} · share of each team` : b.kind === 'rate' ? 'Every team’s report rate' : 'Every team’s points gained or lost'}
                {!team && canSeePeople ? ' · click one to see its people' : ''}
              </span>
            </span>
            <button type="button" data-bp-export-breakdown onClick={() => downloadCsv(file('departments'), breakdownCsv(b))} style={button(false)}>
              <Download size={13} strokeWidth={2.6} aria-hidden />Export
            </button>
          </div>
          <div className="lb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: 6 }}>
            {b.departments.map((d) => {
              const on = team ? d.mark : dept === d.name;
              const Tag = !team && canSeePeople ? 'button' : 'div';
              return (
                <Tag
                  key={d.name}
                  {...(Tag === 'button' ? { type: 'button', onClick: () => setDept(on ? null : d.name), 'aria-pressed': on, className: 'bp-row' } : null)}
                  data-bp-detail-dept={d.name}
                  style={{ width: '100%', display: 'block', textAlign: 'left', padding: '9px 10px', border: 'none', borderBottom: '1px solid var(--hair)', borderRadius: 0, background: on ? 'var(--bp-soft)' : 'none', color: 'var(--text)', cursor: Tag === 'button' ? 'pointer' : 'default' }}
                >
                  <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ minWidth: 0, fontSize: 10.5, fontWeight: on ? 900 : 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                    <span style={{ flexShrink: 0, ...small, fontSize: 10 }}>
                      <strong style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{valueText(d)}</strong>
                      {b.kind === 'count' ? ` of ${num(d.size)} · ${pc(d.share)}` : ` · ${num(d.size)} people`}
                    </span>
                  </span>
                  <span aria-hidden style={{ display: 'block', height: 6, marginTop: 6, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${Math.max(2, (Math.abs(d.value) / max) * 100)}%`, borderRadius: '0 4px 4px 0', background: b.kind === 'points' ? (d.value >= 0 ? ink.good : ink.bad) : bar, opacity: team && !d.mark ? 0.35 : 1 }} />
                  </span>
                </Tag>
              );
            })}
          </div>
        </section>

        {/* the people (admins) */}
        {canSeePeople && (
          <section aria-label="People" style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, paddingBottom: 10, borderBottom: '1px solid var(--hair)' }}>
              <span>
                <span style={eyebrow}>People</span>
                <span style={{ display: 'block', ...small, marginTop: 3 }}>
                  {num(people.length)} {dept && !team ? `in ${dept}` : team ? `in ${f.link.dept}` : 'in total'} · lowest points first
                  {dept && !team && <> · <button type="button" onClick={() => setDept(null)} style={{ padding: 0, border: 'none', background: 'none', ...small, fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}>all departments</button></>}
                </span>
              </span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => onOpenPeople({ dept: dept || f.link?.dept })} className="bp-link" style={{ ...button(false), border: 'none', padding: '0 4px' }}>
                  Open in People <ArrowRight size={12} strokeWidth={2.6} aria-hidden />
                </button>
                <button type="button" data-bp-export-finding onClick={() => downloadCsv(file(dept && !team ? dept : 'people'), peopleCsv(people))} style={button(true)}>
                  <Download size={13} strokeWidth={2.6} aria-hidden />Export {num(people.length)}
                </button>
              </span>
            </div>
            <div className="lb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', paddingRight: 6 }}>
              {people.slice(0, SHOWN).map((x) => {
                const level = LEVEL_BY_ID[x.levelId];
                return (
                  <div key={x.key} data-bp-detail-person={x.key} style={{ display: 'grid', gridTemplateColumns: '44px 22px minmax(0,1.4fr) minmax(0,1fr) 64px 56px', alignItems: 'center', gap: 10, padding: '7px 6px', borderBottom: '1px solid var(--hair)' }}>
                    <span style={{ ...small, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>#{num(x.rank)}</span>
                    {level ? <LevelBadge level={level} size={22} tilt={false} decorative /> : <span />}
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name || x.key}</span>
                      <span style={{ display: 'block', ...small, fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.dept} · {rankName(level)}</span>
                    </span>
                    <span style={{ ...small, fontSize: 9.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{flagOf(x)}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(x.points)} <span style={{ ...small, fontSize: 8.5 }}>pts</span></span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, fontSize: 10, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {x.change ? <>{x.change > 0 ? <ArrowUpRight size={11} strokeWidth={3} color={ink.good} aria-hidden /> : <ArrowDownRight size={11} strokeWidth={3} color={ink.bad} aria-hidden />}{signed(x.change)}</> : <span style={small}>—</span>}
                    </span>
                  </div>
                );
              })}
              {people.length > SHOWN && (
                <p style={{ ...small, fontSize: 10, margin: '10px 6px' }}>
                  Showing the lowest {SHOWN} of {num(people.length)}. <button type="button" onClick={() => onOpenPeople({ dept: dept || f.link?.dept })} style={{ padding: 0, border: 'none', background: 'none', ...small, fontSize: 10, fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}>Open in People</button> for all of them.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}

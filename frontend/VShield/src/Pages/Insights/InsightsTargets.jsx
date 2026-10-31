import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Mail, Minus, Plus, ShieldCheck, SlidersHorizontal, Timer, X } from 'lucide-react';

import { GLOSSARY } from '../../services/glossary';
import { TARGETS, UNITS, checkTarget, pairFor, standing, targetsWith } from '../../services/insightsTargets';
import { EASE, INK, alpha, small, themeVars, TYPE } from './insightsUi';

// Insights' Targets, for admins: where each measure should be. "Set
// targets" in the page's title bar opens a dialog in three sections (Risk,
// Phishing emails, Response & training), listed on the left. Each measure
// is a card: what it counts, one number ("Should be at most 5 %", with − and
// +), and beside it the company now on the same bar as the band's tile, the
// at-risk edge (it follows the target, keeping the default's proportion) and
// how many departments the target would put on target. Save stores all
// seven (PUT /insights-targets) against the version read, so a change made
// since is not lost; the page then measures against them at once.

const SECTIONS = [
  { id: 'risk', name: 'Risk', Icon: ShieldCheck, what: 'How exposed people are, from their phishing record.', keys: ['riskScore', 'highRiskShare'] },
  { id: 'phishing', name: 'Phishing emails', Icon: Mail, what: 'What people do with a simulated phishing email, as a share of the emails delivered.', keys: ['hookRate', 'reportRate', 'gaveDetails'] },
  { id: 'response', name: 'Response & training', Icon: Timer, what: 'How fast people raise the alarm, and how much of the assigned training gets done.', keys: ['firstReport', 'trainingCompletion'] },
];
const ORDER = SECTIONS.flatMap((s) => s.keys);
const NAMES = {
  riskScore: GLOSSARY.riskScore.name,
  highRiskShare: GLOSSARY.highRisk.name,
  hookRate: GLOSSARY.hookRate.name,
  reportRate: GLOSSARY.reportRate.name,
  gaveDetails: GLOSSARY.gaveDetails.name,
  firstReport: 'Time to first report',
  trainingCompletion: GLOSSARY.trainingCompletion.name,
};
const COUNTS = {
  riskScore: 'Out of 100: the average of everyone’s risk level',
  highRiskShare: 'People who clicked more than once, or gave details away',
  hookRate: 'Clicked the link',
  reportRate: 'Reported the email',
  gaveDetails: 'Entered details on the practice page',
  firstReport: 'Median minutes from sending to the first report',
  trainingCompletion: 'Trainings completed, of those assigned',
};
// what − and + move a target by, in the box's units
const STEP = { riskScore: 1, highRiskShare: 1, hookRate: 1, reportRate: 5, gaveDetails: 0.5, firstReport: 5, trainingCompletion: 5 };
const UNIT_TEXT = { '': 'of 100', '%': '%', min: 'min' };

// a stored value as its box shows it (a rate in %), and back
const toBox = (key, v) => (UNITS[key] === '%' ? String(Math.round(v * 1000) / 10) : String(v));
const fromBox = (key, text) => {
  const t = String(text).trim();
  if (t === '') return NaN;
  const n = Number(t);
  return UNITS[key] === '%' ? n / 100 : n;
};
// a value as the page shows it
const shown = (key, v) => {
  if (!Number.isFinite(v)) return '—';
  const u = UNITS[key];
  return u === '%' ? `${String(Math.round(v * 1000) / 10)}%` : u === 'min' ? `${Math.round(v)} min` : String(Math.round(v * 10) / 10);
};

// what went wrong with a save, in words
function failure(e) {
  if (e?.status === 409) return 'Someone changed the targets since you opened them. Close this and open it again to see theirs.';
  if (e?.status === 403) return 'Only an admin can change the targets.';
  if (e?.status === 503) return 'The server is busy. Try again in a moment.';
  if (e?.status === 400 && e.message) return e.message;
  return 'Couldn’t reach the server, so nothing was saved.';
}

const when = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** "Set targets", in the page's title bar (black on the light theme, glass on the dark); admins only. */
export function TargetsButton({ onClick, isDark }) {
  return (
    <button
      type="button"
      className="ins-bar-btn"
      data-ins-targets
      onClick={onClick}
      title="Set where each measure should be"
      style={{ flexShrink: 0, height: 28, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px 0 10px', borderRadius: 8, border: `1px solid ${isDark ? 'var(--card-edge)' : 'rgba(255,255,255,0.28)'}`, background: 'transparent', color: 'inherit', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
    >
      <SlidersHorizontal size={13} strokeWidth={2.4} aria-hidden />
      Set targets
    </button>
  );
}

/**
 * A measure along its whole scale, as on the band's tiles and a department's
 * "What they fall for" bars. The light green stretch of the track is the
 * target. Lower is better: green up to the target, red for the part beyond
 * it. Higher is better: red until the bar reaches the target, green once it
 * does. `gap` is the surface it sits on, for the cut between the two.
 */
export function TargetBar({ value, target, ink, gap = 'var(--plate)' }) {
  const x = (q) => Math.max(0, Math.min(100, (q / target.max) * 100));
  const seg = (from, to, bg, more) => <span style={{ position: 'absolute', top: 0, bottom: 0, left: `${x(from)}%`, width: `${x(to) - x(from)}%`, background: bg, ...more }} />;
  const end = { borderRadius: '0 999px 999px 0' };
  const down = target.better === 'down';
  let fill = null;
  if (Number.isFinite(value)) {
    if (!down) fill = seg(0, value, value >= target.target ? ink.good : ink.bad, end);
    else if (value <= target.target) fill = seg(0, value, ink.good, end);
    else fill = <>{seg(0, target.target, ink.good)}{seg(target.target, value, ink.bad, { ...end, borderLeft: `2px solid ${gap}` })}</>;
  }
  return (
    <span aria-hidden style={{ position: 'relative', display: 'block', width: '100%', height: 10, borderRadius: 999, overflow: 'hidden', background: 'var(--tick)' }}>
      {down ? seg(0, target.target, alpha(ink.good, 0.26)) : seg(target.target, target.max, alpha(ink.good, 0.26))}
      <span className="ins-grow-x" style={{ position: 'absolute', inset: 0, transformOrigin: 'left' }}>{fill}</span>
    </span>
  );
}

const stepBtn = { width: 28, height: 32, display: 'grid', placeItems: 'center', padding: 0, borderRadius: 8, border: 'none', background: 'var(--track)', color: 'var(--text)', cursor: 'pointer' };

// One measure: what it counts and its target on the left; the company now,
// its bar against the target in the box, the at-risk edge and the
// departments on target on the right.
function MeasureCard({ k, box, onBox, now, depts, ink }) {
  const down = TARGETS[k].better === 'down';
  const value = fromBox(k, box);
  const problem = checkTarget(k, value);
  const pair = problem ? null : pairFor(k, value);
  const t = pair ? targetsWith({ [k]: pair })[k] : null;
  const onTarget = pair && depts.length && Number.isFinite(depts[0].now[k]) ? depts.filter((d) => standing(d.now[k], t) === 'on').length : null;
  const nudge = (dir) => {
    const v = Number.isFinite(Number(box)) ? Number(box) : 0;
    const next = Math.max(0, Math.round((v + dir * STEP[k]) * 10) / 10);
    onBox(String(next));
  };
  const u = UNIT_TEXT[UNITS[k]];
  return (
    <div data-ins-target-row={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,250px)', columnGap: 22, alignItems: 'center', padding: '13px 16px', borderRadius: 14, border: '1px solid var(--hair-strong)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: TYPE.figure, fontWeight: 900 }}>{NAMES[k]}</div>
        <div style={{ ...small, marginTop: 1 }}>{COUNTS[k]}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
          <span style={{ fontSize: TYPE.strong, fontWeight: 700, marginRight: 4 }}>Should be {down ? 'at most' : 'at least'}</span>
          <button type="button" aria-label={`Lower the ${NAMES[k]} target`} onClick={() => nudge(-1)} style={stepBtn}><Minus size={13} strokeWidth={2.6} aria-hidden /></button>
          <input
            id={`ins-target-${k}`}
            inputMode="decimal"
            aria-label={`${NAMES[k]}: should be ${down ? 'at most' : 'at least'}, ${u}`}
            aria-invalid={problem ? true : undefined}
            value={box}
            onChange={(e) => onBox(e.target.value)}
            style={{ width: 54, height: 32, boxSizing: 'border-box', padding: '0 6px', borderRadius: 8, border: `1px solid ${problem ? ink.bad : 'var(--hair-strong)'}`, background: 'var(--base)', color: 'var(--text)', fontSize: TYPE.strong, fontWeight: 800, fontVariantNumeric: 'tabular-nums', textAlign: 'center', outline: 'none' }}
          />
          <button type="button" aria-label={`Raise the ${NAMES[k]} target`} onClick={() => nudge(1)} style={stepBtn}><Plus size={13} strokeWidth={2.6} aria-hidden /></button>
          <span style={{ ...small, fontWeight: 700, whiteSpace: 'nowrap' }}>{u}</span>
        </div>
        {problem && <div role="alert" style={{ marginTop: 6, fontSize: TYPE.small, fontWeight: 700, color: ink.bad }}>{problem}</div>}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, ...small }}>Company now <strong className="vs-rank" style={{ fontSize: TYPE.figure, fontWeight: 900, color: 'var(--text)' }}>{shown(k, now)}</strong></div>
        <div style={{ marginTop: 6 }}>{t ? <TargetBar value={now} target={t} ink={ink} gap="var(--base)" /> : <span aria-hidden style={{ display: 'block', height: 10, borderRadius: 999, background: 'var(--track)' }} />}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 6, ...small, whiteSpace: 'nowrap' }}>
          <span>{pair ? `At risk ${down ? 'up to' : 'down to'} ${shown(k, pair.atRisk)}` : ' '}</span>
          {onTarget !== null && <span>Departments on target <strong style={{ color: 'var(--text)', fontWeight: 800 }}>{onTarget} of {depts.length}</strong></span>}
        </div>
      </div>
    </div>
  );
}

/**
 * The dialog. `saved` is what GET /insights-targets returned ({ targets,
 * version, modifiedBy, modifiedAt }, and `failed` if it could not be read);
 * `now` is the company's figure for each measure; `depts` the Departments
 * rows (deptTargets.js), for how many each target puts on target;
 * `onSave(targets)` stores the seven and throws what went wrong.
 */
export function TargetsEditor({ saved, now, depts, isDark, reduce, onSave, onClose }) {
  const inForce = targetsWith(saved.targets);
  const [boxes, setBoxes] = useState(() => Object.fromEntries(ORDER.map((k) => [k, toBox(k, inForce[k].target)])));
  const [touched, setTouched] = useState({});
  const [section, setSection] = useState(SECTIONS[0].id);
  const [state, setState] = useState({ busy: false, error: null });
  const panel = useRef(null);
  const ink = isDark ? INK.dark : INK.light;

  // a measure left alone keeps what is in force (its at-risk edge too); one
  // whose target was set takes the edge that follows it
  const problems = Object.fromEntries(ORDER.map((k) => [k, touched[k] ? checkTarget(k, fromBox(k, boxes[k])) : null]));
  const values = Object.fromEntries(ORDER.map((k) => [k, touched[k] && !problems[k] ? pairFor(k, fromBox(k, boxes[k])) : { target: inForce[k].target, atRisk: inForce[k].atRisk }]));
  const bad = ORDER.some((k) => problems[k]);
  const changed = ORDER.some((k) => values[k].target !== inForce[k].target || values[k].atRisk !== inForce[k].atRisk);
  const close = () => { if (!state.busy) onClose(); };
  const busy = useRef(false);
  useEffect(() => { busy.current = state.busy; }, [state.busy]);
  useEffect(() => { panel.current?.querySelector('input')?.focus(); }, [section]);
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape' && !busy.current) onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const setBox = (k) => (v) => { setBoxes((b) => ({ ...b, [k]: v })); setTouched((t) => ({ ...t, [k]: true })); };
  const reset = () => { setBoxes(Object.fromEntries(ORDER.map((k) => [k, toBox(k, TARGETS[k].target)]))); setTouched(Object.fromEntries(ORDER.map((k) => [k, true]))); };
  const save = async () => {
    setState({ busy: true, error: null });
    try {
      await onSave(values);
      onClose();
    } catch (e) {
      setState({ busy: false, error: failure(e) });
    }
  };
  const last = saved.modifiedBy && when(saved.modifiedAt);
  const note = saved.failed ? 'Couldn’t load the saved targets, so these are the defaults.' : last ? `Last changed by ${saved.modifiedBy} on ${last}` : 'These are the default targets.';
  const on = SECTIONS.find((s) => s.id === section);

  return createPortal(
    <div data-ins-targets-dialog onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }} style={{ ...themeVars(isDark), position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,0.42)', backdropFilter: 'blur(3px)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ins-targets-title"
        initial={{ opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
        style={{ width: 'min(900px, 100%)', height: 'min(500px, calc(100vh - 32px))', display: 'grid', gridTemplateColumns: '230px minmax(0,1fr)', overflow: 'hidden', borderRadius: 18, border: '1px solid var(--card-edge)', background: 'var(--base)', boxShadow: '0 30px 70px rgba(15,23,42,0.28)', color: 'var(--text)' }}
      >
        <nav aria-label="Target sections" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '22px 14px', background: 'var(--plate)', borderRight: '1px solid var(--hair)' }}>
          <h2 id="ins-targets-title" style={{ margin: '0 8px', fontSize: TYPE.heading, fontWeight: 900 }}>Targets</h2>
          <span style={{ margin: '4px 8px 14px', ...small, fontSize: TYPE.body, lineHeight: 1.4 }}>Where each measure should be. The company and every department are measured against these.</span>
          <div role="tablist" aria-orientation="vertical" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {SECTIONS.map((s) => {
              const sel = s.id === section;
              const wrong = s.keys.some((k) => problems[k]);
              return (
                <button key={s.id} type="button" role="tab" aria-selected={sel} aria-controls="ins-targets-panel" data-ins-targets-section={s.id} onClick={() => setSection(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 12, border: 'none', background: sel ? 'var(--base)' : 'transparent', boxShadow: sel ? '0 2px 8px rgba(15,23,42,0.08)' : 'none', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                  <span aria-hidden style={{ width: 30, height: 30, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 9, background: sel ? alpha(ink.bad, 0.12) : 'var(--base)', border: sel ? 'none' : '1px solid var(--hair)', color: sel ? 'var(--brand)' : 'var(--muted)' }}><s.Icon size={15} strokeWidth={2.3} /></span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: TYPE.strong, fontWeight: 800 }}>{s.name}</span>
                    <span style={{ display: 'block', ...small, color: wrong ? ink.bad : 'var(--muted)', fontWeight: wrong ? 800 : 600 }}>{wrong ? 'A number needs fixing' : `${s.keys.length} measures`}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div style={{ position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '22px 26px 18px' }}>
          <button type="button" aria-label="Close" onClick={close} style={{ position: 'absolute', right: 20, top: 18, width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 999, border: 'none', background: 'var(--track)', color: 'var(--text)', cursor: 'pointer' }}><X size={15} strokeWidth={2.4} aria-hidden /></button>
          <h3 style={{ margin: 0, paddingRight: 40, fontSize: TYPE.heading, fontWeight: 900 }}>{on.name}</h3>
          <span style={{ ...small, fontSize: TYPE.body, marginTop: 3 }}>{on.what}</span>
          <div ref={panel} id="ins-targets-panel" role="tabpanel" aria-label={on.name} style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {on.keys.map((k) => <MeasureCard key={k} k={k} box={boxes[k]} onBox={setBox(k)} now={now[k]} depts={depts} ink={ink} />)}
          </div>
          <footer style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 14, marginTop: 12, borderTop: '1px solid var(--hair)' }}>
            <span style={{ ...small, minWidth: 0, flex: '1 1 180px' }}>{note}</span>
            <button type="button" onClick={reset} disabled={state.busy} style={{ height: 32, padding: '0 10px', border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>Reset to defaults</button>
            <button type="button" onClick={close} disabled={state.busy} style={{ height: 32, padding: '0 14px', borderRadius: 10, border: '1px solid var(--card-edge)', background: 'var(--ghost)', color: 'var(--text)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
            <button type="button" data-ins-targets-save onClick={save} disabled={bad || !changed || state.busy} style={{ height: 32, padding: '0 16px', borderRadius: 10, border: 'none', background: 'var(--brand)', color: '#FFFFFF', fontSize: TYPE.body, fontWeight: 800, cursor: bad || !changed || state.busy ? 'not-allowed' : 'pointer', opacity: bad || !changed ? 0.45 : 1 }}>{state.busy ? 'Saving…' : 'Save targets'}</button>
          </footer>
          {state.error && <div role="alert" data-ins-targets-error style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: alpha(ink.bad, 0.1), fontSize: TYPE.body, fontWeight: 700, color: 'var(--text)' }}>{state.error}</div>}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}

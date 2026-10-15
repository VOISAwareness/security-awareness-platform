import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Building2, Check, ChevronRight, Copy, Download, Hourglass, LayoutGrid, ThumbsUp, TriangleAlert, Users } from 'lucide-react';

import { count, findings, share, story } from '../../services/bigPictureFindings';
import { reportCsv } from '../../services/bigPictureExport';
import { csvName, downloadCsv } from '../../services/csv';
import { FindingDetail } from './BigPictureDetail';
import { DepartmentTable, PeopleTable } from './BigPictureTables';
import { REPORT_INK } from './reportInk';

// The Big Picture: the leaderboard's reporting view for leaders and admins.
//
// It reports what the board shows; it never says what to do. It reads as a
// story, top to bottom and then left to right:
//   - where everyone stands today: one sentence and one bar of the level
//     bands, each with how it moved;
//   - 01 needs attention, 02 going well, 03 what could happen next: three
//     findings at most in each, every one a number, a line and where it sits.
// A finding opens to its detail: by department, and (admins) who exactly.
// People and Departments list everyone one by one, to select and export.
//
// Colours: the level bands run red (new or below zero) through grey to teal
// (Phish Catcher and up), checked for colour-blind separation on both
// themes; every band has its count written beside it, and every finding's
// tone has its own icon, never colour alone.

const num = (n) => Math.round(n).toLocaleString('en-US');

const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };
const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };

const BANDS = {
  light: { top: '#115E59', strong: '#14B8A6', learning: '#E2E8F0', low: '#E5484D' },
  dark: { top: '#99F6E4', strong: '#14B8A6', learning: '#475569', low: '#E8635F' },
};
const TONE = { bad: TriangleAlert, watch: Hourglass, good: ThumbsUp };

// The one sentence that sums up the movement, as a ratio so it reads the
// same for a hundred people or thirty thousand.
const times = (k) => (Math.round(k * 10) / 10).toString();
function moveLine(r, campaign) {
  const { climbed, slipped } = r.moved;
  const when = campaign ? 'in this campaign' : 'in the last 30 days';
  if (!climbed && !slipped) return `No one changed level ${when}.`;
  if (!slipped) return `Everyone who changed level ${when} climbed.`;
  const k = climbed / slipped;
  return k >= 1 ? `For every person who slipped a level ${when}, ${times(k)} climbed one.` : `More slipped a level than climbed ${when}: ${times(1 / k)} for every one who climbed.`;
}

// Where everyone stands: the level bands in one bar, each with its share and
// which way it moved (the counts are in the tooltip and the export).
function Standing({ r, campaign, isDark, ink }) {
  const colors = BANDS[isDark ? 'dark' : 'light'];
  const total = Math.max(1, r.standing.reduce((a, g) => a + g.now, 0));
  const bands = [...r.standing].reverse(); // lowest first, left to right
  return (
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={eyebrow}>{campaign ? 'Where its recipients stand now' : 'Where everyone stands today'}</div>
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)', marginTop: 6 }}>{moveLine(r, campaign)}</div>
      <div role="img" aria-label={bands.map((g) => `${share(g.now, total)} ${g.brief}`).join(', ')} style={{ display: 'flex', gap: 2, height: 10, marginTop: 14 }}>
        {bands.filter((g) => g.now > 0).map((g, i, all) => (
          <span key={g.id} title={`${g.label}: ${num(g.now)} people`} style={{ flex: g.now / total, background: colors[g.id], borderRadius: all.length === 1 ? 4 : i === 0 ? '4px 0 0 4px' : i === all.length - 1 ? '0 4px 4px 0' : 0 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginTop: 10 }}>
        {bands.map((g) => {
          const d = (g.now - g.before) / total; // as a share of everyone
          const flat = Math.abs(d) < 0.005;
          const better = g.id === 'low' ? d < 0 : d > 0;
          const Arrow = d > 0 ? ArrowUpRight : ArrowDownRight;
          return (
            <span key={g.id} title={`${num(g.now)} people · ${num(g.before)} at the start`} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span aria-hidden style={{ flexShrink: 0, width: 8, height: 8, borderRadius: 2, background: colors[g.id], boxShadow: g.id === 'learning' ? 'inset 0 0 0 1px var(--hair)' : 'none' }} />
              <span style={{ ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.brief}</span>
              <strong style={{ fontSize: 11, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{share(g.now, total)}</strong>
              {!flat && <Arrow size={11} strokeWidth={3} color={better ? ink.good : ink.bad} aria-label={d > 0 ? 'up' : 'down'} style={{ flexShrink: 0 }} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// The three parts of the story, in reading order.
const CHAPTERS = [
  { id: 'wrong', n: '01', title: 'Needs attention', sub: (when) => `What went wrong ${when}`, Icon: TriangleAlert, tone: 'bad' },
  { id: 'right', n: '02', title: 'Going well', sub: (when) => `What went right ${when}`, Icon: ThumbsUp, tone: 'good' },
  { id: 'next', n: '03', title: 'What could happen next', sub: () => 'Who is one step from a change', Icon: Hourglass, tone: 'watch' },
];

// One finding: its number, the line, and a quiet line under it. The whole
// item opens its detail.
function Item({ f, onOpen }) {
  const Tag = f.link ? 'button' : 'div';
  return (
    <Tag
      {...(f.link ? { type: 'button', onClick: onOpen, className: 'bp-finding', 'aria-label': `${f.value} ${f.unit} ${f.headline}. ${f.sub}. See the detail` } : null)}
      data-bp-finding={f.id}
      style={{ position: 'relative', width: 'calc(100% + 24px)', boxSizing: 'border-box', minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 5, padding: '16px 34px 12px 12px', margin: '0 -12px', border: 'none', borderRadius: 12, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: f.link ? 'pointer' : 'default' }}
    >
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span className="vs-rank" style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{f.value}</span>
        {f.unit && <span style={{ ...small, fontWeight: 800 }}>{f.unit}</span>}
      </span>
      <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.3 }}>{f.headline}</span>
      <span style={{ ...small, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.sub}</span>
      {f.link && <ChevronRight className="bp-go" size={16} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', right: 10, top: 18, color: 'var(--muted)' }} />}
    </Tag>
  );
}

// One part of the story: its number and title, then its findings.
function Chapter({ c, items, when, ink, onOpen, first }) {
  const color = c.tone === 'good' ? ink.good : c.tone === 'bad' ? ink.bad : 'var(--text)';
  return (
    <section aria-label={c.title} data-bp-chapter={c.id} style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', paddingLeft: first ? 0 : 28, borderLeft: first ? 'none' : '1px solid var(--hair)' }}>
      <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--hair)' }}>
        <span aria-hidden style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--track)', color }}><c.Icon size={15} strokeWidth={2.5} /></span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: 'var(--text)' }}><span style={{ color: 'var(--muted)', marginRight: 6 }}>{c.n}</span>{c.title}</span>
          <span style={{ display: 'block', ...small, marginTop: 2 }}>{c.sub(when)}</span>
        </span>
      </header>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: 2 }}>
        {items.length
          ? items.map((f, i) => (
            <div key={f.id} style={{ flex: '0 0 auto', height: 'min(33.333%, 124px)', minHeight: 0, display: 'flex', alignItems: 'stretch', borderTop: i ? '1px solid var(--hair)' : 'none' }}>
              <Item f={f} onOpen={() => onOpen(f)} />
            </div>
          ))
          : <p style={{ ...small, fontSize: 10.5, margin: '14px 0 0' }}>Nothing stands out here.</p>}
      </div>
    </section>
  );
}

/** The picture as plain text, for "Copy summary". */
function summaryText(r, title, campaign) {
  return [
    title,
    moveLine(r, campaign),
    `Where everyone stands: ${[...r.standing].reverse().map((g) => `${g.brief} ${share(g.now, r.people.length)}`).join(', ')}.`,
    '',
    'What stands out:',
    ...findings(r, { campaign }).map((f) => `- ${f.value}${f.unit ? ` ${f.unit}` : ''} ${f.headline} (${f.sub}).`),
  ].join('\n');
}

/**
 * The Big Picture, in the board's L shape: a colour tile top left naming what
 * it covers; where everyone stands along the arm; below, the story in three
 * parts, with People and Departments a tab away.
 */
export function BigPictureSheet({ r, campaign, isDark, canSeePeople, shell }) {
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  const { CAP_W, CAP_H, L_GAP, L_R, FILLET, PASTEL_INK } = shell;
  const scopeKey = campaign ? campaign.id : 'org';
  const fresh = () => ({
    scope: scopeKey,
    tab: 'overview',
    detail: null, // the finding opened, by id
    people: { show: 'all', dept: 'all', level: 'all', q: '', sort: { key: 'points', dir: 'asc' }, page: 0 },
    picked: new Set(),
    depts: { sort: { key: 'perPerson', dir: 'asc' }, q: '', page: 0 },
    deptPicked: new Set(),
  });
  const [kept, setState] = useState(fresh);
  const state = kept.scope === scopeKey ? kept : fresh(); // a new scope starts afresh
  const { tab } = state;
  const set = (patch) => setState({ ...state, ...patch });
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  // From a finding to the people (or departments) behind it.
  const pinpoint = ({ show = 'all', dept = 'all', q = '' }) => {
    set({ tab: 'people', detail: null, people: { ...state.people, show, dept, level: 'all', q, page: 0 } });
  };

  const parts = story(r, { campaign: Boolean(campaign) });
  const when = campaign ? 'in this campaign' : 'in the last 30 days';
  const opened = state.detail ? [...parts.wrong, ...parts.right, ...parts.next].find((f) => f.id === state.detail) : null;
  const title = campaign ? `The big picture: ${campaign.name}` : 'The big picture: the organisation, last 30 days';
  const scopeName = campaign ? campaign.name : 'organisation';
  const exportReport = () => downloadCsv(csvName('big picture', scopeName, 'report'), reportCsv(r, { title, withPeople: canSeePeople, campaign: Boolean(campaign) }));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText(r, title, Boolean(campaign)));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const tokens = isDark
    ? { '--bp-accent': '#5EEAD4', '--bp-soft': 'rgba(94,234,212,0.14)', '--bp-ink': '#5EEAD4' }
    : { '--bp-accent': '#0F766E', '--bp-soft': '#D5F5F0', '--bp-ink': '#0F766E' };
  const TABS = [
    { id: 'overview', label: 'Overview', Icon: LayoutGrid },
    ...(canSeePeople ? [{ id: 'people', label: 'People', Icon: Users, count: r.people.length }] : []),
    { id: 'departments', label: 'Departments', Icon: Building2, count: r.departments.length },
  ];

  return (
    <div data-lb-reports={campaign ? 'campaign' : 'org'} style={{ ...tokens, flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <div style={{ ...(isDark ? PASTEL_INK : null), position: 'absolute', top: 0, left: 0, width: CAP_W, height: CAP_H, zIndex: 2, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, background: 'var(--cap-reports)', borderRadius: L_R, overflow: 'hidden' }}>
        <div style={{ ...eyebrow, color: 'var(--t-reports)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {campaign ? <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A' }} /> : <Building2 size={12} strokeWidth={2.6} aria-hidden />}
          The big picture
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.16, color: 'var(--text)' }}>{campaign ? campaign.name : 'The organisation'}</div>
        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.35, maxWidth: 196 }}>
          {campaign ? `${campaign.type} · started ${campaign.started} · ${num(r.basis.people)} recipients` : `Last 30 days · ${r.basis.campaigns} campaigns · ${num(r.basis.population)} people on the board`}
        </div>
      </div>
      <svg aria-hidden width={FILLET} height={FILLET} viewBox={`0 0 ${FILLET} ${FILLET}`} style={{ position: 'absolute', top: CAP_H - L_R, left: CAP_W - L_R, zIndex: 1, display: 'block' }}>
        <path d={`M 0 ${FILLET} A ${FILLET} ${FILLET} 0 0 0 ${FILLET} 0 V ${FILLET} H 0 Z`} fill="var(--base)" />
      </svg>

      {/* the arm: where everyone stands */}
      <div data-bp-standing style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 28, padding: '0 28px', background: 'var(--base)', borderTop: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderRadius: `${L_R}px ${L_R}px 0 0` }}>
        <Standing r={r} campaign={Boolean(campaign)} isDark={isDark} ink={ink} />
      </div>

      {/* the base: the story in three parts, or a full list */}
      <div data-bp-body style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 18, padding: '16px 28px 20px', background: 'var(--base)', borderLeft: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', borderRadius: `${L_R}px 0 ${L_R}px ${L_R}px` }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div role="tablist" aria-label="The big picture" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 3, borderRadius: 11, background: 'var(--track)' }}>
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={on} data-bp-tab={t.id} onClick={() => set({ tab: t.id, detail: null })} style={{ height: 28, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 10.5, fontWeight: 800, background: on ? 'var(--base)' : 'transparent', color: on ? 'var(--text)' : 'var(--muted)', boxShadow: on ? '0 1px 3px rgba(15,23,42,0.12)' : 'none' }}>
                <t.Icon size={13} strokeWidth={2.4} aria-hidden />{t.label}
                {t.count !== undefined && <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--muted)' }}>{count(t.count)}</span>}
              </button>
            );
          })}
        </div>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button type="button" data-bp-copy onClick={copy} aria-label={copied ? 'Summary copied' : 'Copy a summary'} title={copied ? 'Copied' : 'Copy a summary to paste anywhere'} style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 9, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
            {copied ? <Check size={14} strokeWidth={2.8} aria-hidden /> : <Copy size={14} strokeWidth={2.4} aria-hidden />}
          </button>
          <button type="button" data-bp-export-report onClick={exportReport} title={canSeePeople ? 'Every table, people included, as one CSV file' : 'Every table as one CSV file'} style={{ height: 30, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 9, border: 'none', background: 'var(--ink)', color: 'var(--ink-on)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
            <Download size={13} strokeWidth={2.6} aria-hidden /> Export report
          </button>
        </span>
        </div>

        {tab === 'overview' && opened && (
          <FindingDetail
            key={`${scopeKey}-${opened.id}`}
            f={opened}
            r={r}
            canSeePeople={canSeePeople}
            isDark={isDark}
            ink={ink}
            scopeName={scopeName}
            onBack={() => set({ detail: null })}
            onOpenPeople={({ dept }) => pinpoint({ show: opened.link?.show || 'all', dept: dept || 'all' })}
          />
        )}
        {tab === 'overview' && !opened && (
          <div data-bp-story style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 28 }}>
            {CHAPTERS.map((c, i) => <Chapter key={c.id} c={c} items={parts[c.id]} when={when} ink={ink} onOpen={(f) => set({ detail: f.id })} first={i === 0} />)}
          </div>
        )}
        {tab === 'people' && canSeePeople && (
          <PeopleTable r={r} view={state.people} onView={(people) => set({ people })} selected={state.picked} onSelected={(picked) => set({ picked })} scopeName={scopeName} isDark={isDark} ink={ink} />
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
            scopeName={scopeName}
            ink={ink}
          />
        )}
      </div>
    </div>
  );
}

/** Staff see this where colleagues see How to earn points: the story's opening line from each part. */
export function BigPictureTeaser({ r, isDark, onOpen }) {
  const ink = isDark ? REPORT_INK.dark : REPORT_INK.light;
  const parts = story(r);
  const top = CHAPTERS.map((c) => parts[c.id][0]).filter(Boolean);
  return (
    <div data-bp-teaser style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--rail)', border: '1px solid var(--hair)', borderRadius: 16, padding: '14px 16px' }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>The big picture</span>
      <span style={{ ...small, marginTop: 2 }}>The last 30 days on the board</span>
      <div style={{ flex: 1, minHeight: 0, maxHeight: 250, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', marginTop: 6 }}>
        {top.map((f) => {
          const Icon = TONE[f.tone];
          return (
            <div key={f.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderTop: '1px solid var(--hair)' }}>
              <span aria-hidden style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--track)', color: f.tone === 'good' ? ink.good : f.tone === 'bad' ? ink.bad : 'var(--text)' }}><Icon size={12} strokeWidth={2.6} /></span>
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

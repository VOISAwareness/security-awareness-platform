import React, { useMemo, useState } from 'react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';

// =============================================================================
// VOIS Shield — Leaderboard (design prototype)
//
// Front-end only for now: the rows below are SAMPLE data so the layout and
// motion can be reviewed. The real numbers come later from the S3 event store
// projected into DynamoDB (global + per-campaign leaderboards). Keyed by email,
// shown by name; scores come from the gamification rules.
//
// Visual language matches Requests & Approvals: a top-left colour capsule, a
// concave fillet into a top-right arm with a big font-voda-exb counter, and a
// continuous lower L-base holding a 3-pedestal podium (#2 · #1 · #3) and the
// ranked list of pastel "clay" cards with the white "·dot· rank" pill.
// =============================================================================

const LB_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&family=JetBrains+Mono:wght@500;600;700;800&display=swap');

  .lb-exb  { font-family: 'Montserrat', sans-serif; font-weight: 900; }
  .lb-mono { font-family: 'JetBrains Mono', monospace; }

  .lb-page { font-family: 'Inter', system-ui, sans-serif; color: var(--text); background: var(--bg); }

  /* podium motion */
  .ped, .champ { position: relative; overflow: hidden; transform-origin: bottom; }
  .ped { animation: lbRise 0.75s cubic-bezier(0.16,1,0.3,1) both; }
  .ped-2 { animation-delay: 0.10s; }
  .ped-3 { animation-delay: 0.10s; }
  .champ { animation: lbRise 0.75s cubic-bezier(0.16,1,0.3,1) 0.26s both, lbGlow 3s ease-in-out 1.4s infinite; }
  .lb-sheen { position: absolute; top: 0; left: 0; width: 45%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,0.65), transparent); transform: skewX(-18deg) translateX(-200%); animation: lbSheen 3.6s ease-in-out 1.5s infinite; pointer-events: none; }
  .lb-pop { animation: lbPop 0.6s cubic-bezier(0.16,1,0.3,1) both; }
  @keyframes lbRise { 0% { transform: translateY(44px); opacity: 0; } 100% { transform: none; opacity: 1; } }
  @keyframes lbGlow { 0%,100% { box-shadow: inset 0 2px 0 rgba(255,255,255,0.65), 0 0 0 0 rgba(232,179,11,0); } 50% { box-shadow: inset 0 2px 0 rgba(255,255,255,0.65), 0 0 26px 3px rgba(232,179,11,0.42); } }
  @keyframes lbSheen { 0% { transform: skewX(-18deg) translateX(-200%); } 55%,100% { transform: skewX(-18deg) translateX(460%); } }
  @keyframes lbPop { 0% { opacity: 0; transform: translateY(12px) scale(0.92); } 100% { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .ped, .champ, .lb-sheen, .lb-pop { animation: none !important; } }
`;

// --- sample data -------------------------------------------------------------

const GLOBAL = {
  capsuleTitle: ['Global', 'Leaderboard'],
  capsuleSub: 'Everyone ranked across every campaign, all time.',
  counter: '128',
  counterLabel: ['Total', 'Participants'],
  championLabel: 'Champion',
  podium: {
    first: { initials: 'AR', name: 'Aditi Rao', dept: 'Finance', pts: '1,320', rep: '94%', clk: '2%' },
    second: { initials: 'DK', name: 'David Kim', dept: 'IT Security', pts: '1,265', rep: '91%' },
    third: { initials: 'NA', name: 'Noura Ali', dept: 'Operations', pts: '1,210', rep: '89%' },
  },
  rows: [
    { rank: 4, name: 'Priya Nair', dept: 'Finance', initials: 'PN', pts: '1,180', rep: '88%', clk: '4%' },
    { rank: 5, name: 'Marco Bellini', dept: 'IT Security', initials: 'MB', pts: '1,125', rep: '83%', clk: '6%' },
    { rank: 6, name: 'Sara Nasser', dept: 'Human Res.', initials: 'SN', pts: '1,090', rep: '80%', clk: '7%' },
    { rank: 7, name: 'Liang Wei', dept: 'Operations', initials: 'LW', pts: '1,030', rep: '76%', clk: '9%' },
    { rank: 8, name: 'Tom Okafor', dept: 'Sales', initials: 'TO', pts: '980', rep: '71%', clk: '11%' },
    { rank: 9, name: 'Elena Petrova', dept: 'Legal', initials: 'EP', pts: '920', rep: '68%', clk: '12%' },
    { rank: 10, name: 'Omar Haddad', dept: 'Finance', initials: 'OH', pts: '870', rep: '63%', clk: '15%' },
    { rank: 11, name: 'Mei Chen', dept: 'IT', initials: 'MC', pts: '820', rep: '60%', clk: '17%' },
  ],
  you: { rank: 12, name: 'You · Satyajit', dept: 'IT Security', initials: 'SP', pts: '790', rep: '58%', clk: '18%' },
  kpis: null,
};

const CAMPAIGN = {
  capsuleTitle: ['Q4 Credential Harvest Drill'],
  capsuleSub: 'Credential theft · started 6 Oct',
  live: true,
  counter: '2,480',
  counterLabel: ['Ranked', 'Recipients'],
  championLabel: 'Top reporter',
  kpis: [
    { label: 'Sent', value: '2,480', tone: 'neutral' },
    { label: 'Opened', value: '61%', tone: 'amber' },
    { label: 'Clicked', value: '14%', tone: 'red' },
    { label: 'Reported', value: '52%', tone: 'green' },
  ],
  podium: {
    first: { initials: 'NA', name: 'Noura Ali', dept: 'Operations', pts: '480', rep: '96%', clk: '3%' },
    second: { initials: 'PN', name: 'Priya Nair', dept: 'Finance', pts: '455', rep: '92%' },
    third: { initials: 'DK', name: 'David Kim', dept: 'IT Security', pts: '440', rep: '90%' },
  },
  rows: [
    { rank: 4, name: 'Aditi Rao', dept: 'Finance', initials: 'AR', pts: '420', rep: '88%', clk: '6%' },
    { rank: 5, name: 'Sara Nasser', dept: 'Human Res.', initials: 'SN', pts: '400', rep: '85%', clk: '7%' },
    { rank: 6, name: 'Marco Bellini', dept: 'IT', initials: 'MB', pts: '380', rep: '82%', clk: '8%' },
    { rank: 7, name: 'Liang Wei', dept: 'Operations', initials: 'LW', pts: '355', rep: '78%', clk: '10%' },
    { rank: 8, name: 'Elena Petrova', dept: 'Legal', initials: 'EP', pts: '330', rep: '74%', clk: '12%' },
    { rank: 9, name: 'Tom Okafor', dept: 'Sales', initials: 'TO', pts: '300', rep: '70%', clk: '14%' },
    { rank: 10, name: 'Omar Haddad', dept: 'Finance', initials: 'OH', pts: '275', rep: '66%', clk: '16%' },
  ],
  you: { rank: 15, name: 'You · Satyajit', dept: 'IT Security', initials: 'SP', pts: '180', rep: '44%', clk: '22%' },
};

// medal colours (constant across light/dark — they read on both pastel and clay)
const MEDAL = { first: '#E8B30B', second: '#8A94A6', third: '#C2772E' };
const CLAY = { first: 'var(--c-peach)', second: 'var(--c-lav)', third: 'var(--c-mint)' };

// pastel cycle used for the ranked-list cards
const rowFill = (i) => [CLAY.third, CLAY.second, CLAY.first][i % 3];

const KPI_TONE = {
  neutral: { bg: 'var(--kpi-neutral)', fg: 'var(--text)' },
  amber: { bg: '#FFF0D6', fg: '#B45309' },
  red: { bg: '#FEE2E2', fg: '#E60000' },
  green: { bg: '#D8F3DC', fg: '#15803D' },
};

const COLS = '52px 1fr 150px 64px 84px';

// --- presentational pieces (module scope so they are not re-created each render)

const Chip = ({ kind, children }) => (
  <span
    style={{
      fontSize: 8,
      fontWeight: 700,
      padding: '2px 7px',
      borderRadius: 999,
      color: kind === 'good' ? '#15803D' : '#E60000',
      background: kind === 'good' ? '#DCFCE7' : '#FEE2E2',
    }}
  >
    {children}
  </span>
);

const Avatar = ({ initials, size = 32, ring }) => (
  <span
    className="lb-mono"
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      background: '#fff',
      color: '#0F172A',
      fontWeight: 800,
      fontSize: size >= 60 ? 20 : size >= 56 ? 17 : 10.5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      boxShadow: ring ? `inset 0 0 0 ${size >= 60 ? 4 : 3}px ${ring}` : '0 1px 2px rgba(15,23,42,0.1)',
    }}
  >
    {initials}
  </span>
);

const PodiumColumn = ({ person, place, height, pedClass, medal, fill, big, showChips, championLabel, popDelay }) => (
  <div style={{ flex: place === 'first' ? '1.15' : '1', maxWidth: place === 'first' ? 250 : 230, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    {place === 'first' && (
      <span style={{ color: MEDAL.first, display: 'flex', marginBottom: 2 }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 7l4 4 5-6 5 6 4-4-2 12H5L3 7z" /></svg>
      </span>
    )}
    <span className="lb-pop" style={{ animationDelay: `${popDelay}s` }}>
      <Avatar initials={person.initials} size={place === 'first' ? 68 : 56} ring={medal} />
    </span>
    <div style={{ fontSize: place === 'first' ? 15 : 13, fontWeight: 800, marginTop: place === 'first' ? 9 : 8, textAlign: 'center', lineHeight: 1.15 }}>{person.name}</div>
    <div style={{ fontSize: place === 'first' ? 10 : 9.5, color: 'var(--muted)' }}>{person.dept}</div>
    {big ? (
      <div className="lb-exb" style={{ fontSize: 28, marginTop: 4, lineHeight: 1 }}>{person.pts}</div>
    ) : (
      <div className="lb-mono" style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{person.pts}</div>
    )}
    {showChips ? (
      <div style={{ display: 'flex', gap: 5, marginTop: 5 }}>
        <Chip kind="good">{person.rep} reported</Chip>
        <Chip kind="bad">{person.clk} clicked</Chip>
      </div>
    ) : (
      <div style={{ marginTop: 4 }}><Chip kind="good">{person.rep} reported</Chip></div>
    )}
    <div
      className={pedClass}
      style={{
        width: '100%',
        height,
        marginTop: 10,
        background: fill,
        borderRadius: place === 'first' ? '16px 16px 0 0' : '14px 14px 0 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.6)',
      }}
    >
      {place === 'first' && <span className="lb-sheen" />}
      <span className="lb-exb" style={{ fontSize: place === 'first' ? 68 : place === 'second' ? 46 : 40, color: medal, lineHeight: 1 }}>
        {place === 'first' ? '1' : place === 'second' ? '2' : '3'}
      </span>
      {place === 'first' && (
        <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A9811A' }}>{championLabel}</span>
      )}
    </div>
  </div>
);

const Row = ({ r, fill, you }) => (
  <div
    style={{
      background: you ? 'var(--base)' : fill,
      border: you ? '1.5px solid #E60000' : '1px solid var(--hair)',
      borderRadius: 12,
      display: 'grid',
      gridTemplateColumns: COLS,
      gap: 12,
      alignItems: 'center',
      padding: '9px 12px',
      boxShadow: you ? '0 4px 12px rgba(230,0,0,0.12)' : 'none',
    }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: you ? '#E60000' : 'rgba(255,255,255,0.85)', borderRadius: 999, padding: '3px 8px', width: 'fit-content', boxShadow: you ? 'none' : '0 1px 2px rgba(15,23,42,0.06)' }}>
      {!you && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--accent)' }} />}
      <span className="lb-mono" style={{ fontSize: 11, fontWeight: you ? 800 : 700, color: you ? '#fff' : '#0F172A' }}>{r.rank}</span>
    </span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <span className="lb-mono" style={{ width: 32, height: 32, borderRadius: 999, background: '#fff', color: you ? '#E60000' : '#0F172A', fontWeight: 800, fontSize: 10.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: you ? 'inset 0 0 0 2px #E60000' : '0 1px 2px rgba(15,23,42,0.08)' }}>{r.initials}</span>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 12, color: you ? '#0F172A' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.name}
          {you && <span style={{ fontSize: 7.5, fontWeight: 800, color: '#fff', background: '#E60000', padding: '2px 6px', borderRadius: 999, letterSpacing: '0.06em', marginLeft: 6 }}>YOU</span>}
        </span>
        <span style={{ fontSize: 9, color: you ? '#64748B' : 'var(--muted)' }}>{r.dept}</span>
      </span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 1, height: 7, borderRadius: 999, background: you ? 'var(--track)' : 'rgba(255,255,255,0.7)', overflow: 'hidden', display: 'block' }}>
        <span style={{ display: 'block', height: '100%', width: r.rep, background: '#16A34A', borderRadius: 999 }} />
      </span>
      <span className="lb-mono" style={{ fontSize: 10, fontWeight: 700, color: '#15803D', width: 32, textAlign: 'right' }}>{r.rep}</span>
    </div>
    <div className="lb-mono" style={{ fontSize: 10.5, fontWeight: 700, color: you ? '#E60000' : '#C2410C', textAlign: 'center' }}>{r.clk}</div>
    <div className="lb-mono" style={{ fontSize: 14, fontWeight: 800, color: you ? '#0F172A' : 'var(--text)', textAlign: 'right' }}>{r.pts}</div>
  </div>
);

const SegBtn = ({ id, active, onSelect, children }) => (
  <button
    type="button"
    onClick={() => onSelect(id)}
    style={{
      fontSize: 9.5,
      fontWeight: 700,
      padding: '5px 12px',
      borderRadius: 999,
      border: 'none',
      cursor: 'pointer',
      background: active ? '#fff' : 'transparent',
      color: active ? '#000' : '#fff',
    }}
  >
    {children}
  </button>
);

const Leaderboard = () => {
  const { isDark } = useUserType() || {};
  const [view, setView] = useState('global');
  const [query, setQuery] = useState('');

  const d = view === 'global' ? GLOBAL : CAMPAIGN;

  const vars = useMemo(
    () =>
      isDark
        ? {
            '--bg': '#0E0F13',
            '--base': '#1C1E24',
            '--text': '#F1F5F9',
            '--muted': '#9AA6B2',
            '--hair': 'rgba(255,255,255,0.08)',
            '--track': 'rgba(255,255,255,0.12)',
            '--c-mint': '#0D271E',
            '--c-lav': '#22193E',
            '--c-peach': '#2E200C',
            '--capsule': view === 'global' ? '#143024' : '#1E2250',
            '--capsule-sub': view === 'global' ? '#8ED973' : '#A5B4FC',
            '--kpi-neutral': '#23262E',
          }
        : {
            '--bg': '#F1F4F8',
            '--base': '#FFFFFF',
            '--text': '#0F172A',
            '--muted': '#64748B',
            '--hair': 'rgba(15,23,42,0.06)',
            '--track': '#EEF2F6',
            '--c-mint': '#CEFBEA',
            '--c-lav': '#ECE8FF',
            '--c-peach': '#FFEFCE',
            '--capsule': view === 'global' ? '#D8F3DC' : '#E0E7FF',
            '--capsule-sub': view === 'global' ? '#15692F' : '#3F3D91',
            '--kpi-neutral': '#F1F5F9',
          },
    [isDark, view]
  );

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return d.rows;
    return d.rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.dept.toLowerCase().includes(q)
    );
  }, [d.rows, query]);

  return (
    <>
      <style>{LB_STYLE}</style>

      <div className="lb-page" style={{ ...vars, '--accent': '#E60000', width: '100%', minHeight: 'calc(100vh - 40px)', padding: 18 }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>

          {/* thin top title bar */}
          <div style={{ background: '#000', color: '#fff', borderRadius: 12, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Leaderboard</span>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.12)', padding: 3, borderRadius: 999 }}>
              <SegBtn id="global" active={view === 'global'} onSelect={setView}>Global</SegBtn>
              <SegBtn id="campaign" active={view === 'campaign'} onSelect={setView}>By campaign</SegBtn>
            </div>
          </div>

          {/* ===================== THE L-SHAPE ===================== */}
          <div style={{ position: 'relative' }}>

            {/* top-left capsule */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: 208, height: 132, background: 'var(--capsule)', borderRadius: 16, padding: 14, zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 2px 6px rgba(15,23,42,0.06)' }}>
              <div>
                {d.live && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A', display: 'inline-block' }} />
                    <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--capsule-sub)' }}>Live now</span>
                  </div>
                )}
                <div style={{ fontSize: d.capsuleTitle.length > 1 ? 16 : 14, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.16, color: 'var(--text)' }}>
                  {d.capsuleTitle.map((line, i) => (
                    <React.Fragment key={i}>{line}{i < d.capsuleTitle.length - 1 && <br />}</React.Fragment>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--capsule-sub)', lineHeight: 1.3, maxWidth: 160 }}>{d.capsuleSub}</div>
            </div>

            {/* concave fillet */}
            <div style={{ position: 'absolute', top: 116, left: 198, width: 16, height: 16, zIndex: 20, overflow: 'hidden' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill="var(--base)" /></svg>
            </div>

            {/* top-right arm */}
            <div style={{ width: 'calc(100% - 214px)', marginLeft: 'auto', height: 132, background: 'var(--base)', borderTopLeftRadius: 16, borderTopRightRadius: 16, border: '1px solid var(--hair)', borderBottom: 'none', position: 'relative', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', gap: 16 }}>
              {view === 'global' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 300, maxWidth: '52%' }}>
                  <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: 11, color: '#94A3B8', display: 'flex' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    </span>
                    <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a person" aria-label="Find a person" style={{ width: '100%', height: 30, padding: '0 12px 0 31px', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--track)', fontSize: 10, fontWeight: 700, color: 'var(--text)', outline: 'none' }} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 7, height: 26, padding: '0 11px', borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--track)', width: 200 }}>
                    <span style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94A3B8', fontWeight: 800 }}>Sort</span>
                    <select aria-label="Sort by" style={{ border: 'none', background: 'transparent', fontSize: 9.5, fontWeight: 800, color: 'var(--text)', outline: 'none', flex: 1 }}>
                      <option>Points</option>
                      <option>Reported rate</option>
                      <option>Click rate</option>
                    </select>
                  </label>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 8 }}>
                  {d.kpis.map((k) => (
                    <div key={k.label} style={{ background: KPI_TONE[k.tone].bg, borderRadius: 12, padding: '9px 13px', minWidth: 64 }}>
                      <div style={{ fontSize: 7.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: k.tone === 'neutral' ? 'var(--muted)' : KPI_TONE[k.tone].fg, fontWeight: 800 }}>{k.label}</div>
                      <div className="lb-mono" style={{ fontSize: 18, fontWeight: 800, marginTop: 2, color: KPI_TONE[k.tone].fg }}>{k.value}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ textAlign: 'right' }}>
                <div className="lb-exb" style={{ fontSize: view === 'global' ? 52 : 50, lineHeight: 0.9, color: view === 'global' ? '#8ED973' : '#818CF8', letterSpacing: '-0.02em' }}>{d.counter}</div>
                <div style={{ fontSize: view === 'global' ? 13 : 12, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.1, marginTop: 3 }}>
                  {d.counterLabel[0]}<br />{d.counterLabel[1]}
                </div>
              </div>
            </div>

            {/* lower L-base */}
            <div style={{ width: '100%', background: 'var(--base)', borderRadius: '0 0 16px 16px', border: '1px solid var(--hair)', borderTop: 'none', position: 'relative', zIndex: 10, padding: 18 }}>

              {/* podium */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 14, padding: '4px 0 6px' }}>
                <PodiumColumn person={d.podium.second} place="second" height={94} pedClass="ped ped-2" medal={MEDAL.second} fill={CLAY.second} popDelay={0.18} />
                <PodiumColumn person={d.podium.first} place="first" height={134} pedClass="champ" medal={MEDAL.first} fill={CLAY.first} big showChips championLabel={d.championLabel} popDelay={0.32} />
                <PodiumColumn person={d.podium.third} place="third" height={74} pedClass="ped ped-3" medal={MEDAL.third} fill={CLAY.third} popDelay={0.24} />
              </div>

              <div style={{ height: 1, background: 'var(--hair)', margin: '4px 2px 12px' }} />

              {/* ranked list */}
              <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '0 10px 8px', fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8', fontWeight: 800 }}>
                <div>Rank</div><div>Person</div><div>Reported rate</div><div style={{ textAlign: 'center' }}>Clicked</div><div style={{ textAlign: 'right' }}>Points</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {filteredRows.map((r, i) => (
                  <Row key={r.rank} r={r} fill={rowFill(i)} />
                ))}
                {filteredRows.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>No one matches that search.</div>
                )}
                <Row r={d.you} you />
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Leaderboard;

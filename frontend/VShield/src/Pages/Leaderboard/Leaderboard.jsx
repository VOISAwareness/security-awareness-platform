import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useUserType } from '../../UserTypeContext/UserTypeContext';

// =============================================================================
// VOIS Shield — Leaderboard (design prototype)
//
// Front-end only for now: the rows are SAMPLE data so the layout + motion can
// be reviewed. Real figures come later from the S3 event store projected into
// DynamoDB (global + per-campaign). Keyed by email, shown by name; scores from
// the gamification rules.
//
// Layout follows Requests & Approvals: a left rail (scope + the list of
// ongoing campaigns) and a full-width right "sheet" holding a 3-pedestal
// podium on a stage and the scrollable ranked list. The viewer's own row is
// highlighted in place; when they sit outside the top 10 it is also pinned to
// the bottom of the sheet so they always see where they stand.
// =============================================================================

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&family=JetBrains+Mono:wght@500;600;700;800&display=swap');
  .lb-exb  { font-family: 'Montserrat', sans-serif; font-weight: 900; }
  .lb-mono { font-family: 'JetBrains Mono', monospace; }
  .lb-page { font-family: 'Inter', system-ui, sans-serif; }
  .lb-scroll::-webkit-scrollbar { width: 7px; }
  .lb-scroll::-webkit-scrollbar-thumb { background: rgba(120,130,145,0.35); border-radius: 999px; }
`;

// --- sample data -------------------------------------------------------------

const NAMES = [
  ['Aditi Rao', 'Finance', 'AR'], ['David Kim', 'IT Security', 'DK'], ['Noura Ali', 'Operations', 'NA'],
  ['Priya Nair', 'Finance', 'PN'], ['Marco Bellini', 'IT Security', 'MB'], ['Sara Nasser', 'Human Res.', 'SN'],
  ['Liang Wei', 'Operations', 'LW'], ['Tom Okafor', 'Sales', 'TO'], ['Elena Petrova', 'Legal', 'EP'],
  ['Omar Haddad', 'Finance', 'OH'], ['Mei Chen', 'IT', 'MC'], ['Yuki Tanaka', 'Sales', 'YT'],
  ['Hassan Ali', 'Operations', 'HA'], ['Lena Fischer', 'Legal', 'LF'], ['Raj Patel', 'Finance', 'RP'],
  ['Sofia Rossi', 'Marketing', 'SR'], ['Kwame Mensah', 'IT', 'KM'], ['Ana Silva', 'Human Res.', 'AS'],
  ['Ivan Petrov', 'Operations', 'IP'], ['Chloe Dubois', 'Sales', 'CD'], ['Ben Carter', 'Legal', 'BC'],
  ['Fatima Zahra', 'Finance', 'FZ'], ['Noah Weber', 'IT Security', 'NW'], ['Grace Lee', 'Marketing', 'GL'],
];

function buildBoard(seed, total) {
  const n = Math.min(total, 22);
  const all = [];
  for (let rank = 1; rank <= n; rank += 1) {
    const p = NAMES[(seed + rank - 1) % NAMES.length];
    const pts = Math.max(60, 1480 - rank * 46 - (seed % 5) * 7);
    const rep = Math.max(28, 97 - rank * 2 - (seed % 3));
    const clk = Math.min(46, Math.round(2 + rank * 1.6));
    all.push({ rank, name: p[0], dept: p[1], initials: p[2], pts: pts.toLocaleString(), rep: `${rep}%`, clk: `${clk}%` });
  }
  return { podium: { first: all[0], second: all[1], third: all[2] }, rows: all.slice(3), shown: n, total };
}

const GLOBAL = {
  title: 'Global Leaderboard',
  sub: 'Everyone ranked across every campaign · all time',
  total: 128,
  youRank: 12,
  board: buildBoard(0, 128),
};

const ONGOING_TOTAL = 50;
const CAMPAIGNS = [
  { id: 'CMP-2d24b2', name: 'Q4 Credential Harvest Drill', type: 'Credential theft', started: '6 Oct', total: 2480, youRank: 15, seed: 1, kpis: { Sent: '2,480', Opened: '61%', Clicked: '14%', Reported: '52%' } },
  { id: 'CMP-ef6a29', name: 'Payroll Update Notice', type: 'Finance lure', started: '5 Oct', total: 1860, youRank: 7, seed: 2, kpis: { Sent: '1,860', Opened: '58%', Clicked: '11%', Reported: '49%' } },
  { id: 'CMP-8414f9', name: 'Mailbox Quota Exceeded', type: 'IT lure', started: '4 Oct', total: 3120, youRank: 21, seed: 3, kpis: { Sent: '3,120', Opened: '66%', Clicked: '18%', Reported: '45%' } },
  { id: 'CMP-1edcb1', name: 'HR Policy Acknowledgement', type: 'HR lure', started: '2 Oct', total: 980, youRank: 4, seed: 4, kpis: { Sent: '980', Opened: '54%', Clicked: '9%', Reported: '57%' } },
  { id: 'CMP-e75257', name: 'Teams Voicemail Alert', type: 'IT lure', started: '1 Oct', total: 2240, youRank: 13, seed: 5, kpis: { Sent: '2,240', Opened: '63%', Clicked: '15%', Reported: '50%' } },
  { id: 'CMP-12fd10', name: 'Vendor Invoice Overdue', type: 'Finance lure', started: '29 Sep', total: 1440, youRank: 18, seed: 6, kpis: { Sent: '1,440', Opened: '60%', Clicked: '13%', Reported: '48%' } },
  { id: 'CMP-fcb850', name: 'Benefits Enrolment Closing', type: 'HR lure', started: '27 Sep', total: 1710, youRank: 9, seed: 7, kpis: { Sent: '1,710', Opened: '55%', Clicked: '10%', Reported: '53%' } },
  { id: 'CMP-c99f6e', name: 'VPN Re-authentication', type: 'Credential theft', started: '24 Sep', total: 2890, youRank: 16, seed: 8, kpis: { Sent: '2,890', Opened: '64%', Clicked: '17%', Reported: '46%' } },
];

const MEDAL = { first: '#E8B30B', second: '#8A94A6', third: '#C2772E' };
const rowFill = (i) => ['var(--c-mint)', 'var(--c-lav)', 'var(--c-peach)'][i % 3];

const PLACE = {
  first: { h: 118, num: 42, av: 64, medal: MEDAL.first, fill: 'var(--c-peach)', delay: 0.26 },
  second: { h: 86, num: 30, av: 52, medal: MEDAL.second, fill: 'var(--c-lav)', delay: 0.08 },
  third: { h: 66, num: 26, av: 52, medal: MEDAL.third, fill: 'var(--c-mint)', delay: 0.16 },
};
const NUMERAL = { first: '1', second: '2', third: '3' };

const COLS = '48px 1fr 150px 60px 80px';

// --- presentational pieces (module scope) ------------------------------------

const Avatar = ({ initials, size = 32, ring, you }) => (
  <span
    className="lb-mono"
    style={{
      width: size, height: size, borderRadius: 999, background: '#fff',
      color: you ? '#E60000' : '#0F172A', fontWeight: 800,
      fontSize: size >= 60 ? 19 : size >= 50 ? 16 : 10.5,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      boxShadow: you ? 'inset 0 0 0 2px #E60000' : ring ? `inset 0 0 0 3px ${ring}` : '0 1px 2px rgba(15,23,42,0.1)',
    }}
  >
    {initials}
  </span>
);

const Chip = ({ kind, children }) => (
  <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: kind === 'good' ? '#15803D' : '#E60000', background: kind === 'good' ? '#DCFCE7' : '#FEE2E2' }}>
    {children}
  </span>
);

const Pedestal = ({ person, place, reduce }) => {
  const c = PLACE[place];
  const first = place === 'first';
  return (
    <motion.div
      initial={reduce ? false : { y: 72, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 150, damping: 17, delay: c.delay }}
      whileHover={{ y: -4 }}
      style={{ flex: first ? '1.1' : '1', maxWidth: first ? 230 : 210, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      {first && (
        <span style={{ color: MEDAL.first, display: 'flex', marginBottom: 2 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 7l4 4 5-6 5 6 4-4-2 12H5L3 7z" /></svg>
        </span>
      )}
      <span style={{ position: 'relative', display: 'flex' }}>
        {first && !reduce && (
          <motion.span
            aria-hidden
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
            style={{ position: 'absolute', inset: -6, borderRadius: 999, border: `2px solid ${MEDAL.first}` }}
          />
        )}
        <Avatar initials={person.initials} size={c.av} ring={c.medal} />
      </span>
      <div style={{ fontSize: first ? 14 : 12.5, fontWeight: 800, marginTop: 8, textAlign: 'center', lineHeight: 1.15, color: 'var(--text)' }}>{person.name}</div>
      <div style={{ fontSize: 9.5, color: 'var(--muted)' }}>{person.dept}</div>
      <div className={first ? 'lb-exb' : 'lb-mono'} style={{ fontSize: first ? 24 : 17, fontWeight: 800, marginTop: 3, lineHeight: 1, color: 'var(--text)' }}>{person.pts}</div>
      <div style={{ marginTop: 4 }}><Chip kind="good">{person.rep} reported</Chip></div>
      <div
        style={{
          width: '100%', height: c.h, marginTop: 10, background: c.fill,
          borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: first ? 'inset 0 2px 0 rgba(255,255,255,0.6), 0 0 22px rgba(232,179,11,0.18)' : 'inset 0 2px 0 rgba(255,255,255,0.55)',
        }}
      >
        <span className="lb-exb" style={{ fontSize: c.num, color: c.medal, lineHeight: 1, opacity: 0.9 }}>{NUMERAL[place]}</span>
      </div>
    </motion.div>
  );
};

const RankRow = ({ r, fill, you, accent }) => (
  <div
    style={{
      background: you ? 'var(--base)' : fill,
      border: you ? '1.5px solid #E60000' : '1px solid var(--hair)',
      borderRadius: 12, display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center',
      padding: '9px 12px', boxShadow: you ? '0 4px 12px rgba(230,0,0,0.12)' : 'none',
    }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: you ? '#E60000' : 'rgba(255,255,255,0.85)', borderRadius: 999, padding: '3px 8px', width: 'fit-content', boxShadow: you ? 'none' : '0 1px 2px rgba(15,23,42,0.06)' }}>
      {!you && <span style={{ width: 6, height: 6, borderRadius: 999, background: accent }} />}
      <span className="lb-mono" style={{ fontSize: 11, fontWeight: you ? 800 : 700, color: you ? '#fff' : '#0F172A' }}>{r.rank}</span>
    </span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      <Avatar initials={r.initials} size={32} you={you} />
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
      <span className="lb-mono" style={{ fontSize: 10, fontWeight: 700, color: '#15803D', width: 30, textAlign: 'right' }}>{r.rep}</span>
    </div>
    <div className="lb-mono" style={{ fontSize: 10.5, fontWeight: 700, color: you ? '#E60000' : '#C2410C', textAlign: 'center' }}>{r.clk}</div>
    <div className="lb-mono" style={{ fontSize: 14, fontWeight: 800, color: you ? '#0F172A' : 'var(--text)', textAlign: 'right' }}>{r.pts}</div>
  </div>
);

const Leaderboard = () => {
  const { isDark, user } = useUserType() || {};
  const reduce = useReducedMotion();
  const [view, setView] = useState('global'); // 'global' | 'campaign'
  const [campaignId, setCampaignId] = useState(CAMPAIGNS[0].id);

  const youName = (user && user.UserName) ? user.UserName : 'You';
  const youInitials = youName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'YOU';
  const youDisplay = youName === 'You' ? 'You' : `You · ${youName.split(' ')[0]}`;

  const campaign = useMemo(() => CAMPAIGNS.find((c) => c.id === campaignId) || CAMPAIGNS[0], [campaignId]);

  const scope = useMemo(() => {
    if (view === 'global') {
      return { board: GLOBAL.board, youRank: GLOBAL.youRank, counter: GLOBAL.total.toLocaleString(), counterLabel: 'Participants', title: 'Global Leaderboard', sub: GLOBAL.sub, accentCounter: '#8ED973', live: false, kpis: null };
    }
    return {
      board: buildBoard(campaign.seed, campaign.total), youRank: campaign.youRank,
      counter: campaign.total.toLocaleString(), counterLabel: 'Recipients', title: campaign.name,
      sub: `${campaign.type} · started ${campaign.started}`, accentCounter: '#818CF8', live: true, kpis: campaign.kpis,
    };
  }, [view, campaign]);

  // The viewer's own row, synthesised at their rank from the board's shape.
  const youRow = useMemo(() => {
    const base = scope.board.rows.find((r) => r.rank === scope.youRank)
      || { rank: scope.youRank, pts: '—', rep: '—', clk: '—' };
    return { ...base, name: youDisplay, dept: 'IT Security', initials: youInitials };
  }, [scope, youDisplay, youInitials]);

  const inTopTen = scope.youRank <= 10;

  const vars = isDark
    ? { '--bg': '#0E0F13', '--base': '#1C1E24', '--rail': '#15171C', '--text': '#F1F5F9', '--muted': '#9AA6B2', '--hair': 'rgba(255,255,255,0.08)', '--track': 'rgba(255,255,255,0.12)', '--ground': 'linear-gradient(#2A2E37,#171A20)', '--c-mint': '#0D271E', '--c-lav': '#22193E', '--c-peach': '#2E200C', '--cap-global': '#143024', '--cap-camp': '#1E2250' }
    : { '--bg': '#F1F4F8', '--base': '#FFFFFF', '--rail': '#FFFFFF', '--text': '#0F172A', '--muted': '#64748B', '--hair': 'rgba(15,23,42,0.06)', '--track': '#EEF2F6', '--ground': 'linear-gradient(#E9EEF5,#D4DCE7)', '--c-mint': '#CEFBEA', '--c-lav': '#ECE8FF', '--c-peach': '#FFEFCE', '--cap-global': '#D8F3DC', '--cap-camp': '#E0E7FF' };

  const railCapsule = (id, label, sub, selected) => (
    <button
      type="button"
      onClick={() => setView(id)}
      style={{
        textAlign: 'left', cursor: 'pointer', width: '100%', borderRadius: 16, padding: 14, marginBottom: 10,
        border: selected ? '1px solid transparent' : '1px solid var(--hair)',
        background: selected ? (id === 'global' ? 'var(--cap-global)' : 'var(--cap-camp)') : 'var(--rail)',
        boxShadow: selected ? '0 6px 16px rgba(15,23,42,0.08)' : 'none', color: 'var(--text)',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em' }}>{label}</div>
      <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', marginTop: 3, lineHeight: 1.35 }}>{sub}</div>
    </button>
  );

  return (
    <>
      <style>{FONT_IMPORT}</style>

      <div className="lb-page" style={{ ...vars, '--accent': '#E60000', background: 'var(--bg)', color: 'var(--text)', width: '100%', minHeight: 'calc(100vh - 8px)', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* top black bar */}
        <div style={{ background: '#000', color: '#fff', borderRadius: 12, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', flexShrink: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Leaderboard</span>
        </div>

        {/* two-column workspace */}
        <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>

          {/* LEFT RAIL */}
          <div style={{ width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {railCapsule('global', 'Global Leaderboard', 'Everyone, every campaign, all time', view === 'global')}
            {railCapsule('campaign', 'By Campaign', 'Live ranking inside one campaign', view === 'campaign')}

            {view === 'global' ? (
              <div style={{ background: 'var(--cap-global)', borderRadius: 16, padding: 16, marginTop: 2 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Your standing</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span className="lb-exb" style={{ fontSize: 34, lineHeight: 1, color: 'var(--text)' }}>#{GLOBAL.youRank}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>▲ 3 this week</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, marginTop: 10, color: 'var(--text)' }}>{youDisplay}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{youRow.pts} pts · {youRow.rep} reported</div>
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', padding: '2px 4px 8px' }}>
                  Ongoing campaigns · {ONGOING_TOTAL}
                </div>
                <div className="lb-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                  {CAMPAIGNS.map((c) => {
                    const sel = c.id === campaignId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCampaignId(c.id)}
                        style={{
                          textAlign: 'left', cursor: 'pointer', borderRadius: 14, padding: '10px 12px',
                          border: sel ? '1.5px solid #818CF8' : '1px solid var(--hair)',
                          background: sel ? 'var(--cap-camp)' : 'var(--rail)', color: 'var(--text)',
                          boxShadow: sel ? '0 4px 12px rgba(129,140,248,0.18)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A', flexShrink: 0 }} />
                          <span style={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>{c.type} · {c.total.toLocaleString()} recipients</div>
                      </button>
                    );
                  })}
                  <div style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', padding: '6px 0 2px' }}>
                    + {ONGOING_TOTAL - CAMPAIGNS.length} more campaigns
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SHEET */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--base)', border: '1px solid var(--hair)', borderRadius: 18, overflow: 'hidden' }}>

            {/* header strip */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--hair)', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text)' }}>{scope.title}</span>
                  {scope.live && <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.08em', color: '#fff', background: '#16A34A', padding: '3px 8px', borderRadius: 999 }}>LIVE</span>}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>{scope.sub}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {scope.kpis && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {Object.entries(scope.kpis).map(([k, v]) => (
                      <div key={k} style={{ textAlign: 'center', minWidth: 52 }}>
                        <div style={{ fontSize: 7.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800 }}>{k}</div>
                        <div className="lb-mono" style={{ fontSize: 15, fontWeight: 800, color: k === 'Clicked' ? '#E60000' : k === 'Reported' ? '#15803D' : 'var(--text)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ textAlign: 'right' }}>
                  <div className="lb-exb" style={{ fontSize: 40, lineHeight: 0.9, color: scope.accentCounter, letterSpacing: '-0.02em' }}>{scope.counter}</div>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 2 }}>{scope.counterLabel}</div>
                </div>
              </div>
            </div>

            {/* podium on a stage */}
            <div style={{ padding: '22px 24px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 56 }}>
                <Pedestal person={scope.board.podium.second} place="second" reduce={reduce} />
                <Pedestal person={scope.board.podium.first} place="first" reduce={reduce} />
                <Pedestal person={scope.board.podium.third} place="third" reduce={reduce} />
              </div>
              {/* the ground / stage the pedestals stand on */}
              <div style={{ height: 14, borderRadius: 10, background: 'var(--ground)', boxShadow: '0 12px 22px rgba(15,23,42,0.14)', marginTop: -1 }} />
            </div>

            {/* column header */}
            <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '4px 24px 8px', fontSize: 8.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800 }}>
              <div>Rank</div><div>Person</div><div>Reported rate</div><div style={{ textAlign: 'center' }}>Clicked</div><div style={{ textAlign: 'right' }}>Points</div>
            </div>

            {/* scrollable ranked list */}
            <div className="lb-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {scope.board.rows.map((r, i) => (
                <RankRow
                  key={r.rank}
                  r={r.rank === scope.youRank ? youRow : r}
                  fill={rowFill(i)}
                  you={r.rank === scope.youRank}
                  accent="var(--accent)"
                />
              ))}
              <div style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', padding: '8px 0 2px' }}>
                Showing top {scope.board.shown} of {scope.board.total.toLocaleString()}
              </div>
            </div>

            {/* sticky "your position" — only when outside the top 10 */}
            {!inTopTen && (
              <div style={{ borderTop: '1px solid var(--hair)', padding: '10px 24px', background: 'var(--base)', flexShrink: 0 }}>
                <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Your position</div>
                <RankRow r={youRow} you accent="var(--accent)" />
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

export default Leaderboard;

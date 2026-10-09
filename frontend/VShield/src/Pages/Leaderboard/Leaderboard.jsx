import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ClipboardCheck, Flag, GraduationCap, KeyRound, MailOpen, MousePointerClick } from 'lucide-react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { useGamificationRules } from '../../services/useGamificationRules';
import { formatPoints } from '../../services/gamificationPoints';

// Clay-model corner artwork, reused from the existing asset set so the
// leaderboard reads like the Campaigns / Requests & Approvals screens.
import GlobalTrophy from '../../assets/LeaderboardAssets/GlobalTrophy.png';
import CampaignMegaphone from '../../assets/LeaderboardAssets/CampaignMegaphone.png';

// =============================================================================
// VOIS Shield — Leaderboard (design prototype)
//
// SAMPLE data for layout + motion review; real figures come later from the S3
// event store projected into DynamoDB. Keyed by email, shown by name; scores
// from the gamification rules.
//
// Layout follows Requests & Approvals: a left rail (your standing on top, then
// the Global / My Campaigns scope capsules with clay corner art, then the live
// points rules or the list of ongoing campaigns) and a right L-shaped "sheet":
// stat tiles, a podium stage that switches between top people and top
// departments, and the paginated ranked list. The viewer is highlighted red in light mode and white
// in dark mode.
//
// The page is locked to the viewport: nothing scrolls except the campaign list
// in the rail. The ranked list is paged instead, sized to however many rows fit,
// with the viewer's own position pinned bottom-left of the sheet.
// =============================================================================

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&family=JetBrains+Mono:wght@500;600;700;800&display=swap');
  .lb-exb  { font-family: 'Montserrat', sans-serif; font-weight: 900; }
  .lb-mono { font-family: 'JetBrains Mono', monospace; }
  .lb-page { font-family: 'Inter', system-ui, sans-serif; }
  .lb-scroll::-webkit-scrollbar { width: 7px; }
  .lb-scroll::-webkit-scrollbar-thumb { background: rgba(120,130,145,0.35); border-radius: 999px; }
  .lb-pg:disabled { cursor: default; opacity: 0.4; }

  /* Scope capsules: clay corner art, as on Campaigns / Requests & Approvals */
  .lb-cap { transition: transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s ease; }
  .lb-cap:hover { transform: translateY(-1px) scale(1.012); }
  .lb-cap:active { transform: scale(.98); }
  .lb-cap .lb-art { transition: transform .35s cubic-bezier(.16,1,.3,1); }
  .lb-cap:hover .lb-art { transform: translateY(-4px) rotate(-6deg) scale(1.08); }
  .lb-cap[aria-pressed="true"] .lb-art { animation: lb-float 3.2s ease-in-out infinite; }
  @keyframes lb-float { 0%, 100% { translate: 0 0; } 50% { translate: 0 -5px; } }

  /* Viewer's own pill in the footer: click to jump to their page */
  .lb-me { transition: box-shadow .15s ease, transform .15s ease; }
  .lb-me[aria-disabled="false"]:hover { box-shadow: var(--you-glow); transform: translateY(-1px); }

  /* Points rules: drop the one-line descriptions when the rail runs short */
  .lb-rules { container-type: size; }
  @container (max-height: 360px) { .lb-rule-desc { display: none !important; } }

  @media (prefers-reduced-motion: reduce) {
    .lb-cap, .lb-cap *, .lb-me { animation: none !important; transition: none !important; }
  }
`;

// --- sample data -------------------------------------------------------------

const FIRST = ['Aditi', 'David', 'Noura', 'Priya', 'Marco', 'Sara', 'Liang', 'Tom', 'Elena', 'Omar', 'Mei', 'Yuki',
  'Hassan', 'Lena', 'Raj', 'Sofia', 'Kwame', 'Ana', 'Ivan', 'Chloe', 'Ben', 'Fatima', 'Noah', 'Grace'];
const LAST = ['Rao', 'Kim', 'Ali', 'Nair', 'Bellini', 'Nasser', 'Wei', 'Okafor', 'Petrova', 'Haddad', 'Chen', 'Tanaka',
  'Mensah', 'Fischer', 'Patel', 'Rossi', 'Silva', 'Dubois', 'Carter', 'Zahra', 'Weber', 'Lee', 'Novak', 'Iyer'];
const DEPTS = ['Finance', 'IT Security', 'Operations', 'Human Res.', 'Sales', 'Legal', 'IT', 'Marketing'];

// 24 x 24 distinct first/last pairs (5 is coprime with 24, so no repeats
// until index 576).
function person(i) {
  const a = i % FIRST.length;
  const b = Math.floor(i / FIRST.length);
  const first = FIRST[a];
  const last = LAST[(a + b * 5) % LAST.length];
  return { name: `${first} ${last}`, dept: DEPTS[(i * 7 + b) % DEPTS.length], initials: `${first[0]}${last[0]}` };
}

// Every participant, ranked. Points fall off steeply at the top and flatten
// out down the field, the way a real leaderboard does.
function buildBoard(seed, total) {
  const all = [];
  for (let rank = 1; rank <= total; rank += 1) {
    const t = total > 1 ? (rank - 1) / (total - 1) : 0;
    const s = (1 - t) ** 1.6 * rank ** -0.08; // 1 at the top, 0 at the bottom
    const p = person(rank - 1 + seed * 37);
    const pts = Math.round(80 + 1400 * s - (seed % 5) * 7);
    const rep = Math.round(27 + 70 * s);
    const clk = Math.round(46 - 44 * s);
    const move = ((rank * 13 + seed * 7) % 9) - 3; // places gained (+) or lost (-) this week
    all.push({ rank, ...p, pts: pts.toLocaleString(), rep: `${rep}%`, clk: `${clk}%`, move });
  }
  return { podium: { first: all[0], second: all[1], third: all[2] }, rows: all.slice(3), total };
}

const GLOBAL = { total: 128, youRank: 12, board: buildBoard(0, 128) };

const NAMED_CAMPAIGNS = [
  { id: 'CMP-2d24b2', name: 'Q4 Credential Harvest Drill', type: 'Credential theft', started: '6 Oct', total: 2480, youRank: 15, seed: 1, kpis: { Opened: '61%', Clicked: '14%', Reported: '52%' } },
  { id: 'CMP-ef6a29', name: 'Payroll Update Notice', type: 'Finance lure', started: '5 Oct', total: 1860, youRank: 7, seed: 2, kpis: { Opened: '58%', Clicked: '11%', Reported: '49%' } },
  { id: 'CMP-8414f9', name: 'Mailbox Quota Exceeded', type: 'IT lure', started: '4 Oct', total: 3120, youRank: 21, seed: 3, kpis: { Opened: '66%', Clicked: '18%', Reported: '45%' } },
  { id: 'CMP-1edcb1', name: 'HR Policy Acknowledgement', type: 'HR lure', started: '2 Oct', total: 980, youRank: 4, seed: 4, kpis: { Opened: '54%', Clicked: '9%', Reported: '57%' } },
  { id: 'CMP-e75257', name: 'Teams Voicemail Alert', type: 'IT lure', started: '1 Oct', total: 2240, youRank: 13, seed: 5, kpis: { Opened: '63%', Clicked: '15%', Reported: '50%' } },
  { id: 'CMP-12fd10', name: 'Vendor Invoice Overdue', type: 'Finance lure', started: '29 Sep', total: 1440, youRank: 18, seed: 6, kpis: { Opened: '60%', Clicked: '13%', Reported: '48%' } },
  { id: 'CMP-fcb850', name: 'Benefits Enrolment Closing', type: 'HR lure', started: '27 Sep', total: 1710, youRank: 9, seed: 7, kpis: { Opened: '55%', Clicked: '10%', Reported: '53%' } },
  { id: 'CMP-c99f6e', name: 'VPN Re-authentication', type: 'Credential theft', started: '24 Sep', total: 2890, youRank: 16, seed: 8, kpis: { Opened: '64%', Clicked: '17%', Reported: '46%' } },
];

const LURES = [
  ['Password Expiry Warning', 'Credential theft'], ['Shared Document Request', 'Credential theft'],
  ['Parcel Delivery Failed', 'Delivery lure'], ['Expense Claim Rejected', 'Finance lure'],
  ['MFA Reset Required', 'Credential theft'], ['Annual Bonus Letter', 'HR lure'],
  ['IT Asset Audit', 'IT lure'], ['Conference Invitation', 'Event lure'],
  ['Salary Revision', 'HR lure'], ['Security Patch Install', 'IT lure'],
  ['Wire Transfer Approval', 'Finance lure'], ['Holiday Calendar 2027', 'HR lure'],
  ['OneDrive Storage Full', 'IT lure'], ['Customer Complaint Escalation', 'Business lure'],
];
const REGIONS = ['EMEA', 'APAC', 'Americas'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 42 more so the rail has a realistic 50 ongoing campaigns to scroll through.
const MORE_CAMPAIGNS = Array.from({ length: LURES.length * REGIONS.length }, (_, k) => {
  const [lure, type] = LURES[k % LURES.length];
  const region = REGIONS[Math.floor(k / LURES.length)];
  const started = new Date(Date.UTC(2026, 8, 22 - k));
  const total = 600 + ((k * 397) % 2600);
  return {
    id: `CMP-${(((k + 1) * 2654435761) >>> 0).toString(16).slice(0, 6)}`,
    name: `${lure} (${region})`,
    type,
    started: `${started.getUTCDate()} ${MONTHS[started.getUTCMonth()]}`,
    total,
    youRank: 4 + ((k * 11) % 26),
    seed: 9 + k,
    kpis: {
      Opened: `${50 + ((k * 7) % 18)}%`,
      Clicked: `${8 + ((k * 5) % 12)}%`,
      Reported: `${42 + ((k * 3) % 17)}%`,
    },
  };
});

const CAMPAIGNS = [...NAMED_CAMPAIGNS, ...MORE_CAMPAIGNS];

const pct = (s) => parseInt(s, 10) || 0;
const avgKpi = (key) => `${Math.round(CAMPAIGNS.reduce((sum, c) => sum + pct(c.kpis[key]), 0) / CAMPAIGNS.length)}%`;
const GLOBAL_KPIS = { Opened: avgKpi('Opened'), Clicked: avgKpi('Clicked'), Reported: avgKpi('Reported') };

const MEDAL = { first: '#E8B30B', second: '#8A94A6', third: '#C2772E' };
const rowFill = (i) => ['var(--c-mint)', 'var(--c-lav)', 'var(--c-peach)'][i % 3];
const toNum = (s) => Number(String(s).replace(/,/g, '')) || 0;

const PLACE = {
  first: { w: 184, h: 76, num: 34, av: 60, medal: MEDAL.first, fill: 'var(--c-peach)', delay: 0.26 },
  second: { w: 160, h: 54, num: 26, av: 50, medal: MEDAL.second, fill: 'var(--c-lav)', delay: 0.08 },
  third: { w: 160, h: 40, num: 22, av: 50, medal: MEDAL.third, fill: 'var(--c-mint)', delay: 0.16 },
};
const NUMERAL = { first: '1', second: '2', third: '3' };
const DEPT_CODE = { Finance: 'FIN', 'IT Security': 'SEC', Operations: 'OPS', 'Human Res.': 'HR', Sales: 'SAL', Legal: 'LEG', IT: 'IT', Marketing: 'MKT' };
// Rank | Person | Reported rate | Clicked | This week | Points
const COLS = '60px minmax(200px, 1.3fr) minmax(170px, 1fr) 76px 84px 96px';
const ROW_PAD = 14; // row side padding; the column header lines up with it

// L-shape sheet, built like Requests & Approvals: the colour capsule is its own
// rounded tile and the white sheet wraps round it with a small even gap.
// HERO_H is shared with the "Your standing" card so the two line up top and bottom.
const HERO_H = 136;
const CAP_W = 224;
const CAP_H = HERO_H;
const L_GAP = 7;
const L_R = 16;
const FILLET = L_R + L_GAP; // concave corner, concentric with the capsule's

// Rows are a fixed height so the page size can be worked out from the space
// the list actually has.
const ROW_H = 48;
const ROW_GAP = 6;
const FIRST_LIST_RANK = 4; // ranks 1–3 stand on the podium

const compact = (n) => {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}k`;
  return String(n);
};

// Department podium (average points per person) and the points total, worked
// out from whichever board is showing.
function boardInsights(board) {
  const all = [board.podium.first, board.podium.second, board.podium.third, ...board.rows];
  const byDept = {};
  all.forEach((r) => {
    const d = byDept[r.dept] || (byDept[r.dept] = { pts: 0, rep: 0, n: 0 });
    d.pts += toNum(r.pts);
    d.rep += pct(r.rep);
    d.n += 1;
  });
  const ranked = Object.entries(byDept)
    .map(([dept, d]) => ({ dept, avg: Math.round(d.pts / d.n), rep: Math.round(d.rep / d.n), n: d.n }))
    .sort((a, b) => b.avg - a.avg || a.dept.localeCompare(b.dept))
    .map((d) => ({
      name: d.dept, initials: DEPT_CODE[d.dept] || d.dept.slice(0, 3).toUpperCase(),
      dept: `${d.n.toLocaleString()} ${d.n === 1 ? 'person' : 'people'}`, pts: d.avg.toLocaleString(), rep: `${d.rep}%`,
    }));
  const deptPodium = ranked.length >= 3 ? { first: ranked[0], second: ranked[1], third: ranked[2] } : null;
  const points = all.reduce((sum, r) => sum + toNum(r.pts), 0);
  return { deptPodium, points };
}

const ordinalSuffix = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  return { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th';
};

// How each tracked event scores, in the order a person meets them.
const RULES = [
  { event: 'Reported', label: 'Report a phishing email', desc: 'Flag a suspicious email', Icon: Flag },
  { event: 'Trained', label: 'Complete a training', desc: 'Finish an assigned module', Icon: GraduationCap },
  { event: 'Evaluated', label: 'Pass an evaluation', desc: 'Pass the follow-up quiz', Icon: ClipboardCheck },
  { event: 'Opened', label: 'Open a simulation', desc: 'Opening a simulated email', Icon: MailOpen },
  { event: 'Clicked', label: 'Click a simulated link', desc: 'A link inside a simulation', Icon: MousePointerClick },
  { event: 'Compromised', label: 'Submit your details', desc: 'On a fake login page', Icon: KeyRound },
];

// Page buttons with ellipses: 1 … 4 5 6 … 19
function pageList(cur, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const keep = new Set([0, count - 1, cur - 1, cur, cur + 1]);
  if (cur <= 2) [1, 2, 3].forEach((i) => keep.add(i));
  if (cur >= count - 3) [count - 4, count - 3, count - 2].forEach((i) => keep.add(i));
  const pages = [...keep].filter((i) => i >= 0 && i < count).sort((a, b) => a - b);
  const out = [];
  pages.forEach((p, idx) => {
    if (idx > 0 && p - pages[idx - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

// --- presentational pieces (module scope) ------------------------------------

const Avatar = ({ initials, size = 32, ring, you }) => (
  <span
    className="lb-mono"
    style={{
      width: size, height: size, borderRadius: 999, background: '#fff',
      color: you ? 'var(--you-avatar)' : '#0F172A', fontWeight: 800,
      fontSize: (size >= 58 ? 19 : size >= 48 ? 16 : size >= 30 ? 11.5 : 9.5) * (String(initials).length > 2 ? 0.8 : 1),
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      boxShadow: you ? 'inset 0 0 0 2px var(--you)' : ring ? `inset 0 0 0 3px ${ring}` : '0 1px 2px rgba(15,23,42,0.1)',
    }}
  >
    {initials}
  </span>
);

const Chip = ({ kind, children }) => (
  <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999, color: kind === 'good' ? '#15803D' : '#E60000', background: kind === 'good' ? '#DCFCE7' : '#FEE2E2' }}>
    {children}
  </span>
);

const SPARKLES = [
  { top: -10, left: -16, s: 12, d: 0 },
  { top: -14, right: -10, s: 9, d: 0.6 },
  { bottom: -2, right: -18, s: 10, d: 1.2 },
];

const Pedestal = ({ person: p, place, reduce }) => {
  const c = PLACE[place];
  const first = place === 'first';
  const flair = first && !reduce; // pulse ring + sparkles on the champion
  return (
    <motion.div
      initial={reduce ? false : { y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 150, damping: 17, delay: c.delay }}
      whileHover={{ y: -4 }}
      style={{ width: c.w, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      {first && (
        <span style={{ color: MEDAL.first, display: 'flex', marginBottom: 1 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 7l4 4 5-6 5 6 4-4-2 12H5L3 7z" /></svg>
        </span>
      )}
      <span style={{ position: 'relative', display: 'flex' }}>
        {flair && (
          <motion.span
            aria-hidden
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
            style={{ position: 'absolute', inset: -6, borderRadius: 999, border: `2px solid ${MEDAL.first}` }}
          />
        )}
        {flair && SPARKLES.map((sp, i) => (
          <motion.span
            key={i}
            aria-hidden
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut', delay: sp.d }}
            style={{ position: 'absolute', top: sp.top, left: sp.left, right: sp.right, bottom: sp.bottom, lineHeight: 0 }}
          >
            <svg width={sp.s} height={sp.s} viewBox="0 0 24 24" fill={MEDAL.first}><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" /></svg>
          </motion.span>
        ))}
        <Avatar initials={p.initials} size={c.av} ring={c.medal} />
      </span>
      <div style={{ fontSize: first ? 16 : 14.5, fontWeight: 800, marginTop: 7, textAlign: 'center', lineHeight: 1.15, color: 'var(--text)' }}>{p.name}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginTop: 1 }}>{p.dept}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
        <span className={first ? 'lb-exb' : 'lb-mono'} style={{ fontSize: first ? 22 : 17, fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>{p.pts}</span>
        <Chip kind="good">{p.rep} reported</Chip>
      </div>
      <div
        style={{
          width: '100%', height: c.h, marginTop: 8, background: c.fill,
          borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: first ? 'inset 0 2px 0 rgba(255,255,255,0.6), 0 0 22px rgba(232,179,11,0.18)' : 'inset 0 2px 0 rgba(255,255,255,0.55)',
        }}
      >
        <span className="lb-exb" style={{ fontSize: c.num, color: c.medal, lineHeight: 1, opacity: 0.9 }}>{NUMERAL[place]}</span>
      </div>
    </motion.div>
  );
};

const Move = ({ n }) => {
  if (!n) return <span className="lb-mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>—</span>;
  const up = n > 0;
  return (
    <span className="lb-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11.5, fontWeight: 800, color: up ? 'var(--t-green)' : 'var(--t-red)' }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points={up ? '6 15 12 9 18 15' : '6 9 12 15 18 9'} /></svg>
      {Math.abs(n)}
    </span>
  );
};

const RankRow = ({ r, fill, you, accent }) => (
  <div
    style={{
      height: ROW_H, flexShrink: 0,
      background: you ? 'var(--base)' : fill,
      border: you ? '1.5px solid var(--you)' : '1px solid var(--hair)',
      borderRadius: 12, display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center',
      padding: `0 ${ROW_PAD}px`, boxShadow: you ? 'var(--you-glow)' : 'none',
    }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: you ? 'var(--you)' : 'rgba(255,255,255,0.85)', borderRadius: 999, padding: '3px 9px', width: 'fit-content', boxShadow: you ? 'none' : '0 1px 2px rgba(15,23,42,0.06)' }}>
      {!you && <span style={{ width: 6, height: 6, borderRadius: 999, background: accent }} />}
      <span className="lb-mono" style={{ fontSize: 12, fontWeight: 800, color: you ? 'var(--you-ink)' : '#0F172A' }}>{r.rank}</span>
    </span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
      <Avatar initials={r.initials} size={32} you={you} />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 1 }}>
        <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{r.dept}</span>
      </span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ flex: 1, height: 8, borderRadius: 999, background: you ? 'var(--track)' : 'rgba(255,255,255,0.7)', overflow: 'hidden', display: 'block' }}>
        <span style={{ display: 'block', height: '100%', width: r.rep, background: '#16A34A', borderRadius: 999 }} />
      </span>
      <span className="lb-mono" style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--t-green)', width: 34, textAlign: 'right' }}>{r.rep}</span>
    </div>
    <div className="lb-mono" style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--t-red)', textAlign: 'center' }}>{r.clk}</div>
    <div style={{ textAlign: 'center' }}><Move n={r.move} /></div>
    <div className="lb-mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', textAlign: 'right' }}>{r.pts}</div>
  </div>
);

// One figure in the sheet's top arm: label, big value, and a bar for rates.
const StatTile = ({ label, value, rate, bg, ink }) => (
  <div style={{ flex: 1, minWidth: 104, maxWidth: 190, padding: '11px 14px 12px', borderRadius: 14, background: bg, display: 'flex', flexDirection: 'column', gap: 5 }}>
    <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
    <span className="lb-exb" style={{ fontSize: 24, lineHeight: 1, color: ink, letterSpacing: '-0.01em' }}>{value}</span>
    <span style={{ height: 4, borderRadius: 999, background: 'var(--track)', overflow: 'hidden', display: 'block', visibility: rate == null ? 'hidden' : 'visible' }}>
      <span style={{ display: 'block', height: '100%', width: `${rate || 0}%`, background: ink, borderRadius: 999 }} />
    </span>
  </div>
);

// People / Departments switch pinned to the top-left of the podium stage.
const STAGES = [{ id: 'people', label: 'Top people' }, { id: 'depts', label: 'Top departments' }];

const StageSwitch = ({ value, onChange, sub, canDepts }) => (
  <div style={{ position: 'absolute', top: 8, left: 24, zIndex: 1 }}>
    <div role="tablist" aria-label="Podium" style={{ display: 'inline-flex', padding: 3, gap: 2, borderRadius: 999, background: 'var(--track)' }}>
      {STAGES.map((st) => {
        const on = value === st.id;
        const disabled = st.id === 'depts' && !canDepts;
        return (
          <button
            key={st.id}
            type="button"
            role="tab"
            aria-selected={on}
            disabled={disabled}
            onClick={() => onChange(st.id)}
            className="lb-pg"
            style={{
              height: 28, padding: '0 14px', borderRadius: 999, border: 'none', cursor: on ? 'default' : 'pointer',
              fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap',
              background: on ? 'var(--base)' : 'transparent', color: on ? 'var(--text)' : 'var(--muted)',
              boxShadow: on ? '0 1px 3px rgba(15,23,42,0.14)' : 'none', transition: 'background .15s ease, color .15s ease',
            }}
          >
            {st.label}
          </button>
        );
      })}
    </div>
    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', margin: '6px 0 0 6px' }}>{sub}</div>
  </div>
);

const Chevron = ({ left }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points={left ? '15 6 9 12 15 18' : '9 6 15 12 9 18'} />
  </svg>
);

const pagerBtn = (active) => ({
  minWidth: 28, height: 28, padding: '0 6px', borderRadius: 8, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, fontWeight: 800,
  border: active ? '1px solid var(--ink)' : '1px solid var(--hair)',
  background: active ? 'var(--ink)' : 'var(--base)',
  color: active ? 'var(--ink-on)' : 'var(--text)',
});

const Pager = ({ page, pageCount, onPage }) => (
  <nav aria-label="Leaderboard pages" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <button type="button" className="lb-pg" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)} style={pagerBtn(false)}>
      <Chevron left />
    </button>
    {pageList(page, pageCount).map((p) => (typeof p === 'string' ? (
      <span key={p} style={{ minWidth: 18, textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>…</span>
    ) : (
      <button
        key={p}
        type="button"
        className="lb-mono"
        aria-current={p === page ? 'page' : undefined}
        onClick={() => onPage(p)}
        style={pagerBtn(p === page)}
      >
        {p + 1}
      </button>
    )))}
    <button type="button" className="lb-pg" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)} style={pagerBtn(false)}>
      <Chevron />
    </button>
  </nav>
);

// `onClose` is passed when the board is shown as a pop-up (LeaderboardModal);
// it adds a close button to the top bar.
const Leaderboard = ({ onClose }) => {
  const { isDark, user } = useUserType() || {};
  const reduce = useReducedMotion();
  const rules = useGamificationRules();
  const [view, setView] = useState('global'); // 'global' | 'campaign'
  const [campaignId, setCampaignId] = useState(CAMPAIGNS[0].id);
  const [page, setPage] = useState(0);
  const [stage, setStage] = useState('people'); // podium shows 'people' or 'depts'
  const [rowsPerPage, setRowsPerPage] = useState(7);
  const listRef = useRef(null);

  // Fit the page size to the list's real height; re-run on any resize.
  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      const h = el.clientHeight;
      setRowsPerPage(Math.max(1, Math.floor((h + ROW_GAP) / (ROW_H + ROW_GAP))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const chooseView = (id) => { setView(id); setPage(0); };
  const chooseCampaign = (id) => { setCampaignId(id); setPage(0); };

  const youName = (user && user.UserName) ? user.UserName : 'You';
  const youInitials = youName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'YOU';

  const campaign = useMemo(() => CAMPAIGNS.find((c) => c.id === campaignId) || CAMPAIGNS[0], [campaignId]);

  const scope = useMemo(() => {
    if (view === 'global') {
      return { board: GLOBAL.board, youRank: GLOBAL.youRank, counter: GLOBAL.total.toLocaleString(), counterLabel: 'Participants', title: 'Global Leaderboard', sub: 'Everyone ranked across every campaign · all time', accentCounter: '#8ED973', live: false, kpis: GLOBAL_KPIS, kpiPrefix: 'Avg. ' };
    }
    return {
      board: buildBoard(campaign.seed, campaign.total), youRank: campaign.youRank,
      counter: campaign.total.toLocaleString(), counterLabel: 'Recipients', title: campaign.name,
      sub: `${campaign.type} · started ${campaign.started}`, accentCounter: '#818CF8', live: true, kpis: campaign.kpis, kpiPrefix: '',
    };
  }, [view, campaign]);

  const youRow = useMemo(() => {
    const base = scope.board.rows.find((r) => r.rank === scope.youRank) || { rank: scope.youRank, pts: '—', rep: '—', clk: '—' };
    return { ...base, name: youName, dept: 'IT Security', initials: youInitials, move: 3 };
  }, [scope, youName, youInitials]);

  const insights = useMemo(() => boardInsights(scope.board), [scope]);
  // Which podium the stage shows; falls back to people if departments can't be ranked.
  const podium = stage === 'depts' && insights.deptPodium
    ? { id: 'depts', board: insights.deptPodium }
    : { id: 'people', board: scope.board.podium };

  // Standing vs the person one place above — a small goal + progress bar.
  const standing = useMemo(() => {
    const { podium, rows } = scope.board;
    const above = scope.youRank - 1 <= 3
      ? [podium.first, podium.second, podium.third][scope.youRank - 2]
      : rows[scope.youRank - 1 - FIRST_LIST_RANK];
    const youPts = toNum(youRow.pts);
    const abovePts = above ? toNum(above.pts) : youPts;
    return {
      toNext: above ? Math.max(0, abovePts - youPts) : 0,
      fillPct: abovePts > 0 ? Math.min(100, Math.round((youPts / abovePts) * 100)) : 100,
      nextRank: scope.youRank - 1,
    };
  }, [scope, youRow]);

  // Pagination over ranks 4..N (1–3 are on the podium).
  const listRows = scope.board.rows;
  const pageCount = Math.max(1, Math.ceil(listRows.length / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * rowsPerPage;
  const pageRows = listRows.slice(pageStart, pageStart + rowsPerPage);
  const firstShown = pageRows.length ? pageRows[0].rank : 0;
  const lastShown = pageRows.length ? pageRows[pageRows.length - 1].rank : 0;

  const youOnPodium = scope.youRank < FIRST_LIST_RANK;
  const youPage = youOnPodium ? -1 : Math.floor((scope.youRank - FIRST_LIST_RANK) / rowsPerPage);
  const youVisible = youOnPodium || youPage === safePage;

  const vars = isDark
    ? { '--bg': '#0E0F13', '--base': '#1C1E24', '--rail': '#15171C', '--text': '#F1F5F9', '--muted': '#9AA6B2', '--hair': 'rgba(255,255,255,0.08)', '--track': 'rgba(255,255,255,0.12)', '--ink': '#F8FAFC', '--ink-on': '#0F172A', '--you': '#F8FAFC', '--you-ink': '#0F172A', '--you-avatar': '#0F172A', '--you-glow': '0 0 0 3px rgba(248,250,252,0.10)', '--panel': '#22252C', '--c-gold': '#2E240C', '--t-green': '#4ADE80', '--t-red': '#F87171', '--t-violet': '#A5B4FC', '--t-gold': '#FBBF24', '--c-mint': '#0D271E', '--c-lav': '#22193E', '--c-peach': '#2E200C', '--cap-global': '#143024', '--cap-camp': '#1E2250', '--cap-standing': 'linear-gradient(135deg,#3A2A0E,#241A0A)' }
    : { '--bg': '#F1F4F8', '--base': '#FFFFFF', '--rail': '#FFFFFF', '--text': '#0F172A', '--muted': '#64748B', '--hair': 'rgba(15,23,42,0.06)', '--track': '#EEF2F6', '--ink': '#0F172A', '--ink-on': '#FFFFFF', '--you': '#E60000', '--you-ink': '#FFFFFF', '--you-avatar': '#E60000', '--you-glow': '0 4px 12px rgba(230,0,0,0.12)', '--panel': '#F7F9FC', '--c-gold': '#FFF4D6', '--t-green': '#15803D', '--t-red': '#DC2626', '--t-violet': '#5B47C9', '--t-gold': '#B07A12', '--c-mint': '#CEFBEA', '--c-lav': '#ECE8FF', '--c-peach': '#FFEFCE', '--cap-global': '#D8F3DC', '--cap-camp': '#E0E7FF', '--cap-standing': 'linear-gradient(135deg,#FFF3D6,#FFE6C7)' };

  const railCapsule = (id, label, sub, art, activeColor) => {
    const selected = view === id;
    return (
      <button
        type="button"
        className="lb-cap"
        aria-pressed={selected}
        onClick={() => chooseView(id)}
        style={{
          position: 'relative', overflow: 'hidden', textAlign: 'left', cursor: 'pointer', width: '100%', flexShrink: 0,
          borderRadius: L_R, padding: '16px 16px 18px', marginBottom: 10, minHeight: 96,
          border: selected ? '1px solid transparent' : '1px solid var(--hair)',
          background: selected ? (id === 'global' ? 'var(--cap-global)' : 'var(--cap-camp)') : 'var(--rail)',
          boxShadow: selected ? '0 8px 18px rgba(15,23,42,0.10)' : 'none', color: 'var(--text)',
        }}
      >
        <div style={{ position: 'relative', fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', color: selected ? activeColor : 'var(--text)' }}>{label}</div>
        <div style={{ position: 'relative', fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', marginTop: 4, lineHeight: 1.35, maxWidth: 170 }}>{sub}</div>
        <img className="lb-art" src={art} alt="" aria-hidden style={{ position: 'absolute', bottom: 0, right: 2, width: 60, height: 60, objectFit: 'contain', pointerEvents: 'none', filter: 'drop-shadow(0 6px 10px rgba(15,23,42,0.18))' }} />
      </button>
    );
  };

  return (
    <>
      <style>{FONT_IMPORT}</style>

      {/* Fills <main> exactly; nothing inside lets the page itself scroll. */}
      <div className="lb-page" style={{ ...vars, '--accent': '#E60000', background: 'var(--bg)', color: 'var(--text)', width: '100%', height: '100%', overflow: 'hidden', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* top black bar */}
        <div style={{ background: '#000', color: '#fff', borderRadius: 12, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: onClose ? '0 8px 0 18px' : '0 18px', flexShrink: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Leaderboard</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close leaderboard"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Close
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          )}
        </div>

        {/* two-column workspace */}
        <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>

          {/* LEFT RAIL */}
          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* Your standing — hero, on top */}
            <div style={{ flexShrink: 0, height: HERO_H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--cap-standing)', borderRadius: L_R, padding: '13px 16px', marginBottom: 10, boxShadow: '0 8px 20px rgba(232,179,11,0.16)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B07A12' }}>Your standing</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 800, color: '#15803D', background: '#DCFCE7', padding: '3px 8px', borderRadius: 999 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15" /></svg>
                  {youRow.move} this week
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 999, flexShrink: 0, background: 'conic-gradient(from 210deg, #F6D06B, #E8B30B, #B8860B, #E8B30B, #F6D06B)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(184,134,11,0.35)' }}>
                  <div style={{ width: 42, height: 42, borderRadius: 999, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                    <span style={{ fontSize: 6.5, fontWeight: 800, letterSpacing: '0.12em', color: '#B07A12', marginBottom: 1 }}>RANK</span>
                    <span className="lb-exb" style={{ fontSize: 19, color: '#7A5B12', lineHeight: 1 }}>{scope.youRank}</span>
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{youName}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{youRow.dept}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t-gold)', marginTop: 1 }}>{youRow.pts} pts · {youRow.rep} reported</div>
                </div>
              </div>

              {standing.toNext > 0 && (
                <div>
                  <div style={{ height: 6, borderRadius: 999, background: 'rgba(176,122,18,0.18)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${standing.fillPct}%`, background: 'linear-gradient(90deg,#E8B30B,#F6D06B)', borderRadius: 999 }} />
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--t-gold)', marginTop: 5 }}>{standing.toNext.toLocaleString()} {standing.toNext === 1 ? 'pt' : 'pts'} to reach rank {standing.nextRank}</div>
                </div>
              )}
            </div>

            {railCapsule('global', 'Global Leaderboard', 'Everyone, every campaign, all time', GlobalTrophy, isDark ? '#4ADE80' : '#15803D')}
            {railCapsule('campaign', 'My Campaigns', 'Live ranking inside each campaign', CampaignMegaphone, isDark ? '#A5B4FC' : '#4F46E5')}

            {/* Global view: how points are earned, read live from the Gamification Engine */}
            {view === 'global' && (
              <div className="lb-rules" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--rail)', border: '1px solid var(--hair)', borderRadius: L_R, padding: '14px 16px', overflow: 'hidden' }}>
                <div style={{ flexShrink: 0, fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>How to earn points</div>
                <div style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', marginTop: 2, marginBottom: 6 }}>
                  {rules.error ? 'Live rules unavailable right now' : 'Live from the Gamification Engine'}
                </div>
                <div style={{ flex: 1, minHeight: 0, maxHeight: 420, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {RULES.map((rule) => {
                    const v = rules.points[rule.event];
                    const tone = v > 0 ? 'var(--t-green)' : v < 0 ? 'var(--t-red)' : 'var(--muted)';
                    const tint = v > 0 ? 'var(--c-mint)' : v < 0 ? 'var(--c-peach)' : 'var(--track)';
                    return (
                      <div key={rule.event} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--hair)' }}>
                        <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 10, background: tint, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <rule.Icon size={16} strokeWidth={2.3} />
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rule.label}</div>
                          <div className="lb-rule-desc" style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginTop: 1 }}>{rule.desc}</div>
                        </div>
                        <span className="lb-mono" style={{ flexShrink: 0, minWidth: 48, textAlign: 'center', fontSize: 12.5, fontWeight: 800, color: tone, background: tint, borderRadius: 999, padding: '4px 8px' }}>
                          {rules.loading ? '…' : formatPoints(v)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* the only scrolling region on the page */}
            {view === 'campaign' && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', padding: '2px 4px 8px' }}>
                  Ongoing campaigns · {CAMPAIGNS.length}
                </div>
                <div className="lb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px 12px 0' }}>
                  {CAMPAIGNS.map((c) => {
                    const sel = c.id === campaignId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => chooseCampaign(c.id)}
                        style={{
                          flexShrink: 0, textAlign: 'left', cursor: 'pointer', borderRadius: 14, padding: '10px 12px',
                          border: sel ? '1.5px solid #818CF8' : '1px solid var(--hair)',
                          background: sel ? 'var(--cap-camp)' : 'var(--rail)', color: 'var(--text)',
                          boxShadow: sel ? '0 4px 12px rgba(129,140,248,0.18)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A', flexShrink: 0, marginTop: 4 }} />
                          <span style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.25 }}>{c.name}</span>
                        </div>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', marginTop: 3, paddingLeft: 13 }}>{c.type} · {c.total.toLocaleString()} recipients</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SHEET — standalone colour capsule; the white sheet wraps round it in an L */}
          <div style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>

            {/* capsule: its own tile, set apart from the sheet by L_GAP */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: CAP_W, height: CAP_H, zIndex: 2, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, background: view === 'global' ? 'var(--cap-global)' : 'var(--cap-camp)', borderRadius: L_R, overflow: 'hidden' }}>
              {scope.live && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A' }} />
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t-green)' }}>Live now</span>
                </div>
              )}
              <div style={{ fontSize: view === 'global' ? 19 : 16, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.16, color: 'var(--text)' }}>{scope.title}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.35, maxWidth: 196 }}>{scope.sub}</div>
            </div>

            {/* concave fillet joining the arm to the base, following the capsule's corner */}
            <svg aria-hidden width={FILLET} height={FILLET} viewBox={`0 0 ${FILLET} ${FILLET}`} style={{ position: 'absolute', top: CAP_H - L_R, left: CAP_W - L_R, zIndex: 1, display: 'block' }}>
              <path d={`M 0 ${FILLET} A ${FILLET} ${FILLET} 0 0 0 ${FILLET} 0 V ${FILLET} H 0 Z`} fill="var(--base)" />
            </svg>

            {/* top-right arm of the L: stat tiles + the big counter */}
            <div style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 28, padding: '0 24px', background: 'var(--base)', borderTop: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderRadius: `${L_R}px ${L_R}px 0 0` }}>
              <div style={{ flex: 1, display: 'flex', gap: 10, minWidth: 0 }}>
                <StatTile label={`${scope.kpiPrefix}Opened`} value={scope.kpis.Opened} rate={pct(scope.kpis.Opened)} bg="var(--c-lav)" ink="var(--t-violet)" />
                <StatTile label={`${scope.kpiPrefix}Clicked`} value={scope.kpis.Clicked} rate={pct(scope.kpis.Clicked)} bg="var(--c-peach)" ink="var(--t-red)" />
                <StatTile label={`${scope.kpiPrefix}Reported`} value={scope.kpis.Reported} rate={pct(scope.kpis.Reported)} bg="var(--c-mint)" ink="var(--t-green)" />
                <StatTile label="Points earned" value={compact(insights.points)} bg="var(--c-gold)" ink="var(--t-gold)" />
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="lb-exb" style={{ fontSize: 46, lineHeight: 0.9, color: scope.accentCounter, letterSpacing: '-0.02em' }}>{scope.counter}</div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginTop: 4 }}>{scope.counterLabel}</div>
              </div>
            </div>

            {/* lower base of the L: podium, ranked list, footer */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--base)', borderLeft: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', borderRadius: `${L_R}px 0 ${L_R}px ${L_R}px`, overflow: 'hidden' }}>

              {/* podium stage, lit from below: top people, or top departments via the switch */}
              <div style={{ flexShrink: 0, position: 'relative', padding: '6px 24px 4px', background: 'radial-gradient(40% 92% at 50% 100%, rgba(232,179,11,0.12), transparent 72%)' }}>
                <StageSwitch
                  value={podium.id}
                  onChange={setStage}
                  canDepts={Boolean(insights.deptPodium)}
                  sub={podium.id === 'depts' ? 'Average points per person' : view === 'global' ? 'Across every campaign' : 'In this campaign'}
                />
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${podium.id}-${view}-${campaignId}`}
                    initial={reduce ? false : { opacity: 0, x: podium.id === 'depts' ? 24 : -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: podium.id === 'depts' ? -24 : 24 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 22 }}
                  >
                    <Pedestal person={podium.board.second} place="second" reduce={reduce} />
                    <Pedestal person={podium.board.first} place="first" reduce={reduce} />
                    <Pedestal person={podium.board.third} place="third" reduce={reduce} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* column header */}
              <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: `8px ${24 + 1 + ROW_PAD}px 8px`, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800 }}>
                <div>Rank</div><div>Person</div><div>Reported rate</div><div style={{ textAlign: 'center' }}>Clicked</div><div style={{ textAlign: 'center' }}>This week</div><div style={{ textAlign: 'right' }}>Points</div>
              </div>

              {/* ranked list — one page at a time, sized to fit */}
              <div ref={listRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden', margin: '0 24px' }}>
                <motion.div
                  key={`${view}-${campaignId}-${safePage}`}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP }}
                >
                  {pageRows.map((r, i) => (
                    <RankRow
                      key={r.rank}
                      r={r.rank === scope.youRank ? youRow : r}
                      fill={rowFill(pageStart + i)}
                      you={r.rank === scope.youRank}
                      accent="var(--accent)"
                    />
                  ))}
                </motion.div>
              </div>

              {/* footer: the viewer's rank + their pill, which jumps to their page (left); pagination (right) */}
              <div style={{ flexShrink: 0, borderTop: '1px solid var(--hair)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'var(--base)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span className="lb-exb" style={{ fontSize: 24, lineHeight: 1, color: 'var(--you)', whiteSpace: 'nowrap' }}>
                    {scope.youRank}<span style={{ fontSize: 13, marginLeft: 1 }}>{ordinalSuffix(scope.youRank)}</span>
                  </span>
                  <button
                    type="button"
                    className="lb-me"
                    aria-disabled={youVisible}
                    aria-label={youVisible ? `${youRow.name}, ${scope.youRank}${ordinalSuffix(scope.youRank)}` : `${youRow.name}, ${scope.youRank}${ordinalSuffix(scope.youRank)}. Go to my rank`}
                    title={youVisible ? undefined : 'Go to my rank'}
                    onClick={() => { if (!youVisible) setPage(youPage); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, border: '1.5px solid var(--you)', borderRadius: 999, padding: youVisible ? '4px 16px 4px 4px' : '4px 10px 4px 4px', background: 'var(--base)', color: 'var(--text)', cursor: youVisible ? 'default' : 'pointer' }}
                  >
                    <Avatar initials={youRow.initials} size={26} you />
                    <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{youRow.name}</span>
                    <span className="lb-mono" style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>{youRow.pts} pts</span>
                    {!youVisible && (
                      <span aria-hidden style={{ display: 'flex', color: 'var(--you)' }}><Chevron /></span>
                    )}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    Ranks <span className="lb-mono" style={{ color: 'var(--text)', fontWeight: 800 }}>{firstShown}–{lastShown}</span> of {scope.board.total.toLocaleString()}
                  </span>
                  <Pager page={safePage} pageCount={pageCount} onPage={setPage} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Leaderboard;

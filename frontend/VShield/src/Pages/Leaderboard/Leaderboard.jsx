import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Flag, GraduationCap, KeyRound, MailOpen, MousePointerClick, Users } from 'lucide-react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { useGamificationRules } from '../../services/useGamificationRules';
import { formatPoints } from '../../services/gamificationPoints';
import LevelBadge from '../../GlobalComponents/LevelBadge';
import AllBadges from '../../GlobalComponents/AllBadges';
import { useMyStanding } from '../../services/useMyStanding';
import { samplePointsFor, visibleLevel } from '../../services/sampleLeaderboard';
import { useGlobalBoard } from '../../services/useGlobalBoard';
import { gradeName, levelAltText, levelFor, progressFor, rangeText } from '../../services/levels';

// Clay-model corner artwork, reused from the existing asset set so the
// leaderboard reads like the Campaigns / Requests & Approvals screens.
import GlobalTrophy from '../../assets/LeaderboardAssets/GlobalTrophy.png';
import CampaignMegaphone from '../../assets/LeaderboardAssets/CampaignMegaphone.png';

// =============================================================================
// VOIS Shield — Leaderboard (design prototype)
//
// The global board comes from useGlobalBoard: the bundled user list ranked by
// points (services/sampleLeaderboard.js, the same list My Space reads), or,
// with VITE_LIVE_LEVELS=true, the points ledger (GET /leaderboard). The
// campaign boards are still made up. Keyed by email, shown by name; scores
// from the gamification rules.
//
// Everyone's level badge leads their row, in the place of an avatar (like a
// game's ranking: rank, this week's move, badge, the person, their points),
// and stands on the podium as the hero of each place. Kept clean: no level
// names and no report rates on the board; the badge says the level (its name
// shows on hover). A level below zero is shown only to
// its owner and to Admins; other viewers see a locked, empty badge and no
// points at all (the live board doesn't even send them).
// Clicking any badge on the board opens it in All badges
// (GlobalComponents/AllBadges), with every level and grade.
//
// A full page, opened from the My Space LEADERBOARD button (there is no nav
// item); "My Space" in its top bar goes back. My Campaigns (the ongoing
// campaigns and how each is going) is for every role but Regular User: a
// Regular User sees the Global Leaderboard only.
//
// Layout follows Requests & Approvals: a left rail (your standing on top, then
// the Global / My Campaigns scope capsules with clay corner art, then the live
// points rules or the list of ongoing campaigns) and a right L-shaped "sheet":
// the title capsule (with the head count), the Top people / Top departments
// switch at the top of the arm, the podium centred under it (rising into the
// arm), and the paginated ranked list. The switch flips the whole board between
// people and departments. Campaign rates live on the dashboard. The viewer is highlighted red in light mode and
// white in dark mode.
//
// The page is locked to the viewport: nothing scrolls except the campaign list
// in the rail. The ranked list is paged instead, sized to however many rows fit,
// with the viewer's own position pinned bottom-left of the sheet.
// =============================================================================

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&family=JetBrains+Mono:wght@500;600;700;800&display=swap');
  .lb-exb  { font-family: 'Vodafone ExB', 'Vodafone', 'Montserrat', sans-serif; font-weight: 900; }
  .lb-mono { font-family: 'JetBrains Mono', monospace; }
  .lb-page { font-family: 'Inter', system-ui, sans-serif; }
  .lb-scroll::-webkit-scrollbar { width: 7px; }
  .lb-scroll::-webkit-scrollbar-thumb { background: rgba(120,130,145,0.35); border-radius: 999px; }
  .lb-pg:disabled { cursor: default; opacity: 0.4; }

  /* Scope capsules: the card pops a little on hover; its clay art sits still
     in the bottom-right corner, as on Campaigns and Requests & Approvals */
  .lb-cap { transition: transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s ease; }
  .lb-cap:hover { transform: scale(1.02); }
  .lb-cap:active { transform: scale(.97); }
  .lb-cap-only:hover, .lb-cap-only:active { transform: none; }

  /* Badges: lift on hover; rows lift a little too */
  .lb-badge-btn img { transition: transform .25s ease; }
  .lb-badge-btn:hover img { transform: translateY(-3px) scale(1.07); }
  .lb-badge-btn:focus-visible { outline: 2px solid var(--text); outline-offset: 3px; border-radius: 999px; }
  .lb-row { transition: box-shadow .15s ease; }
  .lb-row:hover { box-shadow: 0 6px 16px rgba(15,23,42,0.08); }

  /* Department crests: a band of light sweeps across now and then */
  @keyframes lb-shine { 0%, 62% { transform: translateX(-60px) skewX(-18deg); } 100% { transform: translateX(150px) skewX(-18deg); } }
  .lb-shine { animation: lb-shine 5.5s ease-in-out infinite; }

  /* Your standing: the badge turns the card over to your rank, and back */
  .lb-flip { transition: transform .55s cubic-bezier(.2,.75,.25,1); }
  .lb-hero-badge img { transition: transform .25s ease; }
  .lb-hero-badge:hover img { transform: translateY(-3px) scale(1.05); }
  .lb-hero-badge:hover > span { transform: scale(1.04); }
  .lb-hero-badge > span { transition: transform .25s ease; }
  .lb-hero-badge:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }

  /* Viewer's own pill in the footer: click to jump to their page */
  .lb-me { transition: box-shadow .15s ease, transform .15s ease; }
  .lb-me[aria-disabled="false"]:hover { box-shadow: var(--you-glow); transform: translateY(-1px); }

  /* Points rules: drop the one-line descriptions when the rail runs short,
     and tighten the rows when it runs shorter still, so all six fit */
  .lb-rules { container-type: size; }
  @container (max-height: 360px) { .lb-rule-desc { display: none !important; } }
  @container (max-height: 330px) {
    .lb-rule { padding: 4px 0 !important; }
    .lb-rule-ico { width: 27px !important; height: 27px !important; border-radius: 9px !important; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lb-cap, .lb-cap *, .lb-me, .lb-badge-btn img, .lb-row, .lb-flip, .lb-hero-badge img { animation: none !important; transition: none !important; }
    .lb-shine { animation: none !important; opacity: 0; }
  }
`;

// --- sample data -------------------------------------------------------------

const FIRST = ['Aditi', 'David', 'Noura', 'Priya', 'Marco', 'Sara', 'Liang', 'Tom', 'Elena', 'Omar', 'Mei', 'Yuki',
  'Hassan', 'Lena', 'Raj', 'Sofia', 'Kwame', 'Ana', 'Ivan', 'Chloe', 'Ben', 'Fatima', 'Noah', 'Grace'];
const LAST = ['Rao', 'Kim', 'Ali', 'Nair', 'Bellini', 'Nasser', 'Wei', 'Okafor', 'Petrova', 'Haddad', 'Chen', 'Tanaka',
  'Mensah', 'Fischer', 'Patel', 'Rossi', 'Silva', 'Dubois', 'Carter', 'Zahra', 'Weber', 'Lee', 'Novak', 'Iyer'];
// The same departments as the people directory (MasterUserData.json), so a
// campaign's Top departments shows the company's departments, yours included.
const DEPTS = [
  'AIDA', 'CARE', 'Finance Operations', 'Network Engineering', 'Supply Chain Management', 'Cyber Security',
  'Cloud Infrastructure', 'IT Operations', 'Procurement', 'Human Resources', 'Legal & Compliance', 'Sales & Enterprise',
  'Digital Products', 'Marketing & Communications', 'Executive Board', 'IT Security',
];

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
    const move = ((rank * 13 + seed * 7) % 9) - 3; // places gained (+) or lost (-) this week
    const levelId = levelFor(samplePointsFor(rank - 1 + seed * 37))?.id || null; // their overall level
    all.push({ rank, ...p, pts: pts.toLocaleString(), move, levelId });
  }
  return { podium: { first: all[0], second: all[1], third: all[2] }, rows: all.slice(3), total };
}


const NAMED_CAMPAIGNS = [
  { id: 'CMP-2d24b2', name: 'Q4 Credential Harvest Drill', type: 'Credential theft', started: '6 Oct', total: 2480, youRank: 15, seed: 1 },
  { id: 'CMP-ef6a29', name: 'Payroll Update Notice', type: 'Finance lure', started: '5 Oct', total: 1860, youRank: 7, seed: 2 },
  { id: 'CMP-8414f9', name: 'Mailbox Quota Exceeded', type: 'IT lure', started: '4 Oct', total: 3120, youRank: 21, seed: 3 },
  { id: 'CMP-1edcb1', name: 'HR Policy Acknowledgement', type: 'HR lure', started: '2 Oct', total: 980, youRank: 4, seed: 4 },
  { id: 'CMP-e75257', name: 'Teams Voicemail Alert', type: 'IT lure', started: '1 Oct', total: 2240, youRank: 13, seed: 5 },
  { id: 'CMP-12fd10', name: 'Vendor Invoice Overdue', type: 'Finance lure', started: '29 Sep', total: 1440, youRank: 18, seed: 6 },
  { id: 'CMP-fcb850', name: 'Benefits Enrolment Closing', type: 'HR lure', started: '27 Sep', total: 1710, youRank: 9, seed: 7 },
  { id: 'CMP-c99f6e', name: 'VPN Re-authentication', type: 'Credential theft', started: '24 Sep', total: 2890, youRank: 16, seed: 8 },
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
  };
});

const CAMPAIGNS = [...NAMED_CAMPAIGNS, ...MORE_CAMPAIGNS];


const MEDAL = { first: '#E8B30B', second: '#8A94A6', third: '#C2772E' };
const toNum = (s) => Number(String(s).replace(/,/g, '')) || 0;

// The podium: each place's badge stands in a ring of light (`halo` px) on a
// gold, silver or bronze pedestal (`h` px). The badge takes `badge` px of
// height; its picture is a quarter taller, the clear space above the stars
// reaching up out of the box, so the badge itself fills it. Under it, only the
// name, the department and the points: the badge says the level.
const PLACE = {
  first: { w: 196, h: 52, num: 20, badge: 88, halo: 142, av: 60, metal: 'gold', delay: 0.26 },
  second: { w: 176, h: 38, num: 17, badge: 68, halo: 124, av: 50, metal: 'silver', delay: 0.08 },
  third: { w: 176, h: 28, num: 15, badge: 68, halo: 124, av: 50, metal: 'bronze', delay: 0.16 },
};
const BADGE_HEADROOM = 1.25;
// [pedestal fill, numeral colour] for light and dark, and the ring's light.
const METAL = {
  gold: {
    light: ['linear-gradient(180deg, #FBE08A 0%, #E9B949 45%, #C9922A 100%)', '#6B4A00'],
    dark: ['linear-gradient(180deg, #7C5F18 0%, #4A370D 100%)', '#F6D06B'],
    ray: 'rgba(214,160,30,0.30)', glow: 'rgba(255,204,84,0.55)',
  },
  silver: {
    light: ['linear-gradient(180deg, #F3F5F8 0%, #D3D8E0 45%, #AEB6C2 100%)', '#46505E'],
    dark: ['linear-gradient(180deg, #4A515C 0%, #2B3038 100%)', '#D5DAE3'],
    ray: 'rgba(140,150,165,0.26)', glow: 'rgba(205,212,224,0.62)',
  },
  bronze: {
    light: ['linear-gradient(180deg, #F6CFA9 0%, #DE9A63 45%, #B9733E 100%)', '#6A3A16'],
    dark: ['linear-gradient(180deg, #7A4A24 0%, #4A2C14 100%)', '#F0B88A'],
    ray: 'rgba(190,110,50,0.26)', glow: 'rgba(240,172,120,0.50)',
  },
};
const NUMERAL = { first: '1', second: '2', third: '3' };
// The sheet's title tile keeps its pastel in dark mode, as on the app's other
// screens, so its words take the light theme's ink.
const PASTEL_INK = { '--text': '#0F172A', '--muted': '#475569', '--chip': 'rgba(255,255,255,0.72)', '--t-green': '#15803D' };
const DEPT_CODE = {
  Finance: 'FIN', 'IT Security': 'SEC', Operations: 'OPS', 'Human Res.': 'HR', Sales: 'SAL', Legal: 'LEG', IT: 'IT', Marketing: 'MKT',
  Procurement: 'PRC', 'Customer Care': 'CC', Engineering: 'ENG', 'Data & AI': 'DAI', 'Risk & Compliance': 'RSK', Facilities: 'FAC', Strategy: 'STR', 'Network Ops': 'NET',
  AIDA: 'AI', CARE: 'CAR', 'Finance Operations': 'FIN', 'Network Engineering': 'NET', 'Supply Chain Management': 'SCM',
  'Cyber Security': 'CYB', 'Cloud Infrastructure': 'CLD', 'IT Operations': 'ITO', 'Human Resources': 'HR', 'Legal & Compliance': 'LEG',
  'Sales & Enterprise': 'SAL', 'Digital Products': 'DIG', 'Marketing & Communications': 'MKT', 'Executive Board': 'EXB',
};
// Rank (and this week's move) | Badge | Person | Points
const COLS = '82px 50px minmax(0, 1fr) 112px';
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
const STAGE_RAISE = 34; // the podium rises this far into the arm, under the switch

// Rows are a fixed height so the page size can be worked out from the space
// the list actually has.
const ROW_H = 48;
const ROW_GAP = 6;
const FIRST_LIST_RANK = 4; // ranks 1–3 stand on the podium

// Department board, worked out from whichever people board is showing: every
// department ranked by average points per person (so team size doesn't decide
// it), in the same row shape as people so the podium and list can show either.
// The viewer's own row (`youRank`) counts for their own department, whatever
// the board says, so their department is always there to find.
function boardInsights(board, youDept, youRank) {
  const all = [board.podium.first, board.podium.second, board.podium.third, ...board.rows].filter(Boolean);
  const byDept = {};
  all.forEach((r) => {
    const dept = youDept && r.rank === youRank ? youDept : r.dept;
    const d = byDept[dept] || (byDept[dept] = { pts: 0, np: 0, n: 0 });
    if (!r.hidden) { // a live row below zero comes without points
      d.pts += toNum(r.pts);
      d.np += 1;
    }
    d.n += 1;
  });
  const ranked = Object.entries(byDept)
    .map(([dept, d]) => ({ dept, avg: d.np ? Math.round(d.pts / d.np) : 0, n: d.n }))
    .sort((a, b) => b.avg - a.avg || a.dept.localeCompare(b.dept))
    .map((d, i) => ({
      rank: i + 1,
      name: d.dept,
      initials: DEPT_CODE[d.dept] || d.dept.slice(0, 3).toUpperCase(),
      dept: `${d.n.toLocaleString()} ${d.n === 1 ? 'person' : 'people'}`,
      pts: d.avg.toLocaleString(),
      move: ((d.dept.length * 7 + d.n * 3 + all.length) % 7) - 3, // sample week-on-week movement
    }));
  return {
    deptPodium: ranked.length >= 3 ? { first: ranked[0], second: ranked[1], third: ranked[2] } : null,
    deptRows: ranked.slice(3),
    deptTotal: ranked.length,
    youDept: ranked.find((d) => d.name === youDept) || null,
  };
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

const SPARKLES = [
  { top: -10, left: -16, s: 12, d: 0 },
  { top: -14, right: -10, s: 9, d: 0.6 },
  { bottom: -2, right: -18, s: 10, d: 1.2 },
];

// A level the viewer may not see (below zero, someone else's): a dashed,
// locked shield in the badge's place.
const PrivateLevel = ({ size = 30 }) => (
  <span
    role="img"
    aria-label="Level private"
    data-below-zero-hidden
    style={{ width: size + 8, height: size + 8, borderRadius: 999, border: '1.5px dashed var(--muted)', display: 'grid', placeItems: 'center', opacity: 0.75, flexShrink: 0 }}
  >
    <svg width={size * 0.56} height={size * 0.62} viewBox="0 0 18 20" fill="none" aria-hidden>
      <path d="M9 1 L16.5 4 V9.5 C16.5 14 13.4 17.3 9 19 C4.6 17.3 1.5 14 1.5 9.5 V4 Z" stroke="var(--muted)" strokeWidth="1.5" />
      <rect x="6" y="8.6" width="6" height="5" rx="1" fill="var(--muted)" />
      <path d="M7.3 8.6 V7.4 A1.7 1.7 0 0 1 10.7 7.4 V8.6" stroke="var(--muted)" strokeWidth="1.3" />
    </svg>
  </span>
);

// A badge you can click to open it in All badges.
// `headroom` lets the picture's clear top run up out of the button.
const BadgeButton = ({ level, size, who, onOpen, float = false, glow = false, headroom = 1 }) => (
  <button
    type="button"
    className="lb-badge-btn"
    onClick={() => onOpen(level, who)}
    aria-label={`${who ? `${who}: ` : ''}${levelAltText(level)}. See all badges`}
    title={`${gradeName(level)} · ${rangeText(level)}. Click to see all badges`}
    style={{ position: 'relative', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', lineHeight: 0, display: 'grid', placeItems: 'center' }}
  >
    <span className={float ? 'vs-float' : undefined} style={{ display: 'block', marginTop: -Math.round(size * (headroom - 1)) }}>
      <LevelBadge level={level} size={Math.round(size * headroom)} glow={glow} tilt={false} decorative style={float ? { filter: 'drop-shadow(0 10px 12px rgba(40,20,0,0.30))' } : undefined} />
    </span>
  </button>
);

const ShieldPts = () => (
  <svg width="12" height="14" viewBox="0 0 18 20" aria-hidden style={{ flexShrink: 0 }}>
    <path d="M9 1 L16.5 4 V9.5 C16.5 14 13.4 17.3 9 19 C4.6 17.3 1.5 14 1.5 9.5 V4 Z" fill="#E2A931" stroke="#9A6B0E" strokeWidth="1.2" />
    <path d="M9 5.6 L10.3 8.4 L13.2 8.7 L11 10.7 L11.6 13.6 L9 12.1 L6.4 13.6 L7 10.7 L4.8 8.7 L7.7 8.4 Z" fill="#FFF3C4" />
  </svg>
);

// Points, in a gold plate. Nothing at all when the total is below zero and
// not the viewer's to see.
const PointsPlate = ({ pts, hidden, big = false }) => (hidden ? null : (
  <span
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, height: big ? 26 : 24, padding: '0 9px 0 6px', borderRadius: 8,
      background: 'var(--pts-bg)', border: '1px solid var(--pts-line)', whiteSpace: 'nowrap',
    }}
  >
    <ShieldPts />
    <span className="vs-rank" style={{ fontSize: big ? 13.5 : 12.5, fontWeight: 800, lineHeight: 1, color: 'var(--pts-ink)' }}>
      {pts}
    </span>
  </span>
));

// A department's crest, standing in for a badge: a shield in the podium's
// gold, silver or bronze (steel in the list), with its people and its short
// code. `shine` sweeps a band of light across it now and then; `compact`
// (list sizes) drops the people and lets the code fill the shield.
const CREST = {
  gold: { stops: ['#FBE08A', '#E9B949', '#B98420'], edge: '#8F620C', ink: '#4A3400', rim: 'rgba(255,255,255,0.45)' },
  silver: { stops: ['#F8F9FB', '#CDD3DC', '#98A2AE'], edge: '#727D8A', ink: '#2F3742', rim: 'rgba(255,255,255,0.6)' },
  bronze: { stops: ['#F8D3AE', '#DE9A63', '#A9622F'], edge: '#80461C', ink: '#43200A', rim: 'rgba(255,255,255,0.4)' },
  steel: { stops: ['#F4F6F8', '#DADFE6', '#B8C0CB'], edge: '#9AA5B3', ink: '#334155', rim: 'rgba(255,255,255,0.7)' },
  steelDark: { stops: ['#4D535D', '#383D45', '#282C32'], edge: '#5E6673', ink: '#E2E8F0', rim: 'rgba(255,255,255,0.10)' },
};
const SHIELD = 'M50 3 L93 18 V57 C93 85 74 103 50 113 C26 103 7 85 7 57 V18 Z';

const DeptCrest = ({ code, size, metal = 'steel', edge, shine = false, compact = false }) => {
  const id = useId().replace(/:/g, '');
  const c = CREST[metal];
  const text = String(code || '').slice(0, 3);
  return (
    <svg width={Math.round(size * 0.86)} height={size} viewBox="0 0 100 116" aria-hidden style={{ display: 'block', overflow: 'visible', filter: 'drop-shadow(0 6px 8px rgba(15,23,42,0.22))' }}>
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.stops[0]} />
          <stop offset="0.5" stopColor={c.stops[1]} />
          <stop offset="1" stopColor={c.stops[2]} />
        </linearGradient>
        <clipPath id={`${id}c`}><path d={SHIELD} /></clipPath>
      </defs>
      <path d={SHIELD} fill={`url(#${id}g)`} stroke={edge || c.edge} strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 14 L83 26 V57 C83 79 68 93 50 101 C32 93 17 79 17 57 V26 Z" fill="none" stroke={c.rim} strokeWidth="3" />
      {!compact && (
        <g fill={c.ink} opacity="0.72">
          <circle cx="41" cy="33" r="5.5" />
          <circle cx="59" cy="33" r="5.5" />
          <path d="M31 48 C31 41.5 35.5 39 41 39 C46.5 39 51 41.5 51 48 Z" />
          <path d="M49 48 C49 41.5 53.5 39 59 39 C64.5 39 69 41.5 69 48 Z" />
        </g>
      )}
      <text
        x="50"
        y={compact ? 72 : 81}
        textAnchor="middle"
        fontFamily="'Vodafone ExB', 'Vodafone', 'Montserrat', sans-serif"
        fontWeight="800"
        fontSize={compact ? (text.length > 2 ? 30 : 38) : text.length > 2 ? 22 : 27}
        fill={c.ink}
      >
        {text}
      </text>
      {shine && (
        <g clipPath={`url(#${id}c)`}>
          <rect className="lb-shine" x="0" y="-10" width="26" height="136" fill="rgba(255,255,255,0.5)" />
        </g>
      )}
    </svg>
  );
};

const Pedestal = ({ person: p, place, reduce, level, hidden, dept = false, isDark, onBadge }) => {
  const c = PLACE[place];
  const m = METAL[c.metal];
  const [fill, ink] = m[isDark ? 'dark' : 'light'];
  const first = place === 'first';
  const crest = dept && !level; // a department: its crest stands where a badge would
  const flair = first && !reduce && Boolean(level || crest); // sparkles round the champion
  return (
    <motion.div
      initial={reduce ? false : { y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 150, damping: 17, delay: c.delay }}
      style={{ width: c.w, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center', height: c.badge, width: c.w }}>
        {(level || crest) && (
          <>
            <span
              aria-hidden
              className="vs-rays"
              style={{
                position: 'absolute', left: '50%', top: '50%', width: c.halo, height: c.halo, marginLeft: -c.halo / 2, marginTop: -c.halo / 2, borderRadius: 999, pointerEvents: 'none',
                background: `repeating-conic-gradient(${m.ray} 0deg 5deg, transparent 5deg 15deg)`,
                WebkitMaskImage: 'radial-gradient(circle, #000 28%, transparent 68%)', maskImage: 'radial-gradient(circle, #000 28%, transparent 68%)',
              }}
            />
            <span
              aria-hidden
              style={{ position: 'absolute', left: '50%', top: '50%', width: c.halo * 0.7, height: c.halo * 0.7, marginLeft: -c.halo * 0.35, marginTop: -c.halo * 0.35, borderRadius: 999, pointerEvents: 'none', background: `radial-gradient(circle, ${m.glow} 0%, transparent 70%)` }}
            />
          </>
        )}
        {flair && SPARKLES.map((sp, i) => (
          <motion.span
            key={i}
            aria-hidden
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut', delay: sp.d }}
            style={{ position: 'absolute', top: sp.top !== undefined ? sp.top + 6 : undefined, left: sp.left !== undefined ? sp.left + 58 : undefined, right: sp.right !== undefined ? sp.right + 58 : undefined, bottom: sp.bottom, lineHeight: 0 }}
          >
            <svg width={sp.s} height={sp.s} viewBox="0 0 24 24" fill={MEDAL.first}><path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" /></svg>
          </motion.span>
        ))}
        {level ? (
          <BadgeButton level={level} size={c.badge} who={p.name} onOpen={onBadge} float={!reduce} headroom={BADGE_HEADROOM} />
        ) : hidden ? (
          <PrivateLevel size={Math.round(c.badge * 0.5)} />
        ) : crest ? (
          <span role="img" aria-label={`${p.name} crest`} className={reduce ? undefined : 'vs-float'} style={{ display: 'block', position: 'relative' }}>
            <DeptCrest code={p.initials} size={c.badge} metal={c.metal} shine={!reduce} />
          </span>
        ) : (
          <Avatar initials={p.initials} size={c.av} ring={MEDAL[place]} />
        )}
      </span>
      <div style={{ fontSize: first ? 13.5 : 12.5, fontWeight: 800, marginTop: 4, textAlign: 'center', lineHeight: 1.15, color: 'var(--text)' }}>{p.name}</div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', marginTop: 1 }}>{p.dept}</div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 5 }}>
        <PointsPlate pts={p.pts} hidden={hidden} big={first} />
      </div>
      <div
        style={{
          width: '100%', height: c.h, marginTop: 8, background: fill,
          borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isDark ? 'inset 0 2px 0 rgba(255,255,255,0.12)' : 'inset 0 2px 0 rgba(255,255,255,0.7), inset 0 -10px 16px rgba(0,0,0,0.08)',
        }}
      >
        <span className="vs-rank" style={{ fontSize: c.num, fontWeight: 800, color: ink, lineHeight: 1, textShadow: isDark ? 'none' : '0 1px 0 rgba(255,255,255,0.6)' }}>{NUMERAL[place]}</span>
      </div>
    </motion.div>
  );
};

// This week's move, under the rank: up / down with the places, or a dash.
const Move = ({ n }) => {
  if (!n) return <span className="lb-mono" aria-label="No change this week" style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>—</span>;
  const up = n > 0;
  return (
    <span
      aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(n)} this week`}
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1, fontSize: 9.5, fontWeight: 800, lineHeight: 1, color: up ? 'var(--t-green)' : 'var(--t-red)' }}
    >
      <svg width="10" height="8" viewBox="0 0 14 12" aria-hidden><path d={up ? 'M7 1 L13 11 H1 Z' : 'M7 11 L13 1 H1 Z'} fill="currentColor" /></svg>
      <span className="lb-mono">{Math.abs(n)}</span>
    </span>
  );
};

// A ranked row: rank and move, the badge (an avatar for departments), the
// person with their level, the rates, the points.
const RankRow = ({ r, you, level, hidden, people, isDark, onBadge }) => (
  <div
    data-lb-row={r.rank}
    className="lb-row"
    style={{
      height: ROW_H, flexShrink: 0,
      background: you ? 'var(--base)' : 'var(--row)',
      border: you ? '1.5px solid var(--you)' : '1px solid var(--row-hair)',
      borderRadius: 12, display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center',
      padding: `0 ${ROW_PAD}px`, boxShadow: you ? 'var(--you-glow)' : 'none',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span
        className="vs-rank"
        style={{ minWidth: 34, height: 30, padding: '0 6px', boxSizing: 'border-box', borderRadius: 9, display: 'grid', placeItems: 'center', fontSize: 12.5, fontWeight: 800, lineHeight: 1, background: you ? 'var(--you)' : 'var(--plate)', color: you ? 'var(--you-ink)' : 'var(--text)' }}
      >
        {r.rank}
      </span>
      <Move n={r.move} />
    </div>
    <div data-row-level={people ? (level ? level.id : 'hidden') : undefined} style={{ display: 'grid', placeItems: 'center' }}>
      {!people ? (
        <DeptCrest code={r.initials} size={36} compact metal={isDark ? 'steelDark' : 'steel'} edge={you ? (isDark ? '#F8FAFC' : '#E60000') : undefined} />
      ) : level ? (
        <BadgeButton level={level} size={38} who={you ? null : r.name} onOpen={onBadge} glow={isDark ? 'dark' : true} />
      ) : (
        <PrivateLevel size={28} />
      )}
    </div>
    <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
      <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.dept}</span>
    </span>
    <div style={{ justifySelf: 'end' }}>
      <PointsPlate pts={r.pts} hidden={hidden} />
    </div>
  </div>
);

// People / Departments switch for the podium, at the top of the sheet's arm.
const STAGES = [{ id: 'people', label: 'Top people' }, { id: 'depts', label: 'Top departments' }];

const StageSwitch = ({ value, onChange, canDepts }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <div role="tablist" aria-label="Podium" style={{ display: 'inline-flex', padding: 4, gap: 2, borderRadius: 999, background: 'var(--track)' }}>
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
              height: 34, padding: '0 18px', borderRadius: 999, border: 'none', cursor: on ? 'default' : 'pointer',
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
  fontSize: 10.5, fontWeight: 800,
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
      <span key={p} style={{ minWidth: 18, textAlign: 'center', fontSize: 10.5, fontWeight: 800, color: 'var(--muted)' }}>…</span>
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

// Your standing, as a card with two sides, each laid out the same way: a line
// on top, then a figure, your badge or medal in the middle, and a figure, then
// a line below. The front is you: your name, your points, your badge and the
// points to your next badge, with the bar to it. Click the badge and the card
// turns over to your rank: this week's move, your place on a gold medal, how
// many are on the board (or your top %), and what moves you up next. The medal turns it round again. Nothing on
// the card says it turns: the badge and the medal lift a little under the
// pointer. No level or badge names on either side. The front's points are your
// own total (what your badge is earned with); the back's rank is on whichever
// board is showing, global or a campaign's.
const StandingCard = ({ name, initials, dept, pts, level, rank, total, move, badgeGoal, rankGoal, isDark }) => {
  const [flipped, setFlipped] = useState(false);
  const turn = () => setFlipped((f) => !f);
  const topPct = rank && total ? Math.max(1, Math.ceil((rank / total) * 100)) : null;
  // the line under the medal: what moves you up next
  const next = !rank ? 'Report a phishing email to get on the board'
    : rank === 1 ? 'You lead the board. Keep it up to stay first'
      : rankGoal ? `${rankGoal.pts.toLocaleString()} ${rankGoal.pts === 1 ? 'pt' : 'pts'} to overtake ${rankGoal.place}${ordinalSuffix(rankGoal.place)} place`
        : 'Every report moves you up';
  const up = move > 0;
  const face = {
    position: 'absolute', inset: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between',
    padding: '9px 16px 11px', background: 'var(--cap-standing)', border: '1px solid var(--standing-edge)', borderRadius: L_R, boxShadow: 'var(--standing-shadow)',
    overflow: 'hidden', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
  };
  const line = { fontSize: 10, fontWeight: 700, color: 'var(--standing-ink)', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 };
  const middle = { display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', columnGap: 10 };
  const fig = (value, unit, note, color = 'var(--text)', align = 'left') => (
    <div style={{ minWidth: 0, textAlign: align }}>
      <div className="vs-rank" style={{ fontSize: 17, fontWeight: 900, color, lineHeight: 1, whiteSpace: 'nowrap' }}>
        {value}{unit && <span style={{ fontSize: 9, fontWeight: 800, marginLeft: 2 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--muted)', marginTop: 4, lineHeight: 1.2 }}>{note}</div>
    </div>
  );
  const suffix = rank ? ordinalSuffix(rank) : '';
  return (
    <div data-lb-standing={flipped ? 'rank' : 'badge'} style={{ flexShrink: 0, height: HERO_H, marginBottom: 10, perspective: 1100 }}>
      <div className="lb-flip" style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'none' }}>

        {/* front: you and your badge */}
        <div data-lb-face="badge" inert={flipped} style={face}>
          <div style={line}>
            <span style={{ color: 'var(--text)', fontWeight: 800 }}>{name}</span>
            {dept && <span style={{ fontWeight: 600 }}> · {dept}</span>}
          </div>
          <div style={middle}>
            {fig(pts, 'pts', 'Your points')}
            <button
              type="button"
              className="lb-hero-badge"
              onClick={turn}
              aria-label={`Your badge${level ? `: ${levelAltText(level)}` : ''}. Show your rank`}
              style={{
                position: 'relative', width: 84, height: 80, border: 0, padding: 0, margin: 0, borderRadius: 999, cursor: 'pointer',
                background: level ? `radial-gradient(closest-side, ${level.color}${isDark ? '59' : '38'}, transparent 80%)` : 'transparent',
                display: 'grid', placeItems: 'center',
              }}
            >
              {level
                ? <LevelBadge level={level} size={78} tilt={false} glow={isDark ? 'dark' : true} decorative />
                : <Avatar initials={initials} size={52} you />}
            </button>
            {badgeGoal && (badgeGoal.isTop
              ? fig('Top', '', 'Badge reached', 'var(--standing-num)', 'right')
              : fig(badgeGoal.toNext.toLocaleString(), 'pts', 'To next badge', 'var(--standing-num)', 'right'))}
          </div>
          {badgeGoal ? (
            <div role="progressbar" aria-label={badgeGoal.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={badgeGoal.pct} style={{ height: 4, borderRadius: 999, background: 'var(--standing-track)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${badgeGoal.pct}%`, background: 'linear-gradient(90deg,#E8B30B,#F6D06B)', borderRadius: 999 }} />
            </div>
          ) : <span />}
        </div>

        {/* back: your rank */}
        <div data-lb-face="rank" inert={!flipped} style={{ ...face, transform: 'rotateY(180deg)' }}>
          <div style={{ ...line, fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Your rank</div>
          <div style={middle}>
            {move
              ? fig(
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points={up ? '6 15 12 9 18 15' : '6 9 12 15 18 9'} /></svg>
                  {Math.abs(move)}
                </span>,
                '', up ? 'Up this week' : 'Down this week', up ? 'var(--t-green)' : 'var(--t-red)')
              : fig('—', '', 'Same as last week', 'var(--muted)')}
            <button
              type="button"
              className="lb-hero-badge"
              onClick={turn}
              aria-label={rank ? `Rank ${rank}. Show your badge` : 'Show your badge'}
              style={{ width: 84, height: 80, border: 0, padding: 0, margin: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
            >
              <span style={{ width: 76, height: 76, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'conic-gradient(from 210deg, #F6D06B, #E8B30B, #B8860B, #E8B30B, #F6D06B)', boxShadow: '0 5px 12px rgba(184,134,11,0.28)' }}>
                <span style={{ width: 63, height: 63, borderRadius: 999, background: 'var(--standing-medal-in)', display: 'grid', placeItems: 'center', lineHeight: 1 }}>
                  <span className="lb-exb" style={{ fontSize: rank && rank > 99 ? 19 : 23, color: 'var(--standing-num)', whiteSpace: 'nowrap' }}>
                    {rank || '—'}<span style={{ fontSize: 10, marginLeft: 1 }}>{suffix}</span>
                  </span>
                </span>
              </span>
            </button>
            {rank && rank > 1 && topPct <= 50
              ? fig(`Top ${topPct}%`, '', `Of ${total.toLocaleString()} colleagues`, 'var(--standing-num)', 'right')
              : fig(total ? total.toLocaleString() : '—', '', 'On the board', 'var(--standing-num)', 'right')}
          </div>
          <div style={{ ...line, color: 'var(--text)' }}>{next}</div>
        </div>
      </div>
    </div>
  );
};

const Leaderboard = () => {
  const { isDark, user, hasAccess } = useUserType() || {};
  const navigate = useNavigate();
  // My Campaigns is for every role but Regular User, who sees Global only.
  const canCampaigns = Boolean(hasAccess && hasAccess('leaderboard-campaigns'));
  const reduce = useReducedMotion();
  const rules = useGamificationRules();
  const mine = useMyStanding(); // the viewer's points, rank and level
  const globalBoard = useGlobalBoard(mine.email, user?.role, mine.rank);
  const viewerRole = user?.role;
  const youDept = mine.department || user?.Department || '';
  const [badges, setBadges] = useState(null); // All badges: null, or { selected, subject }
  const closeBadges = useCallback(() => setBadges(null), []);
  // A badge on the board: open it in All badges, saying whose it is.
  const openBadge = useCallback((level, who) => setBadges({ selected: level.id, subject: who ? { name: who, levelId: level.id } : null }), []);
  const [pickedView, setView] = useState('global'); // 'global' | 'campaign'
  const view = canCampaigns ? pickedView : 'global';
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
      return { board: globalBoard, youRank: globalBoard.youRank, counter: globalBoard.total.toLocaleString(), counterLabel: 'participants', title: 'Global Leaderboard', sub: 'Everyone ranked across every campaign · all time', live: false };
    }
    return {
      board: buildBoard(campaign.seed, campaign.total), youRank: campaign.youRank,
      counter: campaign.total.toLocaleString(), counterLabel: 'recipients', title: campaign.name,
      sub: `${campaign.type} · started ${campaign.started}`, live: true,
    };
  }, [view, campaign, globalBoard]);

  const youRow = useMemo(() => {
    const { podium: top, rows } = scope.board; // the viewer may be on the podium
    const base = [top.first, top.second, top.third, ...rows].find((r) => r && r.rank === scope.youRank) || { rank: scope.youRank, pts: '—' };
    // The week's movement is sample-only; a live board doesn't track it yet.
    return { ...base, name: youName, dept: youDept || base.dept, initials: youInitials, move: scope.board.sample === false ? base.move || 0 : 3, levelId: mine.level?.id || base.levelId };
  }, [scope, youName, youInitials, youDept, mine.level]);

  const insights = useMemo(() => boardInsights(scope.board, youDept, scope.youRank), [scope, youDept]);
  // Which podium the stage shows; falls back to people if departments can't be ranked.
  const podium = stage === 'depts' && insights.deptPodium
    ? { id: 'depts', board: insights.deptPodium }
    : { id: 'people', board: scope.board.podium };

  // The badge this viewer may see on a row (none on department rows), and
  // whether a total below zero is hidden from them ("Below 0", private badge).
  const levelOf = (row, isYou) => (podium.id === 'people' && row ? visibleLevel(row.levelId, { isSelf: isYou, viewerRole }) : null);
  const belowZeroHidden = (row, isYou) => Boolean(row) && !visibleLevel(row.levelId, { isSelf: isYou, viewerRole }) && (row.hidden || toNum(row.pts) < 0);
  const hiddenOf = (row, isYou) => podium.id === 'people' && belowZeroHidden(row, isYou);

  // Standing vs the person one place above — a small goal + progress bar.
  const standing = useMemo(() => {
    const { podium, rows } = scope.board;
    const above = scope.youRank - 1 <= 3
      ? [podium.first, podium.second, podium.third][scope.youRank - 2]
      : rows[scope.youRank - 1 - FIRST_LIST_RANK];
    // No goal when the person above is below zero and theirs isn't ours to see
    // (the gap would give their points away).
    const hiddenAbove = above && !visibleLevel(above.levelId, { viewerRole }) && (above.hidden || toNum(above.pts) < 0);
    const known = hiddenAbove ? null : above;
    const youPts = toNum(youRow.pts);
    const abovePts = known ? toNum(known.pts) : youPts;
    return {
      toNext: known ? Math.max(0, abovePts - youPts) : 0,
      fillPct: abovePts > 0 ? Math.min(100, Math.round((youPts / abovePts) * 100)) : 100,
      nextRank: scope.youRank - 1,
    };
  }, [scope, youRow, viewerRole]);

  // Your standing's goals: the next badge (front of the card, from your own
  // points, always known to you) and the next place (back of the card, when
  // the person above can be shown).
  const badgeGoal = useMemo(() => {
    const pr = mine.level ? progressFor(mine.points) : null;
    if (!pr) return null;
    if (pr.isTop) return { label: 'Top badge reached', pct: 100, isTop: true };
    return { label: `${pr.toNext.toLocaleString()} pts to your next badge`, pct: pr.pct, toNext: pr.toNext };
  }, [mine.level, mine.points]);
  // the points to overtake the place above, when that can be shown
  const rankGoal = standing.toNext > 0 ? { pts: standing.toNext, place: standing.nextRank } : null;

  // The ranked list follows the switch: people, or departments. Either way the
  // viewer is pinned in the footer (their own row, or their department's).
  const list = podium.id === 'depts'
    ? { rows: insights.deptRows, total: insights.deptTotal, noun: 'departments', you: insights.youDept, youRank: insights.youDept ? insights.youDept.rank : 0, units: 'avg pts' }
    : { rows: scope.board.rows, total: scope.board.total, noun: scope.counterLabel, you: scope.youRank ? youRow : null, youRank: scope.youRank || 0, units: 'pts' };

  // Pagination over ranks 4..N (1–3 are on the podium).
  const listRows = list.rows;
  const pageCount = Math.max(1, Math.ceil(listRows.length / rowsPerPage));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * rowsPerPage;
  const pageRows = listRows.slice(pageStart, pageStart + rowsPerPage);
  const firstShown = pageRows.length ? pageRows[0].rank : 0;
  const lastShown = pageRows.length ? pageRows[pageRows.length - 1].rank : 0;

  const youOnPodium = list.youRank < FIRST_LIST_RANK;
  const youPage = youOnPodium ? -1 : Math.floor((list.youRank - FIRST_LIST_RANK) / rowsPerPage);
  const youVisible = youOnPodium || youPage === safePage;

  const vars = isDark
    ? { '--bg': 'transparent', '--base': '#1C1E24', '--rail': '#1C1E24', '--text': '#F1F5F9', '--muted': '#9AA6B2', '--hair': 'rgba(255,255,255,0.10)', '--track': 'rgba(255,255,255,0.12)', '--ink': '#F8FAFC', '--ink-on': '#0F172A', '--you': '#F8FAFC', '--you-ink': '#0F172A', '--you-avatar': '#0F172A', '--you-glow': '0 0 0 3px rgba(248,250,252,0.10)', '--chip': 'rgba(255,255,255,0.08)', '--t-green': '#4ADE80', '--t-red': '#F87171', '--t-gold': '#FBBF24', '--c-mint': '#0D271E', '--c-lav': '#22193E', '--c-peach': '#2E200C', '--cap-global': '#D8F3DC', '--cap-camp': '#E0E7FF', '--cap-standing': '#2E200C', '--standing-edge': 'rgba(255,255,255,0.10)', '--standing-shadow': 'none', '--standing-ink': '#F2C66B', '--standing-num': '#FBD46B', '--standing-track': 'rgba(242,198,107,0.18)', '--standing-plate': 'rgba(255,255,255,0.06)', '--standing-plate-edge': 'rgba(255,255,255,0.10)', '--standing-medal-in': '#241A08', '--row': 'rgba(255,255,255,0.03)', '--row-hair': 'rgba(255,255,255,0.07)', '--plate': 'rgba(255,255,255,0.08)', '--pts-bg': 'rgba(232,179,11,0.12)', '--pts-line': 'rgba(232,179,11,0.35)', '--pts-ink': '#FBD46B' }
    : { '--bg': '#F1F4F8', '--base': '#FFFFFF', '--rail': '#FFFFFF', '--text': '#0F172A', '--muted': '#64748B', '--hair': 'rgba(15,23,42,0.06)', '--track': '#EEF2F6', '--ink': '#0F172A', '--ink-on': '#FFFFFF', '--you': '#E60000', '--you-ink': '#FFFFFF', '--you-avatar': '#E60000', '--you-glow': '0 4px 12px rgba(230,0,0,0.12)', '--chip': 'rgba(255,255,255,0.72)', '--t-green': '#15803D', '--t-red': '#DC2626', '--t-gold': '#B07A12', '--c-mint': '#CEFBEA', '--c-lav': '#ECE8FF', '--c-peach': '#FFEFCE', '--cap-global': '#D8F3DC', '--cap-camp': '#E0E7FF', '--cap-standing': 'linear-gradient(135deg,#FFF3D6,#FFE6C7)', '--standing-edge': 'transparent', '--standing-shadow': '0 8px 20px rgba(232,179,11,0.16)', '--standing-ink': '#8A5A0A', '--standing-num': '#7A5B12', '--standing-track': 'rgba(176,122,18,0.18)', '--standing-plate': 'rgba(255,255,255,0.75)', '--standing-plate-edge': 'rgba(176,122,18,0.22)', '--standing-medal-in': '#FFFFFF', '--row': '#FFFFFF', '--row-hair': 'rgba(15,23,42,0.08)', '--plate': '#F1F2F5', '--pts-bg': 'linear-gradient(180deg,#FFF8E2,#FFEFC2)', '--pts-line': '#EBCB78', '--pts-ink': '#3F3000' };

  // A scope capsule: a switch between Global and My Campaigns, or, with Global
  // the only view (Regular Users), a plain title card.
  const railCapsule = (id, label, sub, art, activeColor) => {
    const selected = view === id;
    const Cap = canCampaigns ? 'button' : 'div';
    const capProps = canCampaigns
      ? { type: 'button', className: 'lb-cap', 'aria-pressed': selected, onClick: () => chooseView(id) }
      : { className: 'lb-cap lb-cap-only' };
    return (
      <Cap
        {...capProps}
        style={{
          position: 'relative', overflow: 'hidden', textAlign: 'left', cursor: canCampaigns ? 'pointer' : 'default', width: '100%', flexShrink: 0,
          borderRadius: L_R, padding: '16px 16px 18px', marginBottom: 10, minHeight: 96,
          border: selected ? '1px solid transparent' : '1px solid var(--hair)',
          background: selected ? (isDark ? '#FFFFFF' : id === 'global' ? 'var(--cap-global)' : 'var(--cap-camp)') : 'var(--rail)',
          boxShadow: selected ? '0 8px 18px rgba(15,23,42,0.10)' : 'none', color: 'var(--text)',
        }}
      >
        <div style={{ position: 'relative', fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em', color: selected ? (isDark ? '#0F172A' : activeColor) : 'var(--text)' }}>{label}</div>
        <div style={{ position: 'relative', fontSize: 9.5, fontWeight: 600, color: selected && isDark ? '#475569' : 'var(--muted)', marginTop: 4, lineHeight: 1.35, maxWidth: 170 }}>{sub}</div>
        <img className="lb-art" src={art} alt="" aria-hidden style={{ position: 'absolute', bottom: -8, right: -8, width: 56, height: 56, objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }} />
      </Cap>
    );
  };

  return (
    <>
      <style>{FONT_IMPORT}</style>

      {/* Fills <main> exactly; nothing inside lets the page itself scroll. */}
      <div className="lb-page" style={{ ...vars, '--accent': '#E60000', position: 'relative', background: 'var(--bg)', color: 'var(--text)', width: '100%', height: '100%', overflow: 'hidden', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        <AnimatePresence>
          {badges && (
            <AllBadges
              key="all-badges"
              current={mine.level}
              points={mine.level ? mine.points : null}
              rank={mine.rank}
              total={mine.total}
              selected={badges.selected}
              subject={badges.subject}
              isDark={isDark}
              onClose={closeBadges}
            />
          )}
        </AnimatePresence>

        {/* top black bar */}
        <div style={{ background: isDark ? '#FFFFFF' : '#000000', color: isDark ? '#000000' : '#FFFFFF', borderRadius: 12, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 0 18px', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.09em', textTransform: 'uppercase' }}>Leaderboard</span>
          <button
            type="button"
            data-lb-back
            onClick={() => navigate('/my-space')}
            aria-label="Back to My Space"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px', borderRadius: 8, border: isDark ? '1px solid rgba(15,23,42,0.18)' : '1px solid rgba(255,255,255,0.2)', background: isDark ? 'rgba(15,23,42,0.05)' : 'rgba(255,255,255,0.08)', color: 'inherit', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            My Space
          </button>
        </div>

        {/* two-column workspace */}
        <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>

          {/* LEFT RAIL */}
          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            <StandingCard
              name={youName}
              initials={youInitials}
              dept={youRow.dept}
              pts={mine.level ? Number(mine.points).toLocaleString('en-US') : youRow.pts}
              level={mine.level}
              rank={scope.youRank}
              total={scope.board.total}
              move={youRow.move}
              badgeGoal={badgeGoal}
              rankGoal={rankGoal}
              isDark={isDark}
            />

            {railCapsule('global', 'Global Leaderboard', 'Everyone, every campaign, all time', GlobalTrophy, isDark ? '#4ADE80' : '#15803D')}
            {canCampaigns && railCapsule('campaign', 'My Campaigns', 'Live ranking inside each campaign', CampaignMegaphone, isDark ? '#A5B4FC' : '#4F46E5')}

            {/* Global view: how points are earned, read live from the Gamification Engine */}
            {view === 'global' && (
              <div className="lb-rules" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--rail)', border: '1px solid var(--hair)', borderRadius: L_R, padding: '14px 16px', overflow: 'hidden' }}>
                <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>How to earn points</span>
                <div style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', marginTop: 2, marginBottom: 6 }}>
                  {rules.error ? 'Live rules unavailable right now' : 'Live from the Gamification Engine'}
                </div>
                <div style={{ flex: 1, minHeight: 0, maxHeight: 420, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {RULES.map((rule) => {
                    const v = rules.points[rule.event];
                    const tone = v > 0 ? 'var(--t-green)' : v < 0 ? 'var(--t-red)' : 'var(--muted)';
                    const tint = v > 0 ? 'var(--c-mint)' : v < 0 ? 'var(--c-peach)' : 'var(--track)';
                    return (
                      <div key={rule.event} className="lb-rule" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--hair)' }}>
                        <span className="lb-rule-ico" style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 10, background: tint, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <rule.Icon size={16} strokeWidth={2.3} />
                        </span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rule.label}</div>
                          <div className="lb-rule-desc" style={{ fontSize: 9, fontWeight: 600, color: 'var(--muted)', marginTop: 1 }}>{rule.desc}</div>
                        </div>
                        <span className="lb-mono" style={{ flexShrink: 0, minWidth: 48, textAlign: 'center', fontSize: 11.5, fontWeight: 800, color: tone, background: tint, borderRadius: 999, padding: '4px 8px' }}>
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
                <div style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', padding: '2px 4px 8px' }}>
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
                          ...(sel && isDark ? PASTEL_INK : null),
                          border: sel ? '1.5px solid #818CF8' : '1px solid var(--hair)',
                          background: sel ? (isDark ? '#FFFFFF' : 'var(--cap-camp)') : 'var(--rail)', color: 'var(--text)',
                          boxShadow: sel ? '0 4px 12px rgba(129,140,248,0.18)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A', flexShrink: 0, marginTop: 4 }} />
                          <span style={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.25 }}>{c.name}</span>
                        </div>
                        <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', marginTop: 3, paddingLeft: 13 }}>{c.type} · {c.total.toLocaleString()} recipients</div>
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
            <div style={{ ...(isDark ? PASTEL_INK : null), position: 'absolute', top: 0, left: 0, width: CAP_W, height: CAP_H, zIndex: 2, padding: '0 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, background: view === 'global' ? 'var(--cap-global)' : 'var(--cap-camp)', borderRadius: L_R, overflow: 'hidden' }}>
              {scope.live && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: '#16A34A' }} />
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t-green)' }}>Live now</span>
                </div>
              )}
              <div style={{ fontSize: view === 'global' ? 14 : 13, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.16, color: 'var(--text)' }}>{scope.title}</div>
              <div style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', lineHeight: 1.35, maxWidth: 196 }}>{scope.sub}</div>
              <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 2, padding: '4px 10px', borderRadius: 999, background: 'var(--chip)', fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>
                <Users size={13} strokeWidth={2.4} />
                <span className="lb-mono" style={{ fontWeight: 800, color: 'var(--text)' }}>{scope.counter}</span>
                {scope.counterLabel}
              </span>
            </div>

            {/* concave fillet joining the arm to the base, following the capsule's corner */}
            <svg aria-hidden width={FILLET} height={FILLET} viewBox={`0 0 ${FILLET} ${FILLET}`} style={{ position: 'absolute', top: CAP_H - L_R, left: CAP_W - L_R, zIndex: 1, display: 'block' }}>
              <path d={`M 0 ${FILLET} A ${FILLET} ${FILLET} 0 0 0 ${FILLET} 0 V ${FILLET} H 0 Z`} fill="var(--base)" />
            </svg>

            {/* top-right arm of the L: the podium switch, on the sheet's centre line */}
            <div style={{ marginLeft: CAP_W + L_GAP, height: CAP_H + L_GAP, flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '18px 24px 0', background: 'var(--base)', borderTop: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderRadius: `${L_R}px ${L_R}px 0 0` }}>
              {/* the arm starts CAP_W + L_GAP in, so pull back by half that to centre on the whole sheet */}
              <div style={{ transform: `translateX(-${(CAP_W + L_GAP) / 2}px)` }}>
                <StageSwitch
                  value={podium.id}
                  onChange={(id) => { setStage(id); setPage(0); }}
                  canDepts={Boolean(insights.deptPodium)}
                />
              </div>
            </div>

            {/* lower base of the L: podium, ranked list, footer */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--base)', borderLeft: '1px solid var(--hair)', borderRight: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', borderRadius: `${L_R}px 0 ${L_R}px ${L_R}px` }}>

              {/* podium, centred on the sheet and lit from below: top people, or top departments via the switch */}
              <div data-podium style={{ flexShrink: 0, marginTop: -STAGE_RAISE, padding: '0 24px 10px', background: 'radial-gradient(34% 92% at 50% 100%, rgba(232,179,11,0.12), transparent 72%)' }}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${podium.id}-${view}-${campaignId}`}
                    initial={reduce ? false : { opacity: 0, x: podium.id === 'depts' ? 24 : -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, x: podium.id === 'depts' ? -24 : 24 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 22 }}
                  >
                    {podium.board.second && <Pedestal person={podium.board.second} place="second" reduce={reduce} dept={podium.id === 'depts'} isDark={isDark} onBadge={openBadge} level={levelOf(podium.board.second, podium.board.second.rank === list.youRank)} hidden={hiddenOf(podium.board.second, podium.board.second.rank === list.youRank)} />}
                    {podium.board.first && <Pedestal person={podium.board.first} place="first" reduce={reduce} dept={podium.id === 'depts'} isDark={isDark} onBadge={openBadge} level={levelOf(podium.board.first, podium.board.first.rank === list.youRank)} hidden={hiddenOf(podium.board.first, podium.board.first.rank === list.youRank)} />}
                    {podium.board.third && <Pedestal person={podium.board.third} place="third" reduce={reduce} dept={podium.id === 'depts'} isDark={isDark} onBadge={openBadge} level={levelOf(podium.board.third, podium.board.third.rank === list.youRank)} hidden={hiddenOf(podium.board.third, podium.board.third.rank === list.youRank)} />}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* column header */}
              <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: `8px ${24 + 1 + ROW_PAD}px 8px`, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 800 }}>
                <div>Rank</div>
                <div style={{ textAlign: 'center' }}>{podium.id === 'depts' ? '' : 'Level'}</div>
                <div>{podium.id === 'depts' ? 'Department' : 'Person'}</div>
                <div style={{ textAlign: 'right' }}>{podium.id === 'depts' ? 'Avg. points' : 'Points'}</div>
              </div>

              {/* ranked list — one page at a time, sized to fit */}
              <div ref={listRef} style={{ flex: 1, minHeight: 0, overflow: 'hidden', margin: '0 24px' }}>
                <motion.div
                  key={`${podium.id}-${view}-${campaignId}-${safePage}`}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  style={{ display: 'flex', flexDirection: 'column', gap: ROW_GAP }}
                >
                  {pageRows.map((r) => {
                    const isYou = r.rank === list.youRank;
                    const row = isYou ? list.you : r;
                    return (
                      <RankRow
                        key={r.rank}
                        r={row}
                        you={isYou}
                        people={podium.id === 'people'}
                        isDark={isDark}
                        onBadge={openBadge}
                        level={levelOf(row, isYou)}
                        hidden={hiddenOf(row, isYou)}
                      />
                    );
                  })}
                </motion.div>
              </div>

              {/* footer: the viewer's rank + their pill, which jumps to their page (left); pagination (right) */}
              <div data-lb-footer style={{ flexShrink: 0, borderTop: '1px solid var(--hair)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'var(--base)', borderRadius: `0 0 ${L_R - 1}px ${L_R - 1}px` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  {list.you && (
                    <>
                      <span className="lb-exb" style={{ fontSize: 20, lineHeight: 1, color: 'var(--you)', whiteSpace: 'nowrap' }}>
                        {list.youRank}<span style={{ fontSize: 11, marginLeft: 1 }}>{ordinalSuffix(list.youRank)}</span>
                      </span>
                      <button
                        type="button"
                        className="lb-me"
                        aria-disabled={youVisible}
                        aria-label={`${list.you?.name}, ${list.youRank}${ordinalSuffix(list.youRank)}${youVisible ? '' : `. Go to my ${podium.id === 'depts' ? "department's " : ''}rank`}`}
                        title={youVisible ? undefined : `Go to my ${podium.id === 'depts' ? "department's " : ''}rank`}
                        onClick={() => { if (!youVisible) setPage(youPage); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, border: '1.5px solid var(--you)', borderRadius: 999, padding: youVisible ? '4px 16px 4px 4px' : '4px 10px 4px 4px', background: 'var(--base)', color: 'var(--text)', cursor: youVisible ? 'default' : 'pointer' }}
                      >
                        {podium.id === 'people' && list.you?.levelId
                          ? <LevelBadge levelId={list.you.levelId} size={26} tilt={false} decorative />
                          : <DeptCrest code={list.you?.initials} size={26} compact metal={isDark ? 'steelDark' : 'steel'} edge={isDark ? '#F8FAFC' : '#E60000'} />}
                        <span style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{list.you?.name}</span>
                        <span className="vs-rank" style={{ fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap' }}>{list.you?.pts} <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)' }}>{list.units}</span></span>
                        {!youVisible && (
                          <span aria-hidden style={{ display: 'flex', color: 'var(--you)' }}><Chevron /></span>
                        )}
                      </button>
                
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    Ranks <span className="lb-mono" style={{ color: 'var(--text)', fontWeight: 800 }}>{firstShown}–{lastShown}</span> of {list.total.toLocaleString()} {list.noun}
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

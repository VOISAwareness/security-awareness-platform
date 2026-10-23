/**
 * Sample people and campaigns, shared by the Leaderboard (its boards and the
 * Big Picture) and Insights, until the server lists real campaigns.
 * Everything is fixed, so the same screen shows the same numbers every time.
 */

import { climate } from './sampleStory.js';

const FIRST = ['Aditi', 'David', 'Noura', 'Priya', 'Marco', 'Sara', 'Liang', 'Tom', 'Elena', 'Omar', 'Mei', 'Yuki',
  'Hassan', 'Lena', 'Raj', 'Sofia', 'Kwame', 'Ana', 'Ivan', 'Chloe', 'Ben', 'Fatima', 'Noah', 'Grace'];
const LAST = ['Rao', 'Kim', 'Ali', 'Nair', 'Bellini', 'Nasser', 'Wei', 'Okafor', 'Petrova', 'Haddad', 'Chen', 'Tanaka',
  'Mensah', 'Fischer', 'Patel', 'Rossi', 'Silva', 'Dubois', 'Carter', 'Zahra', 'Weber', 'Lee', 'Novak', 'Iyer'];
// The same departments as the people directory (MasterUserData.json), so a
// campaign's Top departments shows the company's departments, yours included.
export const DEPTS = [
  'AIDA', 'CARE', 'Finance Operations', 'Network Engineering', 'Supply Chain Management', 'Cyber Security',
  'Cloud Infrastructure', 'IT Operations', 'Procurement', 'Human Resources', 'Legal & Compliance', 'Sales & Enterprise',
  'Digital Products', 'Marketing & Communications', 'Executive Board', 'IT Security',
];

// 24 x 24 distinct first/last pairs (5 is coprime with 24, so no repeats
// until index 576).
export function person(i) {
  const a = i % FIRST.length;
  const b = Math.floor(i / FIRST.length);
  const first = FIRST[a];
  const last = LAST[(a + b * 5) % LAST.length];
  return { name: `${first} ${last}`, dept: DEPTS[(i * 7 + b) % DEPTS.length], initials: `${first[0]}${last[0]}` };
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

// 42 more so the rail has a realistic 50 ongoing campaigns to scroll through,
// one every two days back over the quarter, so 30, 60 and 90 days differ.
const MORE_CAMPAIGNS = Array.from({ length: LURES.length * REGIONS.length }, (_, k) => {
  const [lure, type] = LURES[k % LURES.length];
  const region = REGIONS[Math.floor(k / LURES.length)];
  const started = new Date(Date.UTC(2026, 8, 22 - 2 * k));
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

// What each campaign leans on to get a click, for Insights' motivators.
export const MOTIVATORS = Object.freeze(['Urgency', 'Authority', 'Reward', 'Curiosity', 'Fear']);
const motivated = (c, k) => ({ ...c, motivator: MOTIVATORS[(k * 3 + c.seed) % MOTIVATORS.length] });

const ONGOING = [...NAMED_CAMPAIGNS, ...MORE_CAMPAIGNS].map(motivated);

// Campaigns that ended, one every two days through the quarter before
// (from 30 Jun back), so Insights can set a period against the one before
// it and draw six months of trend. Not on the Leaderboard's lists.
const ENDED = Array.from({ length: LURES.length * REGIONS.length + 4 }, (_, k) => {
  const [lure, type] = LURES[(k * 5 + 3) % LURES.length];
  const region = REGIONS[k % REGIONS.length];
  const started = new Date(Date.UTC(2026, 5, 30 - 2 * k));
  return {
    id: `CMP-${(((k + 101) * 2246822519) >>> 0).toString(16).slice(0, 6)}`,
    name: `${lure} (${region})`,
    type,
    started: `${started.getUTCDate()} ${MONTHS[started.getUTCMonth()]}`,
    total: 700 + ((k * 571) % 2400),
    seed: 60 + k,
  };
}).map(motivated);

// The sample's story (sampleStory.js): each campaign is drawn around the
// click and report rates of its month, counted back from the newest one.
const dayOf = (started) => { const [d, m] = started.split(' '); return Date.UTC(2026, MONTHS.indexOf(m), Number(d)); };
const NEWEST = Math.max(...[...ONGOING, ...ENDED].map((c) => dayOf(c.started)));
const storied = (c) => ({ ...c, climate: climate((NEWEST - dayOf(c.started)) / 86400000) });

export const CAMPAIGNS = ONGOING.map(storied);
export const PAST_CAMPAIGNS = ENDED.map(storied);

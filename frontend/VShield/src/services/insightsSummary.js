/**
 * Insights' Summary: one page on everything going on in the programme, each
 * part a few figures that open where the detail is. Pure functions on
 * insights() output `m`, peopleInsights() output `p`, deptRows() rows and the
 * app's operations (sampleOperations.js shapes), so `node --test` can cover
 * them. They count and pick; they never judge or advise.
 *
 *   regions   - each country: its people, emails, Hook Rate, Report Rate,
 *               Resilience Ratio and health, the most people first;
 *   deptHealth- how many departments are Protected, Holding, Not protected
 *               (and how many had no emails in the period);
 *   deptFacts - three departments: the highest Risk Score, the largest fall
 *               over the period (the largest rise when none fell), the
 *               lowest Report Rate;
 *   pipeline  - campaigns by workflow status (the sent ones the period's);
 *   waiting   - what waits on someone now, each with where it is handled.
 */
import { health } from './bigPictureViews.js';
import { STATUS } from './campaignStatus.js';
import { COUNTRIES, apportion, countriesOf } from './sampleRegions.js';

const rate = (n, of) => (of > 0 ? n / of : null);

/** Each country over the period's campaigns (`campaigns`: m.campaigns), with `people` (everyone) split by country. */
export function regions(campaigns, people = 0) {
  const heads = apportion(people, COUNTRIES.map((c) => c.share));
  const sum = COUNTRIES.map((c, i) => ({ name: c.name, people: heads[i], delivered: 0, clicked: 0, reported: 0, compromised: 0 }));
  campaigns.forEach((row) => countriesOf(row).forEach((c, i) => {
    sum[i].delivered += c.delivered; sum[i].clicked += c.clicked; sum[i].reported += c.reported; sum[i].compromised += c.compromised;
  }));
  return sum
    .map((c) => ({ ...c, hooked: rate(c.clicked, c.delivered), reportRate: rate(c.reported, c.delivered), perClick: rate(c.reported, c.clicked), health: health({ reported: c.reported, clicked: c.clicked, emails: c.delivered }) }))
    .sort((a, b) => b.people - a.people || a.name.localeCompare(b.name));
}

/** How many departments are at each health over the period. */
export function deptHealth(rows) {
  const count = (word) => rows.filter((r) => r.health?.word === word).length;
  return { Protected: count('Protected'), Holding: count('Holding'), Exposed: count('Exposed'), none: rows.filter((r) => !r.health).length };
}

/** The department with the highest Risk Score, the largest fall in it (else the largest rise), and the lowest Report Rate. */
export function deptFacts(rows) {
  const byName = (a, b) => a.name.localeCompare(b.name);
  const highest = [...rows].sort((a, b) => b.score - a.score || byName(a, b))[0];
  const fell = rows.filter((r) => Number.isFinite(r.change) && r.change < 0).sort((a, b) => a.change - b.change || byName(a, b))[0];
  const rose = rows.filter((r) => Number.isFinite(r.change) && r.change > 0).sort((a, b) => b.change - a.change || byName(a, b))[0];
  const quiet = rows.filter((r) => Number.isFinite(r.reportRate)).sort((a, b) => a.reportRate - b.reportRate || byName(a, b))[0];
  return [
    highest && { id: 'highest', row: highest },
    fell ? { id: 'fell', row: fell } : rose && { id: 'rose', row: rose },
    quiet && { id: 'lowestReport', row: quiet },
  ].filter(Boolean);
}

// The workflow's order, with each status's name and the role its colour takes.
const FLOW = [
  [STATUS.DRAFT, 'Draft', 'context'],
  [STATUS.PENDING_APPROVAL, 'Awaiting approval', 'caution'],
  [STATUS.APPROVED, 'Approved', 'measure'],
  [STATUS.SENDING, 'Sending', 'measure'],
  [STATUS.SENT, 'Sent', 'measure'],
  [STATUS.REJECTED, 'Rejected', 'context'],
  [STATUS.FAILED, 'Failed', 'bad'],
];

/** Campaigns by status: `now` holds every status but SENT, `sent` the period's sent campaigns. */
export function pipeline(now, sent) {
  return FLOW.map(([key, label, tone]) => ({ key, label, tone, count: key === STATUS.SENT ? sent : now[key] || 0 }));
}

/**
 * What waits on someone now, each with where it is handled (`to`: an app
 * route, or an Insights view). `flow` is pipeline() output, `drivers` p.now's,
 * `rows` deptRows(), `domains` sender domains by verification.
 */
export function waiting({ flow, drivers = {}, rows = [], domains = {} }) {
  const of = (key) => flow.find((s) => s.key === key)?.count || 0;
  const exposed = rows.filter((r) => r.health?.word === 'Exposed').length;
  const list = [
    { id: 'approvals', label: 'Campaigns awaiting approval', where: 'Requests & Approvals', count: of(STATUS.PENDING_APPROVAL), tone: 'caution', to: { route: '/requests-approvals' } },
    { id: 'domains', label: 'Sender domains not verified', where: 'Email IDs & Domains', count: domains.unverified || 0, tone: 'caution', to: { route: '/email-domains' } },
    { id: 'failed', label: 'Campaigns that failed to send', where: 'Campaigns', count: of(STATUS.FAILED), tone: 'bad', to: { route: '/campaigns' } },
    { id: 'overdue', label: 'People with training overdue', where: 'Training', count: drivers.overdueTraining || 0, tone: 'bad', to: { view: 'training' } },
    { id: 'repeat', label: 'Repeat clickers', where: 'Risk', count: drivers.repeatClickers || 0, tone: 'bad', to: { view: 'risk' } },
    { id: 'exposed', label: 'Departments not protected', where: 'Departments', count: exposed, tone: 'bad', to: { tab: 'departments' } },
  ];
  // nothing waiting reads in the context grey, whatever its kind
  return list.map((w) => (w.count ? w : { ...w, tone: 'context' }));
}

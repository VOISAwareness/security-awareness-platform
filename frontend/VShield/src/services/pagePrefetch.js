/**
 * Getting a page ready before it is opened, so opening it does not wait for
 * its code and then its data, one after the other.
 *
 * - Every page's code is loaded when it is first opened (App.jsx, React.lazy).
 *   `queuePage` lines a page up to be loaded while the browser is idle, one
 *   page at a time: the side menu queues each page this person can open, so
 *   by the time they click, its code is usually already here. Nothing is
 *   queued on a data-saver or 2G connection.
 * - `preparePage` is for a hover or focus on a menu link: it loads the page's
 *   code now and starts its main reads. Reads go through the app's read cache
 *   (services/queryCache.js) under the same paths the page itself asks for,
 *   so the page finds them there, or joins the request already on its way.
 *
 * Failures are ignored here: the page reads (and reports) them itself.
 */
import { api } from './api.js';
import { currentActor, currentRole } from './identity.js';

// The code of each page in the side menu (App.jsx lazy-loads them from here).
export const pageCode = {
  '/home': () => import('../Pages/HomeScreen/HomeScreen'),
  '/start-campaign': () => import('../Pages/StartCampaign/ChooseAScenario'),
  '/create-scenario': () => import('../Pages/Scenarios/Scenarios'),
  '/campaigns': () => import('../Pages/Campaigns/Campaigns'),
  '/training': () => import('../Pages/Training/Training'),
  '/landing-page-catalogue': () => import('../Pages/LandingPageCatalogue/LandingPageCatalogue'),
  '/announcements': () => import('../Pages/Announcement/Announcement'),
  '/user-dls': () => import('../Pages/UserDLs/UserDLsLandingPage'),
  '/email-domains': () => import('../Pages/EmailIDsandDomains/EmailIDsAndDomains'),
  '/requests-approvals': () => import('../Pages/RequestsAndApprovals/RequestAndApprovals'),
  '/gamification': () => import('../Pages/GamificationEngine/GamificationEngine'),
  '/analytics': () => import('../Pages/Insights/Insights'),
  '/my-space': () => import('../Pages/UserProfileandPointsScoreing/MySpace'),
  '/my-training': () => import('../Pages/MyTraining/MyTraining'),
  '/leaderboard': () => import('../Pages/Leaderboard/Leaderboard'),
};

// insights-api's BOARD_ROLES: the roles the Leaderboard's boards are read for.
const BOARD_ROLES = new Set(['Admin', 'Campaign Creator', 'Campaign Manager', 'GMT', 'Gamification Engine Manager']);
const trainingCatalogue = (role) => [api.training.paths(), api.training.videos(), api.training.quizzes(role), api.training.certificates()];

// The first reads each page makes, exactly as it makes them (same paths).
const pageReads = {
  '/home': () => [api.campaigns.summary()],
  '/start-campaign': ({ viewer }) => [api.campaigns.summary(), api.scenarios.list({ viewer })],
  '/campaigns': () => [api.campaigns.summary()],
  '/requests-approvals': () => [api.campaigns.summary()],
  '/landing-page-catalogue': () => [api.landingPages.list()],
  '/announcements': () => [api.announcements.list('TEMPLATE')],
  '/user-dls': () => [api.users.list(), api.userLists.list(), api.campaigns.summary()],
  '/email-domains': () => [api.senderIdentities.list()],
  '/analytics': ({ role }) => [api.insights.get(role), api.insightsTargets.get()],
  '/my-space': ({ viewer }) => [api.points.standing(viewer)],
  '/my-training': ({ viewer, role }) => [api.myTraining.list(viewer), ...trainingCatalogue(role)],
  '/training': ({ role }) => [...trainingCatalogue(role), api.trainingPackages.list()],
  '/leaderboard': ({ viewer, role }) => [
    api.points.leaderboard(viewer, role),
    api.gamificationRules.list(),
    // the campaign boards and Big Picture, for the roles insights-api serves them to
    ...(BOARD_ROLES.has(role) ? [api.insights.board(role, viewer)] : []),
  ],
};

const loaded = new Set();
const queue = [];
let scheduled = false;

function loadCode(path, code) {
  const load = code[path];
  if (!load || loaded.has(path)) return Promise.resolve();
  loaded.add(path);
  return Promise.resolve()
    .then(load)
    .catch(() => loaded.delete(path)); // a later hover or visit tries again
}

function slowConnection(nav) {
  const c = nav?.connection;
  return Boolean(c && (c.saveData || /(^|-)2g$/.test(String(c.effectiveType || ''))));
}

function whenIdle(win, fn) {
  if (typeof win?.requestIdleCallback === 'function') win.requestIdleCallback(fn, { timeout: 3000 });
  else setTimeout(fn, 200);
}

/** Line a page's code up to be loaded while the browser is idle. */
export function queuePage(path, { code = pageCode, win = globalThis.window, nav = globalThis.navigator } = {}) {
  if (!code[path] || loaded.has(path) || queue.includes(path) || slowConnection(nav)) return;
  queue.push(path);
  if (scheduled) return;
  scheduled = true;
  const next = () => {
    const page = queue.shift();
    if (!page) {
      scheduled = false;
      return;
    }
    // one page at a time, each in its own idle moment
    loadCode(page, code).finally(() => whenIdle(win, next));
  };
  whenIdle(win, next);
}

/** A hover or focus on a menu link: its code now, and its first reads. */
export function preparePage(path, { code = pageCode, reads = pageReads, viewer = currentActor(), role = currentRole() } = {}) {
  loadCode(path, code);
  const start = reads[path];
  if (!start) return;
  try {
    start({ viewer, role }).forEach((read) => Promise.resolve(read).catch(() => {}));
  } catch {
    // a read that cannot even start is the page's to report
  }
}

/** For tests: forget what was loaded or queued. */
export function resetPagePrefetch() {
  loaded.clear();
  queue.length = 0;
  scheduled = false;
}

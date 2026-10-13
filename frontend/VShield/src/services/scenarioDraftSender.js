/**
 * scenarioDraftSender — when the scenario editor sends its draft to the server
 * (useScenarioDraft.js wires it to React; scenarioDraftSync.js does the
 * sending). Plain ESM: the API client and the clock are passed in, so
 * `node --test` drives it with fakes.
 *
 * The editor writes every change to this browser at once (scenarioDraftList.js),
 * so nothing is lost meanwhile. The server gets the draft:
 *  - SEND_DEBOUNCE_MS after the last change, and no later than MAX_SEND_WAIT_MS
 *    after the first change not sent yet (someone typing without a pause);
 *  - at once on a step change, on "Save as draft", on leaving the editor, and
 *    as the page closes (a keepalive request, small drafts only: the copy kept
 *    here covers the rest at the next visit);
 *  - never while it holds what the server already has;
 *  - one request at a time: changes made while one is out go after it;
 *  - after a failure not again before RETRY_MS (doubling each time), and not at
 *    all after MAX_SEND_FAILURES, until the editor is opened again.
 */
import { draftFingerprint, sameDraftContent } from './scenarioDraft.js';
import {
  canSyncDrafts,
  deleteScenarioDraftEverywhere,
  fitsKeepalive,
  isDraftBusy,
  queueDraftOp,
  saveScenarioDraftToServer,
  scenarioDraftsUnavailable,
  settleSentCopy,
} from './scenarioDraftSync.js';

export const SEND_DEBOUNCE_MS = 5000;
export const MAX_SEND_WAIT_MS = 60000;
export const RETRY_MS = 30000;
export const MAX_SEND_FAILURES = 3;

const realClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (timer) => clearTimeout(timer),
};

/**
 * One editor's sending, for the draft it works on.
 * @param api      the API client (api.js), or a fake
 * @param actor    whose draft it is
 * @param id       the draft id
 * @param rev      the server rev the editor's content is based on (0: never sent)
 * @param server   the draft exactly as the server has it (opened from it), or null
 * @param onSaved  ({ id, rev, forkedFrom, upToDate }) after each save; forkedFrom
 *                 when the work was kept as a new draft (id is the new one),
 *                 upToDate when nothing newer waits to be sent
 * @param onFailed ({ kind, error }) after each failed save (see failureKind())
 */
export function createScenarioDraftSender({
  api: client,
  actor,
  id,
  rev = 0,
  server = null,
  onSaved = () => {},
  onFailed = () => {},
  clock = realClock,
}) {
  let draftId = id;
  let baseRev = rev;
  let onServer = server; // what the server has, as far as this editor knows
  let unsent = null; // the newest content the server doesn't have yet
  let firstUnsentAt = 0;
  let timer = null;
  let sending = false;
  let again = null; // { force } once something asked to send while one was out
  let failures = 0;
  let retryAt = 0;
  let closed = false; // "Save as draft" or published: no more changes taken
  let discarded = false; // published: whatever lands is deleted again
  let emptied = false; // the form was emptied back to blank
  const written = new Set(); // fingerprints of everything this editor wrote

  const enabled = () => canSyncDrafts(actor) && !scenarioDraftsUnavailable() && failures < MAX_SEND_FAILURES;

  function cancel() {
    if (timer) clock.clearTimeout(timer);
    timer = null;
  }

  function schedule(delay) {
    if (!unsent || !enabled()) return;
    cancel();
    const now = clock.now();
    let at = now + delay;
    if (firstUnsentAt) at = Math.min(at, Math.max(now, firstUnsentAt + MAX_SEND_WAIT_MS));
    at = Math.max(at, retryAt);
    timer = clock.setTimeout(() => {
      timer = null;
      send();
    }, at - now);
  }

  function settle(sentId, draft, result) {
    if (result.status === 'saved') {
      failures = 0;
      retryAt = 0;
      settleSentCopy(draft, result, actor);
      if (discarded) {
        // Published while it was on its way: a draft it created goes again.
        if (result.forkedFrom) deleteScenarioDraftEverywhere(client, result.id, actor, { listed: true });
        return;
      }
      if (draftId === sentId) {
        draftId = result.id;
        baseRev = result.rev;
        onServer = draft;
      }
      if (unsent && sameDraftContent(unsent, draft)) {
        unsent = null;
        firstUnsentAt = 0;
      }
      onSaved({ id: result.id, rev: result.rev, forkedFrom: result.forkedFrom || '', upToDate: !unsent });
      return;
    }
    if (result.kind !== 'missing') {
      failures += 1;
      retryAt = clock.now() + RETRY_MS * 2 ** (failures - 1);
    }
    onFailed({ kind: result.kind, error: result.error });
  }

  /**
   * Send the newest content now (force: even within a failure's wait).
   * keepalive: as the page closes, only when nothing else is on its way and
   * the draft is small enough. Resolves once it settled.
   */
  function send({ force = false, keepalive = false } = {}) {
    if (!unsent || !enabled()) return Promise.resolve(null);
    if (sending) {
      if (!keepalive) again = { force: Boolean(force || again?.force) };
      return Promise.resolve(null);
    }
    if (!force && clock.now() < retryAt) {
      schedule(0);
      return Promise.resolve(null);
    }
    if (keepalive && (isDraftBusy(draftId, actor) || !fitsKeepalive(unsent, actor))) return Promise.resolve(null);
    cancel();
    const draft = unsent;
    const sentId = draftId;
    sending = true;
    return queueDraftOp(
      sentId,
      () =>
        saveScenarioDraftToServer({
          api: client,
          actor,
          id: sentId,
          draft,
          baseRev,
          isOwnContent: (fp) => written.has(fp),
          keepalive,
        }),
      actor
    )
      .catch((error) => ({ status: 'failed', kind: 'unavailable', error }))
      .then((result) => {
        sending = false;
        settle(sentId, draft, result);
        const next = again;
        again = null;
        if (unsent && result.status === 'saved') {
          if (next?.force) return send({ force: true });
          schedule(SEND_DEBOUNCE_MS);
        } else if (unsent) {
          schedule(0);
        }
        return result;
      });
  }

  return {
    /** The draft id sent to (it changes when the work had to be kept as a new draft). */
    get id() {
      return draftId;
    },
    /** The server rev the editor's content is based on. */
    get baseRev() {
      return baseRev;
    },
    /** Does `draft` hold exactly what the server has? */
    holds: (draft) => Boolean(onServer && draft && sameDraftContent(draft, onServer)),
    /**
     * The editor's content now (real work). -> 'synced' when it is what the
     * server has (nothing to send), else 'unsent' (sent in a while).
     */
    changed(draft) {
      if (closed || !draft) return 'unsent';
      emptied = false;
      if (onServer && sameDraftContent(draft, onServer)) {
        unsent = null;
        firstUnsentAt = 0;
        cancel();
        return 'synced';
      }
      written.add(draftFingerprint(draft));
      if (!unsent) firstUnsentAt = clock.now();
      unsent = draft;
      schedule(SEND_DEBOUNCE_MS);
      return 'unsent';
    },
    /** The form was emptied back to blank: nothing to send (see leave()). */
    emptied() {
      if (closed) return;
      unsent = null;
      firstUnsentAt = 0;
      cancel();
      emptied = true;
    },
    /** A moment worth sending at once (a step change), failures permitting. */
    sendSoon: () => send(),
    /** "Save as draft": sent now, and nothing more is taken from this editor. */
    park() {
      closed = true;
      return send({ force: true });
    },
    /**
     * The editor is left: what waits is sent now. A form left emptied, whose
     * draft the server has, is deleted (as it is from this browser).
     */
    leave() {
      if (emptied && !closed && (baseRev > 0 || onServer)) {
        baseRev = 0;
        onServer = null;
        return deleteScenarioDraftEverywhere(client, draftId, actor, { listed: true });
      }
      return send({ force: true });
    },
    /**
     * The page is closing: a last try that outlives it (keepalive), unless a
     * failure's wait is not over (the copy kept here is sent next time).
     */
    pageHidden: () => send({ keepalive: true }),
    /** Published: nothing more is sent, and the draft is deleted everywhere. */
    discard() {
      closed = true;
      discarded = true;
      unsent = null;
      cancel();
      return deleteScenarioDraftEverywhere(client, draftId, actor, { listed: baseRev > 0 || Boolean(onServer) });
    },
    /** Work on another draft from here on (the one offered back was resumed). */
    switchTo({ id: nextId, rev: nextRev = 0, server: nextServer = null }) {
      cancel();
      draftId = nextId;
      baseRev = nextRev;
      onServer = nextServer;
      unsent = null;
      firstUnsentAt = 0;
      emptied = false;
    },
  };
}

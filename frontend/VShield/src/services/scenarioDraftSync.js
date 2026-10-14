/**
 * scenarioDraftSync — the server half of scenario drafts: they are kept per
 * person on the server (GET/PUT/DELETE /scenario-drafts), so they follow the
 * person to any browser or device. scenarioDraftList.js is the browser half
 * (the copy of work not sent yet, the pointer, what this browser knows of each
 * draft's server rev); useScenarioDraft.js is the editor's hook.
 *
 * Plain ESM, no React or DOM: the API client is passed in, so `node --test`
 * runs all of this against a fake.
 *
 *  - Sending: a draft is sent with the rev it is based on (baseRev; 0 = never
 *    on the server) and a fresh saveId, recorded here before it goes out. A
 *    409 DRAFT_CONFLICT is settled without dropping either version:
 *      our own save (its answer was lost)         -> saved, at current.rev
 *      an earlier save of ours from this browser  -> sent again on top of it
 *      deleted elsewhere (current null)           -> sent again as new (baseRev 0), same id
 *      someone else's newer save                  -> theirs stays; ours is saved as a NEW
 *                                                    draft id (unless both hold the same)
 *  - Requests for one draft go out one at a time, in order (queueDraftOp), so a
 *    delete never overtakes a save and two saves never race.
 *  - If the API can't be reached (offline, 5xx, 503 BUSY) everything keeps
 *    working from this browser and is sent later. A 404 where the contract
 *    has none means the routes are not deployed yet: nothing more is tried
 *    until the app is loaded again.
 *  - Drafts are kept under the person's email (`owner`, client-asserted like
 *    `viewer` / `actor` elsewhere); without an email they stay in this browser.
 */
import {
  SCENARIO_DRAFT_VERSION,
  draftFingerprint,
  draftSummary,
  isMeaningfulDraft,
  parseDraft,
  sameDraftContent,
} from './scenarioDraft.js';
import { scenarioContentVersion } from './resumePrompt.js';
import {
  addPendingDelete,
  clearPendingDelete,
  decideScenarioEditorOpening,
  draftSyncState,
  dropSentScenarioDraft,
  findEditDraft,
  forgetDraftSync,
  getActiveScenarioDraftId,
  getScenarioDraft,
  isDeletePending,
  listScenarioDrafts,
  newDraftId,
  pendingDraftDeletes,
  recordDraftSave,
  removeScenarioDraft,
  saveScenarioDraft,
  setActiveScenarioDraftId,
  setDraftBaseRev,
} from './scenarioDraftList.js';

// Browsers refuse a keepalive request (one sent as the page closes) over 64 KB.
export const KEEPALIVE_MAX_BYTES = 60 * 1024;
// A copy saved here this recently may be open in an editor right now, which
// sends it itself; the Drafts tab leaves it to that editor.
export const RECENT_COPY_MS = 2 * 60 * 1000;
// A save that keeps meeting conflicts gives up (and is tried again later).
const MAX_SAVE_ROUNDS = 4;

export const CONFLICT_NOTICE =
  'This draft was changed in another window, so your changes were kept as a separate draft.';

/** Drafts are kept on the server under the person's email; without one they stay in this browser. */
export const canSyncDrafts = (actor) => String(actor || '').includes('@');

// --- Failures -------------------------------------------------------------------------

// Set when a route answered 404 where the contract has none: the API is not
// deployed yet. Lasts until the app is loaded again.
let routesMissing = false;

export const scenarioDraftsUnavailable = () => routesMissing;

/** For tests: forget what this page load learnt about the server. */
export function resetScenarioDraftSync() {
  routesMissing = false;
  queues.clear();
  listings.clear();
  tabLoads.clear();
  openings.clear();
  deletedHere.clear();
}

// API Gateway's own 404 for a route it doesn't have is `{ message }`; the API's
// "no such draft" is its `{ error: { ... } }` envelope.
const isNoSuchDraft = (error) => error?.status === 404 && Boolean(error?.payload?.error);

/**
 * How a failed request reads:
 *   'conflict'    409 DRAFT_CONFLICT
 *   'tooLarge'    413: too big to keep on the server (images pasted in)
 *   'missing'     404: the routes are not deployed yet
 *   'rejected'    another 4xx: this content would be refused again
 *   'unavailable' offline, 5xx, 503 BUSY: try again later
 */
export function failureKind(error) {
  const status = Number(error?.status) || 0;
  if (status === 409) return 'conflict';
  if (status === 413) return 'tooLarge';
  if (status === 404) return 'missing';
  if (status >= 400 && status < 500 && status !== 408 && status !== 429) return 'rejected';
  return 'unavailable';
}

function noteFailure(error) {
  if (failureKind(error) === 'missing') routesMissing = true;
}

// --- One request at a time per draft ------------------------------------------------------

const queues = new Map(); // `${actor}\n${id}` -> promise settling after its last queued operation
const queueKey = (id, actor) => `${String(actor || '').toLowerCase()}\n${id}`;

/**
 * Run `op` once every operation already queued for this draft has settled.
 * With none queued it starts at once (synchronously), so a request sent as
 * the page closes still goes out.
 */
export function queueDraftOp(id, op, actor) {
  const key = queueKey(id, actor);
  const previous = queues.get(key);
  let result;
  if (previous) {
    result = previous.then(() => op());
  } else {
    try {
      result = Promise.resolve(op());
    } catch (error) {
      result = Promise.reject(error);
    }
  }
  const settled = result.then(
    () => {},
    () => {}
  );
  queues.set(key, settled);
  settled.then(() => {
    if (queues.get(key) === settled) queues.delete(key);
  });
  return result;
}

export const isDraftBusy = (id, actor) => queues.has(queueKey(id, actor));

/** Resolves once this draft's queued requests have settled. */
export const draftOpsSettled = (id, actor) => queues.get(queueKey(id, actor)) || Promise.resolve();

/** Resolves once every queued request of this person has settled. */
export function allDraftOpsSettled(actor) {
  const prefix = queueKey('', actor);
  return Promise.all([...queues.entries()].filter(([key]) => key.startsWith(prefix)).map(([, p]) => p));
}

// --- What is sent ---------------------------------------------------------------------------

/** A per-save id (<= 64 chars), so a save whose answer was lost can be recognised. */
export const newSaveId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

/**
 * What the Drafts tab shows about a draft, as the server keeps it (the list
 * never carries the form): draftSummary() without savedAt (kept beside it),
 * plus the form's content version, so "Continue your scenario?" can tell
 * whether it was asked about this version without reading the whole draft.
 */
export function serverSummary(draft) {
  const summary = { ...draftSummary(draft), contentVersion: scenarioContentVersion(draft) };
  delete summary.savedAt;
  return summary;
}

/** The PUT /scenario-drafts/{id} body. */
export function draftPutBody({ owner, baseRev = 0, saveId, draft }) {
  const body = {
    version: SCENARIO_DRAFT_VERSION,
    savedAt: draft.savedAt,
    activeTab: draft.activeTab,
    formData: draft.formData,
  };
  if (draft.edit) body.edit = draft.edit;
  return { owner, baseRev, saveId, draft: body, summary: serverSummary(draft) };
}

const byteLength = (text) =>
  typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text).length : text.length * 3;

/** Small enough to send as the page closes (keepalive)? */
export function fitsKeepalive(draft, owner) {
  const body = draftPutBody({ owner, baseRev: 0, saveId: newSaveId(), draft });
  return byteLength(JSON.stringify(body)) + 32 <= KEEPALIVE_MAX_BYTES;
}

const toRev = (value) => (Number.isInteger(value) && value > 0 ? value : 0);

// --- Reading -------------------------------------------------------------------------------

/**
 * One whole draft from the server: { draft, rev }, or null when this person has
 * no such draft. Throws when the server can't be asked (offline, not deployed).
 */
export async function fetchServerDraft(client, id, actor) {
  let full;
  try {
    full = await client.scenarioDrafts.get(id, actor);
  } catch (error) {
    if (isNoSuchDraft(error)) return null;
    noteFailure(error);
    throw error;
  }
  const draft = parseDraft(full);
  if (!draft || (full.draftId && full.draftId !== id)) return null;
  return { draft, rev: toRev(full.rev) };
}

const listings = new Map(); // actor -> the list request in flight

/**
 * The person's drafts on the server (summaries, newest first). Callers at the
 * same moment share one request: React StrictMode mounts a page twice in dev.
 */
export function listServerDrafts(client, actor) {
  const key = String(actor || '').toLowerCase();
  const inFlight = listings.get(key);
  if (inFlight) return inFlight;
  const request = Promise.resolve()
    .then(() => client.scenarioDrafts.list(actor))
    .then((rows) => (Array.isArray(rows) ? rows : []))
    .catch((error) => {
      noteFailure(error);
      throw error;
    })
    .finally(() => {
      if (listings.get(key) === request) listings.delete(key);
    });
  listings.set(key, request);
  return request;
}

// --- Saving -------------------------------------------------------------------------------

/**
 * Save one draft on the server, settling a conflict (see the top of this file).
 * `isOwnContent(fp)` says whether content with that fingerprint was the
 * caller's own work (the editor: anything it wrote), so a save of it recorded
 * by this browser (another tab, a page since closed) counts as ours.
 * -> { status: 'saved', id, rev, forkedFrom? }   (id differs from the one asked
 *                                                for when it was kept as a new draft)
 *  | { status: 'failed', kind, error }            (kind: see failureKind())
 */
export async function saveScenarioDraftToServer({
  api: client,
  actor,
  id,
  draft,
  baseRev = 0,
  isOwnContent = () => false,
  keepalive = false,
}) {
  const fp = draftFingerprint(draft);
  let targetId = id;
  let base = toRev(baseRev);
  let forkedFrom = '';
  const saved = (rev, saveId) => {
    recordDraftSave(targetId, { saveId, fp, rev }, actor);
    return { status: 'saved', id: targetId, rev, ...(forkedFrom ? { forkedFrom } : {}) };
  };

  for (let round = 0; round < MAX_SAVE_ROUNDS; round += 1) {
    const saveId = newSaveId();
    // Recorded before it goes out: if the answer never arrives, the server's
    // report of this save is still recognised as ours.
    recordDraftSave(targetId, { saveId, fp }, actor);
    try {
      const result = await client.scenarioDrafts.save(
        targetId,
        draftPutBody({ owner: actor, baseRev: base, saveId, draft }),
        { keepalive }
      );
      return saved(toRev(result?.rev) || base + 1, saveId);
    } catch (error) {
      const kind = failureKind(error);
      if (kind !== 'conflict') {
        noteFailure(error);
        return { status: 'failed', kind, error };
      }
      const current = error?.payload?.error?.current || null;
      if (!current) {
        // Deleted elsewhere: this is the only copy now.
        base = 0;
        continue;
      }
      const known = draftSyncState(targetId, actor).saves.find((s) => s.saveId === current.saveId);
      if (current.saveId === saveId || (known && known.fp === fp)) return saved(toRev(current.rev), current.saveId);
      if (known && isOwnContent(known.fp)) {
        // An earlier save of this same work landed: this one goes on top of it.
        base = toRev(current.rev);
        continue;
      }
      // Someone else's newer save. Unless it holds exactly this, it stays as
      // it is, and this work is kept as a new draft.
      let theirs;
      try {
        theirs = await fetchServerDraft(client, targetId, actor);
      } catch (readError) {
        return { status: 'failed', kind: failureKind(readError), error: readError };
      }
      if (!theirs) {
        base = 0;
        continue;
      }
      if (sameDraftContent(draft, theirs.draft)) return saved(theirs.rev, current.saveId);
      forkedFrom = forkedFrom || targetId;
      targetId = newDraftId();
      base = 0;
    }
  }
  return { status: 'failed', kind: 'conflict', error: new Error('Draft kept changing on the server') };
}

/**
 * After a save of the copy kept here (`sent`): the copy goes once the server
 * holds exactly it, else it stays, now based on the saved rev. A draft kept as
 * a new one takes the copy along, and the pointer if it named the old id; the
 * old id is the other save's again.
 */
export function settleSentCopy(sent, result, actor) {
  if (result?.status !== 'saved') return;
  deletedHere.delete(queueKey(result.id, actor));
  const oldId = result.forkedFrom || result.id;
  const copy = getScenarioDraft(oldId, actor);
  if (result.forkedFrom) {
    // Changed again since it was sent: the newer work moves along.
    if (copy && !sameDraftContent(copy, sent)) saveScenarioDraft(result.id, copy, actor);
    dropSentScenarioDraft(oldId, actor);
    forgetDraftSync(oldId, actor);
    if (getActiveScenarioDraftId(actor) === oldId) setActiveScenarioDraftId(result.id, actor);
  } else if (copy && sameDraftContent(copy, sent)) {
    dropSentScenarioDraft(result.id, actor);
  }
  setDraftBaseRev(result.id, result.rev, actor);
}

// --- Deleting -------------------------------------------------------------------------------

// Drafts deleted during this page load: kept out of the Drafts tab even when a
// list read before the delete still has them (until saved again).
const deletedHere = new Set(); // queueKey(id, actor)
const deletedIds = (actor) => {
  const prefix = queueKey('', actor);
  return [...deletedHere].filter((key) => key.startsWith(prefix)).map((key) => key.slice(prefix.length));
};
const hiddenIds = (actor) => [...pendingDraftDeletes(actor), ...deletedIds(actor)];

async function sendDelete(client, id, actor) {
  if (!isDeletePending(id, actor)) return true;
  try {
    await client.scenarioDrafts.remove(id, actor);
  } catch (error) {
    // Still pending: tried again at the next visit.
    noteFailure(error);
    return false;
  }
  clearPendingDelete(id, actor);
  forgetDraftSync(id, actor);
  return true;
}

/**
 * Delete a draft everywhere: here at once; on the server after any request
 * for it still under way, and remembered until the server confirms, so it
 * cannot come back meanwhile (tried again at the next visit). `listed`: the
 * server listed it. A draft never sent from here and not listed is only here.
 * Resolves to true once nothing of it is left anywhere known.
 */
export function deleteScenarioDraftEverywhere(client, id, actor, { listed = false } = {}) {
  if (!id) return Promise.resolve(true);
  const { rev, saves } = draftSyncState(id, actor);
  removeScenarioDraft(id, actor);
  deletedHere.add(queueKey(id, actor));
  const mayBeOnServer = listed || rev > 0 || saves.length > 0 || isDraftBusy(id, actor);
  if (!canSyncDrafts(actor) || !mayBeOnServer) {
    forgetDraftSync(id, actor);
    return Promise.resolve(true);
  }
  addPendingDelete(id, actor);
  if (routesMissing) return Promise.resolve(false);
  return queueDraftOp(id, () => sendDelete(client, id, actor), actor);
}

// --- The Drafts tab --------------------------------------------------------------------------

const text = (value) => (typeof value === 'string' ? value : '');

/**
 * One card of the Drafts tab: { id, savedAt, summary, draft, listed }.
 * summary as serverSummary() has it; draft the whole draft when it is kept in
 * this browser (null when only the server has it); listed when the server
 * listed it.
 */
function listedItem(row) {
  if (!row || typeof row.draftId !== 'string' || !row.draftId) return null;
  const raw = row.summary && typeof row.summary === 'object' && !Array.isArray(row.summary) ? row.summary : {};
  const savedAt = text(row.savedAt);
  // What the cards read, whatever the row holds.
  const summary = {
    ...raw,
    name: text(raw.name).trim() || 'Untitled scenario',
    scenarioId: text(raw.scenarioId),
    description: text(raw.description),
    cover: text(raw.cover),
    coverSource: text(raw.coverSource),
    savedAt,
  };
  return { id: row.draftId, savedAt, summary, draft: null, listed: true };
}

const keptItem = (d) => ({
  id: d.id,
  savedAt: d.savedAt,
  summary: { ...serverSummary(d), savedAt: d.savedAt },
  draft: d,
  listed: false,
});

/**
 * The Drafts tab: the server's list merged with the copies kept here (work
 * not sent yet), newest first. A copy here wins over the server's row for the
 * same draft unless the server's is newer (saved elsewhere since); a draft
 * deleted here is left out, as is a copy holding no real work. Pure.
 */
export function mergeScenarioDrafts(rows, kept, { deleted = [], defaults = {} } = {}) {
  const byId = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const item = listedItem(row);
    if (item) byId.set(item.id, item);
  }
  for (const d of kept || []) {
    if (!d?.id || !isMeaningfulDraft(d, defaults)) continue;
    const listed = byId.get(d.id);
    if (!listed || String(d.savedAt) >= String(listed.savedAt)) byId.set(d.id, { ...keptItem(d), listed: Boolean(listed) });
  }
  for (const id of deleted) byId.delete(id);
  return [...byId.values()].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

/** The Drafts tab from the copies kept in this browser alone (before, or without, the server). */
export function keptScenarioDrafts(actor, defaults = {}) {
  return mergeScenarioDrafts([], listScenarioDrafts(actor), { deleted: hiddenIds(actor), defaults });
}

/**
 * The draft in progress among the Drafts tab's items (the one the pointer
 * names), if it holds real work: { id, summary, version } or null. version is
 * its content version (resumePrompt.js), from the copy here or as its summary
 * recorded it; '' when neither has it (see resolveInProgress).
 */
export function inProgressAmong(items, actor, defaults = {}) {
  const id = getActiveScenarioDraftId(actor);
  const item = id ? (items || []).find((d) => d.id === id) : null;
  if (!item) return null;
  if (item.draft) {
    return isMeaningfulDraft(item.draft, defaults)
      ? { id, summary: item.summary, version: scenarioContentVersion(item.draft) }
      : null;
  }
  return { id, summary: item.summary, version: text(item.summary.contentVersion) };
}

/** inProgressAmong(), reading the draft from the server when its version is not known. */
export async function resolveInProgress(items, actor, client, defaults = {}) {
  const found = inProgressAmong(items, actor, defaults);
  if (!found || found.version) return found;
  const { id, summary } = found;
  try {
    const read = await fetchServerDraft(client, id, actor);
    return read && isMeaningfulDraft(read.draft, defaults)
      ? { id, summary, version: scenarioContentVersion(read.draft) }
      : null;
  } catch {
    return null;
  }
}

/**
 * Send what this browser still holds once the server's list is in (`rows`):
 * deletes made here, then the copies not sent yet, oldest first. A copy saved
 * within RECENT_COPY_MS is left to the editor that may have it open. This is
 * also how drafts kept here before they were on the server move there: they
 * are copies not sent yet (rev 0). -> the rows as the server now has them.
 */
export async function sendPendingScenarioDrafts({ api: client, actor, rows = [], defaults = {}, now = Date.now() }) {
  const listedIds = new Set(rows.map((r) => r?.draftId));
  let next = [...rows];
  for (const id of pendingDraftDeletes(actor)) {
    if (routesMissing) return next;
    if (!listedIds.has(id) && !isDraftBusy(id, actor)) {
      // Not on the server (any more): nothing to tell it.
      clearPendingDelete(id, actor);
      forgetDraftSync(id, actor);
      continue;
    }
    // Not deleted: the server can't be reached, and the rest waits for the next visit too.
    if (!(await queueDraftOp(id, () => sendDelete(client, id, actor), actor))) return next;
    next = next.filter((r) => r?.draftId !== id);
  }
  const copies = listScenarioDrafts(actor)
    .filter((d) => isMeaningfulDraft(d, defaults) && !isDeletePending(d.id, actor))
    .filter((d) => !(now - Date.parse(d.savedAt) < RECENT_COPY_MS))
    .reverse();
  for (const { id } of copies) {
    if (routesMissing) return next;
    const result = await queueDraftOp(
      id,
      async () => {
        // Read again: an editor may have sent it (and let it go) meanwhile.
        const draft = getScenarioDraft(id, actor);
        if (!draft) return null;
        const fp = draftFingerprint(draft);
        const outcome = await saveScenarioDraftToServer({
          api: client,
          actor,
          id,
          draft,
          baseRev: draftSyncState(id, actor).rev,
          isOwnContent: (f) => f === fp,
        });
        settleSentCopy(draft, outcome, actor);
        return { ...outcome, draft };
      },
      actor
    );
    if (!result) continue;
    if (result.status !== 'saved') {
      // The server can't be reached: the rest waits for the next visit too.
      if (result.kind === 'unavailable' || result.kind === 'missing') return next;
      continue;
    }
    next = [
      { draftId: result.id, rev: result.rev, savedAt: result.draft.savedAt, summary: serverSummary(result.draft) },
      ...next.filter((r) => r?.draftId !== result.id),
    ];
  }
  return next;
}

const tabLoads = new Map(); // actor -> the Drafts tab load under way

/**
 * The Drafts tab on a visit: one list request, merged with the copies kept
 * here, then what is waiting here is sent. -> { listed, sent }, two promises
 * of { items, ok }: the cards once the list is in, and again once the pending
 * work was sent (ok: the server answered). Callers at the same moment share
 * one load (React StrictMode mounts a page twice in dev).
 */
export function loadScenarioDraftsTab({ api: client, actor, defaults = {} }) {
  const key = String(actor || '').toLowerCase();
  const running = tabLoads.get(key);
  if (running) return running;
  const merged = (rows) =>
    mergeScenarioDrafts(rows, listScenarioDrafts(actor), { deleted: hiddenIds(actor), defaults });

  const listed = (async () => {
    if (!canSyncDrafts(actor) || routesMissing) return { items: merged([]), ok: false, rows: null };
    // A save still on its way (the editor just left) lands first, so the list has it.
    await allDraftOpsSettled(actor);
    try {
      const rows = await listServerDrafts(client, actor);
      return { items: merged(rows), ok: true, rows };
    } catch {
      return { items: merged([]), ok: false, rows: null };
    }
  })();
  const sent = listed.then(async (first) => {
    if (!first.ok) return first;
    try {
      const rows = await sendPendingScenarioDrafts({ api: client, actor, rows: first.rows, defaults });
      return { items: merged(rows), ok: true, rows };
    } catch {
      return first;
    }
  });
  const load = { listed, sent };
  tabLoads.set(key, load);
  sent.finally(() => {
    if (tabLoads.get(key) === load) tabLoads.delete(key);
  });
  return load;
}

/**
 * The scenarios an unfinished edit among these Drafts-tab items holds back:
 * listed under Drafts instead of the scenario list, and not to be picked for
 * a campaign until the edit is saved or its draft deleted. A template's (or
 * someone else's shared scenario's) edit holds nothing back: it is a new
 * version, and the original stays as it is. -> Set of scenarioIds
 */
export function editedScenarioIds(items) {
  const ids = new Set();
  for (const item of items || []) {
    const editing = item?.summary?.editing;
    if (editing?.scenarioId && editing.mode !== 'copy') ids.add(String(editing.scenarioId));
  }
  return ids;
}

/**
 * This person's Drafts-tab items, read for another page (the editor, Start
 * New Campaign): the server's list merged with the copies kept here, and
 * nothing sent. Without the server, the copies kept here. -> Promise<items>
 */
export async function readScenarioDraftItems(client, actor, defaults = {}) {
  let rows = [];
  if (canSyncDrafts(actor) && !routesMissing) {
    rows = await listServerDrafts(client, actor).catch(() => []);
  }
  return mergeScenarioDrafts(rows, listScenarioDrafts(actor), { deleted: hiddenIds(actor), defaults });
}

/**
 * Deleting a scenario leaves nothing for its unfinished edits to be saved
 * onto: each of this person's edits of it is deleted everywhere. They are
 * found by summary.editing in the Drafts tab's `items`, among the copies kept
 * here, and in the server's list read again now (an edit may have been
 * started elsewhere since the page read it). There is no server-side cascade.
 */
export async function removeEditDraftsEverywhere(client, scenarioId, items, actor) {
  const sid = String(scenarioId || '').trim();
  if (!sid) return;
  const ids = new Map(); // draftId -> listed by the server
  const editsIt = (summary) => String(summary?.editing?.scenarioId || '') === sid;
  if (canSyncDrafts(actor) && !routesMissing) {
    try {
      for (const row of await listServerDrafts(client, actor)) {
        if (editsIt(row?.summary)) ids.set(row.draftId, true);
      }
    } catch {
      /* the server can't be asked now: the items are what is known */
    }
  }
  for (const item of items || []) {
    if (editsIt(item?.summary) && !ids.has(item.id)) ids.set(item.id, Boolean(item.listed));
  }
  for (const d of listScenarioDrafts(actor)) {
    if (d.edit?.scenarioId === sid && !ids.has(d.id)) ids.set(d.id, false);
  }
  await Promise.all([...ids].map(([id, listed]) => deleteScenarioDraftEverywhere(client, id, actor, { listed })));
}

// --- Where the editor opens ---------------------------------------------------------------

/** The copy kept here: { id, draft, rev, synced: false } or null. */
function keptHere(id, actor) {
  const draft = getScenarioDraft(id, actor);
  return draft ? { id, draft, rev: draftSyncState(id, actor).rev, synced: false } : null;
}

/**
 * Can the editor's opening be decided from this browser alone (no request,
 * nothing under way)? Then scenarioEditorOpening() decides it at once.
 * `editChecked`: Edit was chosen on Scenarios, whose list from the server
 * (read on that visit) holds no unfinished edit of the scenario, so the
 * editor need not read the list again.
 */
export function openingNeedsServer(
  { requestedId = '', startFresh = false, editId = '', editChecked = false } = {},
  actor
) {
  if (!canSyncDrafts(actor) || routesMissing) return false;
  const knownHere = (id) => !id || isDeletePending(id, actor) || (getScenarioDraft(id, actor) && !isDraftBusy(id, actor));
  if (requestedId && !isDeletePending(requestedId, actor)) return !knownHere(requestedId);
  if (editId) return !editChecked || !knownHere(findEditDraft(editId, actor)?.id || '');
  if (startFresh) return false;
  return !knownHere(getActiveScenarioDraftId(actor));
}

/**
 * scenarioEditorOpening() with the server too: ?draft=<id> opens the copy kept
 * here when there is one, else the server's; ?edit=<scenarioId> finds the
 * unfinished edit in the server's list (unless `editChecked`, see
 * openingNeedsServer) as well as here (the newer); the draft
 * in progress (offered back) is the pointer's, kept here or read from the
 * server. A draft that can't be read is treated as not there (the editor
 * still opens; its work is never written over another save, see
 * saveScenarioDraftToServer). Callers at the same moment share one load
 * (React StrictMode mounts a page twice in dev).
 * -> scenarioEditorOpening()'s result, plus `synced` (the resumed draft is the
 *    server's, exactly) and the same on `offer` / `deferred`.
 */
export function loadScenarioEditorOpening(request = {}, actor, client) {
  const { requestedId = '', startFresh = false, editId = '', editChecked = false } = request;
  const key = JSON.stringify([String(actor || '').toLowerCase(), requestedId, Boolean(startFresh), editId, editChecked]);
  const running = openings.get(key);
  if (running) return running;
  const load = readEditorOpening(request, actor, client).finally(() => {
    if (openings.get(key) === load) openings.delete(key);
  });
  openings.set(key, load);
  return load;
}

const openings = new Map(); // the editor's opening being read, per request

async function readEditorOpening(
  { requestedId = '', startFresh = false, editId = '', editChecked = false, defaults = {} } = {},
  actor,
  client
) {
  const sync = canSyncDrafts(actor);
  const fromServer = async (id) => {
    if (!sync || routesMissing) return null;
    try {
      const found = await fetchServerDraft(client, id, actor);
      return found ? { id, ...found, synced: true } : null;
    } catch {
      return null;
    }
  };
  const load = async (id) => {
    if (!id || isDeletePending(id, actor)) return null;
    await draftOpsSettled(id, actor);
    return keptHere(id, actor) || fromServer(id);
  };

  const requested = await load(requestedId);
  let editing = null;
  if (!requested && editId) {
    const sid = String(editId).trim();
    const here = findEditDraft(sid, actor);
    let newest = null;
    if (sync && !routesMissing && !editChecked) {
      try {
        const rows = await listServerDrafts(client, actor);
        newest =
          rows
            .filter((r) => String(r?.summary?.editing?.scenarioId || '') === sid && !isDeletePending(r.draftId, actor))
            .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0] || null;
      } catch {
        newest = null;
      }
    }
    const pick = here && (!newest || String(here.draft.savedAt) >= String(newest.savedAt)) ? here.id : newest?.draftId;
    editing = pick ? await load(pick) : null;
  }
  const current = !requested && !editing && !startFresh && !editId ? await load(getActiveScenarioDraftId(actor)) : null;
  const opening = decideScenarioEditorOpening(
    { requestedId, startFresh, editId, defaults, requested, editing, current },
    actor
  );
  const resumed = opening.resume ? requested || editing : null;
  return { ...opening, synced: Boolean(resumed?.synced) };
}

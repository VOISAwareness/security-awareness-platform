/**
 * scenarioDraftList — the browser half of scenario drafts: every unpublished
 * scenario a person has saved, so "Start new" keeps the one they were on
 * (listed under Scenarios → Drafts), the way campaign drafts stay under
 * Campaigns → Drafts.
 *
 * Drafts live on the server (scenarioDraftSync.js), so they follow the person
 * to any browser. Every change is also written here at once, and stays here
 * until the server has confirmed that exact content: what this browser lists
 * is the work not sent yet, so closing the tab or going offline loses nothing.
 *
 * Per signed-in person, in this browser (see draftStore.js):
 *   voisshield_scenario_drafts:<email>        { version: 2, drafts: { [draftId]: draft } }, not sent yet
 *   voisshield_active_scenario_draft:<email>  the draftId they were last working on (in this browser)
 *   voisshield_scenario_draft_revs:<email>    { [draftId]: { rev, saves, at } }, see draftSyncState()
 *   voisshield_scenario_draft_deletes:<email> [draftId, ...] deleted here, the server not told yet
 * Each draft is scenarioDraft.js's shape ({ version, savedAt, activeTab, formData, edit? }).
 * An edit of a saved scenario (Scenarios → Edit) is a draft too, one per
 * scenario: its `edit` names the scenario, and Edit on it again reopens it.
 * The one-draft key used before (voisshield_scenario_draft:<email>) is moved in
 * on first read and becomes the active draft. Like every draft kept before
 * drafts were on the server, it is simply not sent yet (rev 0).
 *
 * Only the author's own work is stored; templates are never written.
 */
import { readJSON, readString, removeKey, scopedKey, writeJSON, writeString } from './draftStore.js';
import { SCENARIO_DRAFT_KEY, isMeaningfulDraft, parseDraft } from './scenarioDraft.js';
import { scenarioContentVersion, wasAsked, wasDeferred } from './resumePrompt.js';

export const SCENARIO_DRAFTS_KEY = 'voisshield_scenario_drafts';
export const ACTIVE_SCENARIO_DRAFT_KEY = 'voisshield_active_scenario_draft';
export const SCENARIO_DRAFT_REVS_KEY = 'voisshield_scenario_draft_revs';
export const SCENARIO_DRAFT_DELETES_KEY = 'voisshield_scenario_draft_deletes';
const LIST_VERSION = 2;
const LEGACY_DRAFT_ID = 'SD-saved-before';
// Kept small: a draft's newest saves, and the drafts touched most recently.
const MAX_SAVES = 4;
const MAX_SYNC_ENTRIES = 50;

/** A new draft's id, e.g. "SD-mg8x2k1a7f3q". Ids only need to be unique per person. */
export function newDraftId(now = Date.now()) {
  return `SD-${Number(now).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const listKey = (actor) => scopedKey(SCENARIO_DRAFTS_KEY, actor);
const activeKey = (actor) => scopedKey(ACTIVE_SCENARIO_DRAFT_KEY, actor);
const revsKey = (actor) => scopedKey(SCENARIO_DRAFT_REVS_KEY, actor);
const deletesKey = (actor) => scopedKey(SCENARIO_DRAFT_DELETES_KEY, actor);

const writeAll = (actor, drafts) => writeJSON(listKey(actor), { version: LIST_VERSION, drafts });

function readAll(actor) {
  const raw = readJSON(listKey(actor));
  const drafts = {};
  if (raw && raw.version === LIST_VERSION && raw.drafts && typeof raw.drafts === 'object') {
    for (const [id, value] of Object.entries(raw.drafts)) {
      const draft = parseDraft(value);
      if (draft) drafts[id] = draft;
    }
  }

  // The single draft from before: move it in, and keep offering it. Its id is
  // fixed, so if storage refuses the write it is still listed (and openable)
  // from the old key until a later read manages the move.
  const legacyKey = scopedKey(SCENARIO_DRAFT_KEY, actor);
  const legacy = parseDraft(readJSON(legacyKey));
  if (!legacy) return drafts;
  const next = { ...drafts, [LEGACY_DRAFT_ID]: legacy };
  if (writeAll(actor, next)) {
    removeKey(legacyKey);
    if (!readString(activeKey(actor))) writeString(activeKey(actor), LEGACY_DRAFT_ID);
  }
  return next;
}

/** Drafts kept in this browser (not sent yet), newest first: [{ id, version, savedAt, activeTab, formData }]. */
export function listScenarioDrafts(actor) {
  return Object.entries(readAll(actor))
    .map(([id, draft]) => ({ id, ...draft }))
    .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

export function getScenarioDraft(id, actor) {
  if (!id) return null;
  return readAll(actor)[id] || null;
}

/**
 * The unfinished edit of this scenario kept in this browser, if there is one:
 * { id, draft } or null (the newest, should there ever be two).
 */
export function findEditDraft(scenarioId, actor) {
  const sid = String(scenarioId || '').trim();
  if (!sid) return null;
  const found = listScenarioDrafts(actor).find((d) => d.edit?.scenarioId === sid);
  return found ? { id: found.id, draft: getScenarioDraft(found.id, actor) } : null;
}

/** Remove every unfinished edit of this scenario kept here (it was deleted: nothing left to save onto). */
export function removeEditDrafts(scenarioId, actor) {
  const sid = String(scenarioId || '').trim();
  if (!sid) return;
  for (const d of listScenarioDrafts(actor)) {
    if (d.edit?.scenarioId === sid) removeScenarioDraft(d.id, actor);
  }
}

/** Add or replace one draft. False when storage refused it (full, or blocked). */
export function saveScenarioDraft(id, draft, actor) {
  if (!id || !draft) return false;
  return writeAll(actor, { ...readAll(actor), [id]: draft });
}

function removeCopy(id, actor) {
  const drafts = readAll(actor);
  if (id === LEGACY_DRAFT_ID) removeKey(scopedKey(SCENARIO_DRAFT_KEY, actor));
  if (id in drafts) {
    delete drafts[id];
    if (Object.keys(drafts).length) writeAll(actor, drafts);
    else removeKey(listKey(actor));
  }
}

/** Remove one draft; if it was the one in progress, nothing is in progress any more. */
export function removeScenarioDraft(id, actor) {
  if (!id) return;
  removeCopy(id, actor);
  if (getActiveScenarioDraftId(actor) === id) setActiveScenarioDraftId('', actor);
}

/**
 * The server confirmed this draft's content: this browser's copy is no longer
 * needed. It is still the same draft (and still the one in progress, if it was).
 */
export function dropSentScenarioDraft(id, actor) {
  if (id) removeCopy(id, actor);
}

export function getActiveScenarioDraftId(actor) {
  return readString(activeKey(actor));
}

/** '' clears it. */
export function setActiveScenarioDraftId(id, actor) {
  writeString(activeKey(actor), id || '');
}

// --- What the server has (see scenarioDraftSync.js) ------------------------------

function readRevs(actor) {
  const raw = readJSON(revsKey(actor));
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

const cleanSave = (save) =>
  save && typeof save.saveId === 'string' && save.saveId
    ? {
        saveId: save.saveId,
        fp: typeof save.fp === 'string' ? save.fp : '',
        ...(Number.isInteger(save.rev) && save.rev > 0 ? { rev: save.rev } : {}),
      }
    : null;

/**
 * What this browser knows of a draft on the server: { rev, saves }.
 *  - rev: the server rev the draft kept here is based on, i.e. the baseRev of
 *    its next save; 0 when it was never saved on the server (so every draft
 *    kept before drafts were on the server).
 *  - saves: this browser's newest saves of it, newest first, [{ saveId, fp,
 *    rev? }] (fp = draftFingerprint of what was sent; rev once the server
 *    confirmed it). A save whose answer never came back (the tab closed, the
 *    network dropped) is then still recognised as this browser's own when the
 *    server reports it.
 */
export function draftSyncState(id, actor) {
  const entry = id ? readRevs(actor)[id] : null;
  const rev = Number.isInteger(entry?.rev) && entry.rev > 0 ? entry.rev : 0;
  const saves = Array.isArray(entry?.saves) ? entry.saves.map(cleanSave).filter(Boolean) : [];
  return { rev, saves };
}

function writeSyncState(id, { rev, saves }, actor) {
  const all = readRevs(actor);
  all[id] = { rev, saves: saves.slice(0, MAX_SAVES), at: Date.now() };
  const ids = Object.keys(all).sort((a, b) => (Number(all[b]?.at) || 0) - (Number(all[a]?.at) || 0));
  for (const old of ids.slice(MAX_SYNC_ENTRIES)) delete all[old];
  return writeJSON(revsKey(actor), all);
}

/** The server rev the draft kept here is based on (the baseRev of its next save). */
export function setDraftBaseRev(id, rev, actor) {
  if (!id) return false;
  const state = draftSyncState(id, actor);
  return writeSyncState(id, { ...state, rev: Number.isInteger(rev) && rev > 0 ? rev : 0 }, actor);
}

/** Remember a save of this draft: before it is sent, and again once confirmed (with its rev). */
export function recordDraftSave(id, save, actor) {
  const clean = cleanSave(save);
  if (!id || !clean) return false;
  const state = draftSyncState(id, actor);
  return writeSyncState(id, { ...state, saves: [clean, ...state.saves.filter((s) => s.saveId !== clean.saveId)] }, actor);
}

/** Forget what the server had of a draft (deleted, or published). */
export function forgetDraftSync(id, actor) {
  const all = readRevs(actor);
  if (!id || !(id in all)) return;
  delete all[id];
  if (Object.keys(all).length) writeJSON(revsKey(actor), all);
  else removeKey(revsKey(actor));
}

/** Drafts deleted in this browser whose delete has not reached the server yet. */
export function pendingDraftDeletes(actor) {
  const raw = readJSON(deletesKey(actor));
  return Array.isArray(raw) ? raw.filter((id) => typeof id === 'string' && id) : [];
}

export function isDeletePending(id, actor) {
  return Boolean(id) && pendingDraftDeletes(actor).includes(id);
}

/** Remember a delete until the server confirms it, so the draft cannot come back meanwhile. */
export function addPendingDelete(id, actor) {
  if (!id) return false;
  const ids = pendingDraftDeletes(actor);
  return ids.includes(id) || writeJSON(deletesKey(actor), [...ids, id]);
}

export function clearPendingDelete(id, actor) {
  const ids = pendingDraftDeletes(actor);
  if (!ids.includes(id)) return;
  const rest = ids.filter((x) => x !== id);
  if (rest.length) writeJSON(deletesKey(actor), rest);
  else removeKey(deletesKey(actor));
}

// --- The scenario in progress, and where the editor opens -------------------------

// `current`: the draft the pointer names, read wherever it is kept
// ({ id, draft, rev? } or null). In progress while it holds real work.
const inProgressOf = (current, defaults) =>
  current?.draft && isMeaningfulDraft(current.draft, defaults) ? current : null;

/** The draft the pointer names, as kept in this browser: { id, draft, rev } or null. */
function pointerDraftHere(actor) {
  const id = getActiveScenarioDraftId(actor);
  if (!id || isDeletePending(id, actor)) return null;
  const draft = getScenarioDraft(id, actor);
  return draft ? { id, draft, rev: draftSyncState(id, actor).rev } : null;
}

/**
 * The scenario this person was last working on, if it still holds work worth
 * offering back ("Continue your scenario?"): { id, draft } or null.
 * `current` is the pointer's draft when it was read from the server; left
 * out, it is read from this browser.
 */
export function inProgressScenarioDraft(defaults = {}, actor, current = pointerDraftHere(actor)) {
  return inProgressOf(current, defaults);
}

/**
 * The scenario in progress, if "Continue your scenario?" has not asked about
 * it yet: never, or not since its form last changed (see resumePrompt.js). Once
 * answered it is simply a draft under Scenarios → Drafts. -> { id, draft } | null
 */
export function scenarioDraftToOffer(defaults = {}, actor, current = pointerDraftHere(actor)) {
  const found = inProgressOf(current, defaults);
  if (!found) return null;
  return wasAsked('scenario', found.id, scenarioContentVersion(found.draft), actor) ? null : found;
}

/**
 * The scenario in progress, if "Continue your scenario?" was closed without an
 * answer ("not now"): not asked about on arrival, but asked again once the
 * author starts on a new scenario. -> { id, draft } | null
 */
export function deferredScenarioDraft(defaults = {}, actor, current = pointerDraftHere(actor)) {
  const found = inProgressOf(current, defaults);
  if (!found) return null;
  return wasDeferred('scenario', found.id, scenarioContentVersion(found.draft), actor) ? found : null;
}

/**
 * Which draft the scenario editor opens on, decided once before its first
 * render:
 *  - ?draft=<id> naming a saved draft opens it directly ({ resume });
 *  - ?edit=<scenarioId> (Scenarios → Edit) opens the unfinished edit of that
 *    scenario when there is one, else starts a new edit; either way nothing
 *    else is offered, since the author chose what to work on;
 *  - otherwise the editor works on a new draft (the requested id when one was
 *    given, so a reload keeps it), and — unless the author just chose "Start
 *    new", or was already asked about it — the scenario in progress is offered
 *    back first ({ offer }). One put off with "not now" is not offered, but is
 *    returned as `deferred`: it is offered back at the author's first change.
 * A draft deleted here whose delete has not reached the server yet is never
 * opened, nor its id reused.
 *
 * The drafts to decide between are handed in, read from wherever they are
 * kept, each null when there is none: `requested` ({ draft, rev }, named by
 * ?draft=<id>), `editing` ({ id, draft, rev }, the edit of ?edit=<scenarioId>)
 * and `current` ({ id, draft, rev }, the draft the pointer names).
 * scenarioEditorOpening() reads them from this browser, and
 * loadScenarioEditorOpening() (scenarioDraftSync.js) from the server as well.
 * -> { id, resume: draft | null, rev, offer: { id, draft, rev } | null, deferred: { id, draft, rev } | null }
 *    rev: the server rev the resumed draft is based on (0 for a new one).
 */
export function decideScenarioEditorOpening(
  { requestedId = '', startFresh = false, editId = '', defaults = {}, requested = null, editing = null, current = null } = {},
  actor
) {
  const reusableId = requestedId && !isDeletePending(requestedId, actor) ? requestedId : '';
  if (reusableId && requested?.draft) {
    return { id: reusableId, resume: requested.draft, rev: requested.rev || 0, offer: null, deferred: null };
  }
  if (editing?.draft) return { id: editing.id, resume: editing.draft, rev: editing.rev || 0, offer: null, deferred: null };
  const id = reusableId || newDraftId();
  if (startFresh || editId) return { id, resume: null, rev: 0, offer: null, deferred: null };
  const offer = scenarioDraftToOffer(defaults, actor, current);
  return { id, resume: null, rev: 0, offer, deferred: offer ? null : deferredScenarioDraft(defaults, actor, current) };
}

/** decideScenarioEditorOpening() over the drafts kept in this browser. */
export function scenarioEditorOpening({ requestedId = '', startFresh = false, editId = '', defaults = {} } = {}, actor) {
  const requested = requestedId ? getScenarioDraft(requestedId, actor) : null;
  const editing = editId ? findEditDraft(editId, actor) : null;
  return decideScenarioEditorOpening(
    {
      requestedId,
      startFresh,
      editId,
      defaults,
      requested: requested ? { draft: requested, rev: draftSyncState(requestedId, actor).rev } : null,
      editing: editing ? { ...editing, rev: draftSyncState(editing.id, actor).rev } : null,
      current: pointerDraftHere(actor),
    },
    actor
  );
}

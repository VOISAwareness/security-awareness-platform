/**
 * scenarioDraftList — every unpublished scenario a person has saved, so "Start
 * new" keeps the one they were on (listed under Scenarios → Drafts), the way
 * campaign drafts stay under Campaigns → Drafts.
 *
 * Per signed-in person, in this browser (see draftStore.js):
 *   voisshield_scenario_drafts:<email>        { version: 2, drafts: { [draftId]: draft } }
 *   voisshield_active_scenario_draft:<email>  the draftId they were last working on
 * Each draft is scenarioDraft.js's shape ({ version, savedAt, activeTab, formData }).
 * The one-draft key used before (voisshield_scenario_draft:<email>) is moved in
 * on first read and becomes the active draft.
 *
 * Only the author's own work is stored; templates are never written.
 */
import { readJSON, readString, removeKey, scopedKey, writeJSON, writeString } from './draftStore.js';
import { SCENARIO_DRAFT_KEY, isMeaningfulDraft, parseDraft } from './scenarioDraft.js';
import { scenarioDraftVersion, wasAsked } from './resumePrompt.js';

export const SCENARIO_DRAFTS_KEY = 'voisshield_scenario_drafts';
export const ACTIVE_SCENARIO_DRAFT_KEY = 'voisshield_active_scenario_draft';
const LIST_VERSION = 2;
const LEGACY_DRAFT_ID = 'SD-saved-before';

/** A new draft's id, e.g. "SD-mg8x2k1a7f3q". Ids only need to be unique per person. */
export function newDraftId(now = Date.now()) {
  return `SD-${Number(now).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const listKey = (actor) => scopedKey(SCENARIO_DRAFTS_KEY, actor);
const activeKey = (actor) => scopedKey(ACTIVE_SCENARIO_DRAFT_KEY, actor);

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

/** Saved drafts, newest first: [{ id, version, savedAt, activeTab, formData }]. */
export function listScenarioDrafts(actor) {
  return Object.entries(readAll(actor))
    .map(([id, draft]) => ({ id, ...draft }))
    .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
}

export function getScenarioDraft(id, actor) {
  if (!id) return null;
  return readAll(actor)[id] || null;
}

/** Add or replace one draft. False when storage refused it (full, or blocked). */
export function saveScenarioDraft(id, draft, actor) {
  if (!id || !draft) return false;
  return writeAll(actor, { ...readAll(actor), [id]: draft });
}

/** Remove one draft; if it was the one in progress, nothing is in progress any more. */
export function removeScenarioDraft(id, actor) {
  if (!id) return;
  const drafts = readAll(actor);
  if (id === LEGACY_DRAFT_ID) removeKey(scopedKey(SCENARIO_DRAFT_KEY, actor));
  if (id in drafts) {
    delete drafts[id];
    if (Object.keys(drafts).length) writeAll(actor, drafts);
    else removeKey(listKey(actor));
  }
  if (getActiveScenarioDraftId(actor) === id) setActiveScenarioDraftId('', actor);
}

export function getActiveScenarioDraftId(actor) {
  return readString(activeKey(actor));
}

/** '' clears it. */
export function setActiveScenarioDraftId(id, actor) {
  writeString(activeKey(actor), id || '');
}

/**
 * The scenario this person was last working on, if it still holds work worth
 * offering back ("Continue your scenario?"): { id, draft } or null.
 */
export function inProgressScenarioDraft(defaults = {}, actor) {
  const id = getActiveScenarioDraftId(actor);
  const draft = getScenarioDraft(id, actor);
  return draft && isMeaningfulDraft(draft, defaults) ? { id, draft } : null;
}

/**
 * The scenario in progress, if "Continue your scenario?" has not asked about
 * it yet: never, or not since it last changed (see resumePrompt.js). Once
 * answered it is simply a draft under Scenarios → Drafts. -> { id, draft } | null
 */
export function scenarioDraftToOffer(defaults = {}, actor) {
  const current = inProgressScenarioDraft(defaults, actor);
  if (!current) return null;
  return wasAsked('scenario', current.id, scenarioDraftVersion(current.draft), actor) ? null : current;
}

/**
 * Which draft the scenario editor opens on, decided once before its first
 * render:
 *  - ?draft=<id> naming a saved draft opens it directly ({ resume });
 *  - otherwise the editor works on a new draft (the requested id when one was
 *    given, so a reload keeps it), and — unless the author just chose "Start
 *    new", or was already asked about it — the scenario in progress is offered
 *    back first ({ offer }).
 * -> { id, resume: draft | null, offer: { id, draft } | null }
 */
export function scenarioEditorOpening({ requestedId = '', startFresh = false, defaults = {} } = {}, actor) {
  const requested = requestedId ? getScenarioDraft(requestedId, actor) : null;
  if (requested) return { id: requestedId, resume: requested, offer: null };
  const id = requestedId || newDraftId();
  if (startFresh) return { id, resume: null, offer: null };
  return { id, resume: null, offer: scenarioDraftToOffer(defaults, actor) };
}

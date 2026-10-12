/**
 * resumePrompt — "Continue your campaign?" / "Continue your scenario?" asks
 * about each unfinished item once.
 *
 * Whatever the answer (Continue, Start new, or closing the dialog), the item is
 * remembered here at the version it was asked about. From then on it is simply
 * a draft (Campaigns / Scenarios → Drafts) and is not asked about again, until
 * it changes: work saved after the question gives it a newer version, which is
 * worth one more question.
 *
 * Version:
 *   campaign  the server draft's updatedAt (createdAt for a row without one)
 *   scenario  the browser draft's savedAt
 *
 * Per signed-in person, in this browser (see draftStore.js):
 *   voisshield_resume_asked:<email>  [{ kind, id, version }, ...] newest first
 * Kept to the newest MAX_ENTRIES answers. Storage can be unavailable; then
 * nothing is remembered and the question may simply be asked again.
 */
import { readJSON, scopedKey, writeJSON } from './draftStore.js';

export const RESUME_ASKED_KEY = 'voisshield_resume_asked';
export const MAX_ENTRIES = 50;
const KINDS = new Set(['campaign', 'scenario']);

const text = (v) => (v === null || v === undefined ? '' : String(v));

function readEntries(actor) {
  const raw = readJSON(scopedKey(RESUME_ASKED_KEY, actor));
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e) => e && KINDS.has(e.kind) && typeof e.id === 'string' && e.id && typeof e.version === 'string'
  );
}

/** The version a campaign draft is asked about at. */
export function campaignDraftVersion(draft) {
  return text(draft?.updatedAt || draft?.createdAt);
}

/** The version a saved scenario draft is asked about at. */
export function scenarioDraftVersion(draft) {
  return text(draft?.savedAt);
}

/** Was this person already asked about this item, at this version? */
export function wasAsked(kind, id, version, actor) {
  if (!KINDS.has(kind) || !id) return false;
  const v = text(version);
  return readEntries(actor).some((e) => e.kind === kind && e.id === String(id) && e.version === v);
}

/**
 * Remember that this person was asked about this item at this version (it
 * replaces any older answer for the same item). False when storage refused it.
 */
export function markAsked(kind, id, version, actor) {
  if (!KINDS.has(kind) || !id) return false;
  const entry = { kind, id: String(id), version: text(version) };
  const rest = readEntries(actor).filter((e) => !(e.kind === entry.kind && e.id === entry.id));
  return writeJSON(scopedKey(RESUME_ASKED_KEY, actor), [entry, ...rest].slice(0, MAX_ENTRIES));
}

/**
 * resumePrompt — "Continue your campaign?" / "Continue your scenario?" asks
 * about each unfinished item once.
 *
 * Whatever the answer (Continue, Start new, or closing the dialog), the item is
 * remembered here at the version it was asked about. From then on it is simply
 * a draft (Campaigns / Scenarios → Drafts) and is not asked about again, until
 * the user changes something in it, which is worth one more question.
 *
 * Closing the dialog (its ✕, Esc or a click outside) means "not now": the item
 * is remembered as asked, so coming back does not ask again, but it is still
 * the one in progress (`deferred`), so the scenario editor asks once more as
 * soon as the user starts something new (wasDeferred) and Continue / Start new
 * decide.
 *
 * A campaign saved with "Save as draft", or opened from Drafts, is never asked
 * about (markDraftOnly): it is picked up from Drafts, whatever changes in it.
 *
 * A version is a fingerprint of the item's CONTENT only, never of where the
 * user is in it: moving between steps or tabs saves the step / tab and a new
 * timestamp, and that alone is not a change.
 *   campaign  campaignContentVersions(draft): the server draft without the
 *             wizard step, server and approval metadata, "set by user" flags
 *             and display names copied from an id
 *   scenario  scenarioContentVersion(draft): the saved form only (not the
 *             tab it was on, not savedAt)
 *
 * Per signed-in person, in this browser (see draftStore.js):
 *   voisshield_resume_asked:<email>  [{ kind, id, version, deferred?, draftOnly? }, ...] newest first
 * Kept to the newest MAX_ENTRIES answers. Storage can be unavailable; then
 * nothing is remembered and the question may simply be asked again.
 */
import { readJSON, scopedKey, writeJSON } from './draftStore.js';
import { fromDraft, toDraftFormData } from './scenarioDraft.js';

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

// --- Fingerprints -------------------------------------------------------------

// Comparable form of a value: object keys sorted, strings trimmed, and empty
// values ('', null, false, missing) left out, since a field that was never set
// and one saved empty (or unticked) read the same in the forms.
function compact(value) {
  if (typeof value === 'string') return value.trim() || undefined;
  if (value === null || value === undefined || value === false) return undefined;
  if (Array.isArray(value)) return value.map((item) => compact(item) ?? null);
  if (typeof value !== 'object') return value;
  const out = {};
  for (const key of Object.keys(value).sort()) {
    const clean = compact(value[key]);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

// cyrb53: a small, fast 53-bit string hash. Not for security; it only has to
// tell two versions of one person's draft apart.
function hash53(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i += 1) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** A short, stable fingerprint of a value's content (see compact()). */
export function contentFingerprint(value) {
  const json = JSON.stringify(compact(value) ?? null);
  return `c1-${hash53(json).toString(36)}-${json.length.toString(36)}`;
}

// Campaign draft fields that are not the user's content: where they are in the
// wizard, what the server and the approval flow record, provenance flags, and
// names that only follow an id the user picked (the id itself is content).
const CAMPAIGN_NOT_CONTENT = new Set([
  'wizardStep',
  'campaignId',
  'createdAt',
  'updatedAt',
  'status',
  'createdBy',
  'submittedBy',
  'submittedAt',
  'submissionComments',
  'approvedBy',
  'approvedAt',
  'approvalComments',
  'rejectedBy',
  'rejectedAt',
  'rejectionComments',
  'changesRequested',
  'withdrawnBy',
  'withdrawnAt',
  'withdrawalComments',
  'loadedData',
  'campaignTitleSetByUser',
  'campaignDescriptionSetByUser',
  'landingPageAttachedByUser',
  'trainingPathAttachedByUser',
  'scenarioName',
  'landingPageName',
  'trainingPathName',
  'selectedListName',
]);

// What a step shows for a field the draft does not have yet. Moving through
// that step saves the default, which must read the same as never set.
const CAMPAIGN_DEFAULTS = { autoEndPostSending: true };

function campaignContent(draft, { withLandingPage = true } = {}) {
  const out = {};
  for (const [key, value] of Object.entries(draft || {})) {
    if (CAMPAIGN_NOT_CONTENT.has(key)) continue;
    if (key === 'landingPageContent' && !withLandingPage) continue;
    out[key] = value;
  }
  for (const [key, fallback] of Object.entries(CAMPAIGN_DEFAULTS)) {
    const value = out[key] === undefined || out[key] === null ? fallback : out[key];
    // The default reads as not set; anything else is kept, as text so that
    // compact() does not drop an unticked box (false) as "not set".
    if (value === fallback) delete out[key];
    else out[key] = String(value);
  }
  return out;
}

/**
 * The campaign draft's content version(s); the first is the one to remember.
 *
 * Moving on from the landing page step saves the template's landing page into
 * the draft the first time, which is not the user's doing. So a draft without
 * its own landing page yet also matches what it was asked about once the page
 * has been copied in (the second version leaves the landing page out).
 */
export function campaignContentVersions(draft) {
  const full = contentFingerprint(campaignContent(draft));
  const withoutLanding = contentFingerprint(campaignContent(draft, { withLandingPage: false }));
  return full === withoutLanding ? [full] : [full, withoutLanding];
}

/**
 * A saved scenario draft's content version: its form as the editor restores
 * it (fromDraft), without the tab it was on or when it was saved.
 */
export function scenarioContentVersion(draft) {
  if (!draft) return contentFingerprint(null);
  return contentFingerprint(toDraftFormData(fromDraft(draft).formData));
}

// --- Asked / not asked ----------------------------------------------------------

const versionList = (version) => (Array.isArray(version) ? version : [version]).map(text);

/**
 * Was this person already asked about this item, at this version? `version`
 * may be a list of versions that all describe the item as it is now. An item
 * kept to Drafts (markDraftOnly) counts as asked at every version.
 */
export function wasAsked(kind, id, version, actor) {
  if (!KINDS.has(kind) || !id) return false;
  const versions = versionList(version);
  return readEntries(actor).some(
    (e) => e.kind === kind && e.id === String(id) && (e.draftOnly === true || versions.includes(e.version))
  );
}

/**
 * Remember that this person was asked about this item at this version (it
 * replaces any older answer for the same item). For a list, the first one is
 * remembered. False when storage refused it.
 */
export function markAsked(kind, id, version, actor) {
  return remember(kind, id, version, actor);
}

/**
 * The dialog was closed without an answer ("not now"): asked, as markAsked, but
 * still to be decided once the user starts something new (wasDeferred).
 */
export function markDeferred(kind, id, version, actor) {
  return remember(kind, id, version, actor, { deferred: true });
}

/**
 * Saved with "Save as draft", or opened from Drafts: from now on the item is
 * picked up from Drafts only and never asked about, whatever changes in it.
 * Later answers about it keep this.
 */
export function markDraftOnly(kind, id, actor) {
  return remember(kind, id, '', actor, { draftOnly: true });
}

/** Was the question about this item, at this version, put off ("not now")? */
export function wasDeferred(kind, id, version, actor) {
  if (!KINDS.has(kind) || !id) return false;
  const versions = versionList(version);
  return readEntries(actor).some(
    (e) => e.kind === kind && e.id === String(id) && versions.includes(e.version) && e.deferred === true
  );
}

function remember(kind, id, version, actor, { deferred = false, draftOnly = false } = {}) {
  if (!KINDS.has(kind) || !id) return false;
  const entry = { kind, id: String(id), version: versionList(version)[0] };
  if (deferred) entry.deferred = true;
  const entries = readEntries(actor);
  const same = (e) => e.kind === entry.kind && e.id === entry.id;
  if (draftOnly || entries.some((e) => same(e) && e.draftOnly === true)) entry.draftOnly = true;
  const rest = entries.filter((e) => !same(e));
  return writeJSON(scopedKey(RESUME_ASKED_KEY, actor), [entry, ...rest].slice(0, MAX_ENTRIES));
}

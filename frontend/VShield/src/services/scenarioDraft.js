/**
 * scenarioDraft — the pure half of the scenario editor's save/resume
 * (useScenarioDraft holds the React and storage half). No React or DOM here, so
 * it runs under `node --test`.
 *
 * A saved draft is the author's OWN unpublished scenario: the wizard's formData
 * plus the step they were on. Anything they started from (a template email,
 * landing page, training path or cover) was copied into formData when chosen, so
 * saving or restoring a draft never reads back into, or writes to, a template.
 *
 * Stored shape of one draft: { version, savedAt, activeTab, formData, edit? }.
 * Where drafts are kept, and how many, is scenarioDraftList.js's business.
 *
 * An EDIT draft (Scenarios → Edit) also records what it edits:
 *   edit: { scenarioId, mode, name, ownership?, baseline? }
 * mode is how Save stores it (scenarioOwnership.js: 'copy' | 'revision' |
 * 'update'), name the scenario's name when the edit began, and baseline a
 * fingerprint of the form as it opened, so an edit only becomes a draft once
 * something in it actually changed.
 */

// The one-draft-per-person key used before drafts were listed; now only read,
// to move such a draft into scenarioDraftList.js's list.
export const SCENARIO_DRAFT_KEY = 'voisshield_scenario_draft';
export const SCENARIO_DRAFT_VERSION = 1;

// Mirrors the step strip in ScenarioDeatils.jsx (ScenarioTabs).
export const SCENARIO_STEPS = [
  'Scenario Details',
  'Email Details',
  'Attach Outcomes',
  'Review & Publish',
];

// Session-only state that must never be saved: the raw cover File, and any
// "is…Open" modal flag should one ever be lifted into formData.
const EPHEMERAL_FIELDS = new Set(['coverImage']);
const OPEN_FLAG = /^is[A-Z]\w*Open$/;

// Fields whose value means the author has done some work worth offering back.
// Defaults (the pre-filled email body) do not count.
const MEANINGFUL_FIELDS = [
  'scenarioId',
  'scenarioName',
  'description',
  'type',
  'targetAudience',
  'motivator',
  'difficulty',
  'emailId',
  'senderName',
  'emailSubject',
  'emailBody',
  'coverImageSource',
  'coverImageKey',
  'coverImageReattach',
  'landingPageSource',
  'outcomeSource',
  'outcomeRichText',
  'trainingSource',
];

const isBlobLike = (value) =>
  typeof Blob !== 'undefined' && value instanceof Blob;

const isBlobUrl = (value) => typeof value === 'string' && value.startsWith('blob:');

// A presigned S3 link (an uploaded cover the API handed back signed): it stops
// working within the hour, and the draft keeps the cover's key instead.
const isPresignedUrl = (value) => typeof value === 'string' && /^https?:\/\/[^?\s]+\?\S*X-Amz-/.test(value);

const EDIT_MODES = new Set(['copy', 'revision', 'update']);

const clampStep = (step) => {
  const n = Number.parseInt(step, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, SCENARIO_STEPS.length - 1);
};

/**
 * Deep copy that keeps only what JSON can carry and a reload can use. Drops
 * Files/Blobs, blob: URLs (dead after a reload), presigned links (dead within
 * the hour), functions, class instances
 * (DOM nodes, Dates) and cycles. Returns undefined for a dropped value.
 */
function sanitize(value, seen) {
  if (value === null) return null;
  if (typeof value === 'string') return isBlobUrl(value) || isPresignedUrl(value) ? undefined : value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'object' || isBlobLike(value) || seen.has(value)) return undefined;

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => {
        const clean = sanitize(item, seen);
        return clean === undefined ? null : clean;
      });
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return undefined;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const clean = sanitize(v, seen);
      if (clean !== undefined) out[k] = clean;
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

/** The serialisable part of the wizard's formData. */
export function toDraftFormData(formData = {}) {
  const out = {};
  for (const [field, value] of Object.entries(formData || {})) {
    if (EPHEMERAL_FIELDS.has(field) || OPEN_FLAG.test(field)) continue;
    const clean = sanitize(value, new WeakSet());
    if (clean !== undefined) out[field] = clean;
  }
  return out;
}

/** What an edit draft records about the scenario it edits, or null if `raw` is not one. */
export function parseEdit(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const scenarioId = typeof raw.scenarioId === 'string' ? raw.scenarioId.trim() : '';
  if (!scenarioId || !EDIT_MODES.has(raw.mode)) return null;
  const edit = { scenarioId, mode: raw.mode, name: typeof raw.name === 'string' ? raw.name.trim() : '' };
  if (typeof raw.ownership === 'string' && raw.ownership) edit.ownership = raw.ownership;
  if (typeof raw.baseline === 'string' && raw.baseline) edit.baseline = raw.baseline;
  return edit;
}

// `edit` only when there is one, so a new scenario's draft keeps its shape.
const withEdit = (draft, raw) => {
  const edit = parseEdit(raw);
  return edit ? { ...draft, edit } : draft;
};

export function buildDraft(formData, activeTab, now = new Date(), edit = null) {
  return withEdit(
    {
      version: SCENARIO_DRAFT_VERSION,
      savedAt: now.toISOString(),
      activeTab: clampStep(activeTab),
      formData: toDraftFormData(formData),
    },
    edit
  );
}

/** A stored value back into a draft, or null if it is missing, foreign or from another schema. */
export function parseDraft(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.version !== SCENARIO_DRAFT_VERSION) return null;
  if (!raw.formData || typeof raw.formData !== 'object' || Array.isArray(raw.formData)) return null;
  return withEdit(
    {
      version: raw.version,
      savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : '',
      activeTab: clampStep(raw.activeTab),
      formData: raw.formData,
    },
    raw.edit
  );
}

/**
 * True when the draft holds work worth offering back ("Continue your scenario?").
 * An edit counts once its form differs from the scenario as it opened (going
 * through the steps alone is not work); a new scenario once anything is filled
 * in beyond the defaults, or the author got past the first step.
 */
export function isMeaningfulDraft(draft, defaults = {}) {
  if (!draft || !draft.formData) return false;
  if (draft.edit) return !draft.edit.baseline || formFingerprint(draft.formData) !== draft.edit.baseline;
  if (clampStep(draft.activeTab) > 0) return true;
  return MEANINGFUL_FIELDS.some((field) => {
    const value = draft.formData[field];
    if (value === null || value === undefined || value === false) return false;
    if (typeof value !== 'string') return true;
    const text = value.trim();
    return text !== '' && text !== String(defaults[field] ?? '').trim();
  });
}

/**
 * Restore a draft into { formData, activeTab } for the wizard to merge over its
 * blank form. A cover upload that never reached storage cannot come back (a File
 * is not saved), so it is cleared and flagged for the author to attach again.
 */
export function fromDraft(draft) {
  const edit = parseEdit(draft?.edit);
  const form = { ...(draft?.formData || {}), coverImage: null };

  if (form.coverImageSource === 'upload') {
    if (form.coverImageKey) {
      form.coverImagePreview = form.coverImageThumbnail || '';
    } else {
      form.coverImageReattach = form.coverImageName || 'Cover image';
      form.coverImageSource = '';
      form.coverImageName = '';
      form.coverImagePreview = '';
      form.coverImageThumbnail = '';
    }
  }

  const restored = { formData: form, activeTab: clampStep(draft?.activeTab) };
  return edit ? { ...restored, edit } : restored;
}

// The content of a draft in a comparable form: keys sorted, and empty values
// ('' / null) left out, since a field that is missing reads back as the blank
// form's empty value anyway.
function contentKey(formData, activeTab) {
  const compact = (value) => {
    if (Array.isArray(value)) return value.map(compact);
    if (!value || typeof value !== 'object') return value;
    const out = {};
    for (const k of Object.keys(value).sort()) {
      if (value[k] !== '' && value[k] !== null) out[k] = compact(value[k]);
    }
    return out;
  };
  return JSON.stringify([clampStep(activeTab), compact(toDraftFormData(formData))]);
}

/**
 * A short fingerprint of a form's content (as contentKey reads it), so an edit
 * draft can tell whether anything changed since the scenario was opened
 * without storing the whole original. FNV-1a, 32 bits.
 */
export function formFingerprint(formData) {
  const text = contentKey(formData, 0);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${text.length.toString(36)}-${hash.toString(36)}`;
}

/**
 * A short fingerprint of a whole draft's content (its step and form, as
 * sameDraftContent reads them), so a save sent to the server can later be
 * recognised as this content (scenarioDraftSync.js).
 */
export function draftFingerprint(draft) {
  return `${clampStep(draft?.activeTab)}.${formFingerprint(draft?.formData || {})}`;
}

/**
 * Does `draft` hold exactly what is already `stored` (same form, same step)?
 * Also true when it is the stored draft as a resume reads it back (fromDraft),
 * so opening a draft and leaving it untouched is not mistaken for new work.
 */
export function sameDraftContent(draft, stored) {
  if (!draft || !stored) return false;
  const next = contentKey(draft.formData, draft.activeTab);
  if (next === contentKey(stored.formData, stored.activeTab)) return true;
  const restored = fromDraft(stored);
  return next === contentKey(restored.formData, restored.activeTab);
}

/** What the resume prompt and the Drafts list show about a saved draft. */
export function draftSummary(draft) {
  const form = draft?.formData || {};
  const step = clampStep(draft?.activeTab);
  const summary = {
    name: String(form.scenarioName || '').trim() || 'Untitled scenario',
    scenarioId: String(form.scenarioId || '').trim(),
    description: String(form.description || '').trim(),
    step: step + 1,
    stepCount: SCENARIO_STEPS.length,
    stepName: SCENARIO_STEPS[step],
    savedAt: draft?.savedAt || '',
    // A small picture for the Drafts card: an uploaded cover's thumbnail, or
    // the catalogue cover picked.
    cover:
      form.coverImageThumbnail ||
      (form.coverImageSource === 'catalogue' ? form.coverImagePreview || '' : ''),
    // 'upload' frames `cover` as a photo; 'catalogue' shows it as card art.
    coverSource: form.coverImageSource || '',
    needsCoverReattach:
      (form.coverImageSource === 'upload' && !form.coverImageKey) ||
      Boolean(form.coverImageReattach),
  };
  // An edit: which scenario it edits, named as it was when the edit began.
  const edit = parseEdit(draft?.edit);
  return edit
    ? { ...summary, editing: { scenarioId: edit.scenarioId, mode: edit.mode, name: edit.name || summary.name } }
    : summary;
}

/**
 * The cover key Publish can reuse instead of uploading again: only an upload's
 * key, and only when it was made for the scenario id being published (the id is
 * the key's folder, and the API clears that folder when the scenario is deleted).
 */
export function reusableCoverKey(formData = {}) {
  if (formData.coverImageSource !== 'upload' || !formData.coverImageKey) return '';
  return formData.coverImageKeyScenarioId === formData.scenarioId ? formData.coverImageKey : '';
}

/**
 * The upload key is `<scenarioId>/<fileName>`, so a fixed file name under an id
 * that already exists would overwrite that scenario's cover in S3 (a template's,
 * say) before the duplicate-id check at Publish ever runs. A per-upload prefix
 * keeps every upload a new object.
 */
export function uniqueCoverFileName(name, now = Date.now()) {
  const base = String(name || 'cover').split(/[\\/]/).pop() || 'cover';
  const stamp = Number(now).toString(36);
  const salt = Math.random().toString(36).slice(2, 6);
  return `${stamp}${salt}-${base}`;
}

/** The same image under a unique name (see uniqueCoverFileName). */
export function withUniqueCoverName(file, now = Date.now()) {
  if (!file || typeof File === 'undefined') return file;
  return new File([file], uniqueCoverFileName(file.name, now), {
    type: file.type,
    lastModified: file.lastModified,
  });
}

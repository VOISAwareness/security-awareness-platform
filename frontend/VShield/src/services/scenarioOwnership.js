/**
 * scenarioOwnership — what each person may do with a scenario on the Scenarios
 * screen, and what Save sends when a scenario is edited. Pure: no React, DOM or
 * fetch, so it runs under `node --test`.
 *
 * The rules are the reference API's. `GET /scenarios?viewer=<email>` returns the
 * rows that person may see, each annotated with `ownership`:
 *   template    a fixed template. Everyone may edit it, as a personal copy.
 *   shared      someone else's scenario, shared because a sent campaign used it.
 *               Editing makes a personal copy.
 *   mine        the viewer's own scenario. Private until a campaign using it is
 *               sent; then shared (`isShared`), and edited through a revision.
 *   myCopy      the viewer's copy of a template / someone else's shared scenario,
 *               shown to them instead of it. Always private.
 *   myRevision  the viewer's pending edit of their own shared scenario, shown to
 *               them instead of it, until a campaign that used it is sent.
 * An older API sends no annotations, and every row: visibleForViewer applies
 * the same hiding the API would (other people's copies and pending edits,
 * published revisions, what the viewer's own copies stand in for), and rows are
 * read by `createdBy`: none -> template, the viewer's -> mine (or myCopy /
 * myRevision when the row says what it stands in for), anyone else's -> shared.
 *
 * Identity is client-asserted (identity.js) until Entra ID sign-in exists, so
 * "Only you" keeps honest users out of each other's way. It is NOT a security
 * boundary: anyone can claim any address.
 */
import { toStoredScenario } from './scenarioMapper.js';

export const OWNERSHIPS = ['template', 'shared', 'mine', 'myCopy', 'myRevision'];
export const EDIT_MODES = ['copy', 'revision', 'update'];

const identity = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

/** The API's `ownership` when it sent one, else read from createdBy (older API). */
export function ownershipOf(row, viewer) {
  if (OWNERSHIPS.includes(row?.ownership)) return row.ownership;
  const author = identity(row?.createdBy);
  if (!author) return 'template';
  if (author !== identity(viewer)) return 'shared';
  if (row.copyOf) return 'myCopy';
  if (row.revisionOf) return 'myRevision';
  return 'mine';
}

const scenarioKind = (row) => {
  if (row?.copyOf) return 'copy';
  if (row?.revisionOf) return 'revision';
  return identity(row?.createdBy) ? 'own' : 'template';
};

/** True when the API annotated the rows (it was asked with ?viewer= and knows how). */
export function isAnnotated(rows) {
  return Array.isArray(rows) && rows.some((row) => typeof row?.ownership === 'string');
}

/**
 * The rows an older API (no annotations) returned, cut down to what the
 * viewer may see, as the API itself would: other people's copies and pending
 * edits are never shown, nor a published revision; the viewer's own copy
 * stands in for the template / someone else's scenario it copies, and their
 * own pending edit for their scenario it revises. (Who has shared what is
 * unknown there, so other people's own scenarios stay listed, as "Shared".)
 */
export function visibleForViewer(rows, viewer) {
  const who = identity(viewer);
  const mine = (row) => Boolean(who) && identity(row?.createdBy) === who;
  const copied = new Set();
  const revised = new Set();
  for (const row of rows || []) {
    if (!row || row.publishedAt || !mine(row)) continue;
    if (scenarioKind(row) === 'copy') copied.add(String(row.copyOf));
    if (scenarioKind(row) === 'revision') revised.add(String(row.revisionOf));
  }
  return (rows || []).filter((row) => {
    if (!row || row.publishedAt) return false;
    const id = String(row.scenarioId);
    switch (scenarioKind(row)) {
      case 'template':
        return !copied.has(id);
      case 'own':
        return mine(row) ? !revised.has(id) : !copied.has(id);
      default:
        return mine(row);
    }
  });
}

/** What this person may see of a scenario list: the API's annotated rows as they are, an older API's filtered. */
export function scenariosForViewer(rows, viewer) {
  if (!Array.isArray(rows)) return [];
  return isAnnotated(rows) ? rows : visibleForViewer(rows, viewer);
}

/** The id this row stands in for, for this viewer (their copy / pending edit), else ''. */
export function replacedId(row, viewer) {
  if (typeof row?.ownership === 'string') return row.replaces ? String(row.replaces) : '';
  if (!row || row.publishedAt) return '';
  const ownership = ownershipOf(row, viewer);
  if (ownership === 'myCopy') return String(row.copyOf);
  if (ownership === 'myRevision') return String(row.revisionOf);
  return '';
}

/**
 * The row to open for Edit of `scenarioId`, from the viewer's list: their own
 * version of it when they have one (a copy, or a pending edit, stands in for
 * it), else the row itself; null when the list doesn't hold it.
 */
export function rowToEdit(rows, scenarioId, viewer) {
  const sid = String(scenarioId || '').trim();
  if (!sid) return null;
  const list = scenariosForViewer(rows, viewer);
  return (
    list.find((row) => replacedId(row, viewer) === sid) ||
    list.find((row) => String(row?.scenarioId) === sid) ||
    null
  );
}

/**
 * Whether a row read on its own (GET /scenarios/{id}, no annotations) is one
 * this person could see in their list, so may open for editing.
 */
export function canOpenForEdit(row, viewer) {
  return Boolean(row?.scenarioId) && visibleForViewer([row], viewer).length === 1;
}

// " of SC-101": what a copy / pending edit stands in for, when the API said.
const standsInFor = (row) => (row?.replaces ? ` of ${row.replaces}` : '');

/** What the card's destructive button does, and how it asks first. */
export const DELETE_KINDS = {
  delete: { label: 'Delete', confirm: 'Delete this scenario?', yes: 'Yes, delete' },
  reset: { label: 'Reset to original', confirm: 'Reset to original?', yes: 'Yes, reset' },
  discard: { label: 'Discard changes', confirm: 'Discard your changes?', yes: 'Yes, discard' },
};

export const SHARED_NO_DELETE = "Shared scenarios can't be deleted: a sent campaign used this one.";

/**
 * The card's buttons and badge for this viewer:
 *   { ownership, canEdit, editMode, canDelete, deleteKind, deleteBlocked, badge, badgeHint }
 * editMode: 'copy' (POST copyOf), 'revision' (POST revisionOf) or 'update' (PUT).
 * deleteKind: a DELETE_KINDS key, or null. deleteBlocked: why Delete is shown
 * but unavailable (a shared own scenario), else ''.
 */
export function cardActions(row, viewer) {
  const ownership = ownershipOf(row, viewer);
  const base = { ownership, canEdit: true, canDelete: false, deleteKind: null, deleteBlocked: '' };
  switch (ownership) {
    case 'shared':
      return {
        ...base,
        editMode: 'copy',
        badge: 'Shared',
        badgeHint: 'Shared by its creator. Edit makes your own copy, which only you see.',
      };
    case 'mine':
      if (row?.isShared === true) {
        return {
          ...base,
          editMode: 'revision',
          deleteBlocked: SHARED_NO_DELETE,
          badge: 'Shared',
          badgeHint:
            'Everyone can use this: a sent campaign used it. Your edits stay with you until a campaign using them is sent.',
        };
      }
      return {
        ...base,
        editMode: 'update',
        canDelete: true,
        deleteKind: 'delete',
        badge: 'Only you',
        badgeHint: 'Only you see this until a campaign using it is sent.',
      };
    case 'myCopy':
      return {
        ...base,
        editMode: 'update',
        canDelete: true,
        deleteKind: 'reset',
        badge: 'Your version',
        badgeHint: `Your own copy${standsInFor(row)}, shown to you instead of the original. Only you see it.`,
      };
    case 'myRevision':
      return {
        ...base,
        editMode: 'update',
        canDelete: true,
        deleteKind: 'discard',
        badge: 'Your edit — not live yet',
        badgeHint: `Your edit${standsInFor(row)}. Only you see it until a campaign using it is sent; then it goes live for everyone.`,
      };
    default:
      return { ...base, editMode: 'copy', badge: '', badgeHint: '' };
  }
}

/**
 * What an edit draft records about the scenario being edited (see
 * scenarioDraft.js): { scenarioId, mode, name, ownership }.
 */
export function editContext(row, viewer) {
  const { ownership, editMode } = cardActions(row, viewer);
  return {
    scenarioId: String(row?.scenarioId || ''),
    mode: editMode,
    name: String(row?.scenarioName || '').trim(),
    ownership,
  };
}

/** Who sees the saved result, for the "Saved" message. */
export function savedAudience(edit) {
  if (edit?.mode === 'copy' || edit?.ownership === 'myCopy') return 'Only you see this version.';
  if (edit?.mode === 'revision' || edit?.ownership === 'myRevision') {
    return 'Your change goes live for everyone when a campaign using it is sent.';
  }
  return 'Only you see it until a campaign using it is sent.';
}

/** What saving this edit will do, shown in the editor's header while editing. */
export function editNote(edit) {
  if (edit?.mode === 'copy') return 'Saving makes your own copy. Only you see it.';
  if (edit?.mode === 'revision') return 'Shared: your edit stays with you until a campaign using it is sent.';
  return savedAudience(edit);
}

/** Why the scenario ID can't be changed while editing (its field's hover text). */
export function idLockHint(edit) {
  if (edit?.mode === 'copy') return 'Your copy gets its own ID when you save.';
  if (edit?.mode === 'revision') return 'Your edit is saved under its own ID until it goes live.';
  return "A saved scenario's ID can't be changed.";
}

/**
 * The request that saves an edit: { method, id, body }.
 *   copy      POST /scenarios  {...scenario, createdBy, copyOf: row.scenarioId}
 *   revision  POST /scenarios  {...scenario, createdBy, revisionOf: row.scenarioId}
 *   update    PUT /scenarios/<row.scenarioId>  {...scenario, actor}
 * The scenario is toStoredScenario's record, so the API's annotations
 * (ownership, isShared, replaces, coverImageKey) are never sent. No scenarioId
 * or CreatedOn: the API names a copy or revision itself, and a PUT keeps them.
 * `coverImageId` undefined keeps the form's stored cover (its key, never a
 * presigned URL); `landingPageId` undefined keeps the form's.
 */
export function toSavePayload(formData = {}, { mode, row, viewer, coverImageId, landingPageId } = {}) {
  if (!EDIT_MODES.includes(mode)) throw new Error(`Unknown edit mode: ${mode}`);
  const targetId = String(row?.scenarioId || '');
  if (!targetId) throw new Error('No scenario to save the edit to');
  const record = Object.fromEntries(
    Object.entries(toStoredScenario(formData, { coverImageId, landingPageId })).filter(
      ([field]) => field !== 'scenarioId' && field !== 'CreatedOn'
    )
  );
  const who = identity(viewer);
  if (mode === 'update') return { method: 'PUT', id: targetId, body: { ...record, actor: who } };
  const link = mode === 'copy' ? 'copyOf' : 'revisionOf';
  return { method: 'POST', id: '', body: { ...record, createdBy: who, [link]: targetId } };
}

/**
 * The person's own version (copy / pending edit) the API named when it refused
 * to make another (POST answered 409 with `existingId`), else ''. Saving is
 * then refused: the edit's content must never be written over that version,
 * which may hold changes of its own.
 */
export function existingVersionId(plan, error) {
  if (plan?.method !== 'POST' || error?.status !== 409) return '';
  const existingId = error?.payload?.error?.existingId;
  return existingId ? String(existingId) : '';
}

/** Why Save refused: the person already has their own version of this scenario. */
export function conflictMessage(existingId) {
  return (
    `You already have your own version of this scenario (${existingId}), so nothing was saved over it. ` +
    'Your changes here stay under Scenarios → Drafts; open your version from the Scenarios list to change it.'
  );
}

/**
 * An edit in progress (an edit draft can be days old) checked against the
 * viewer's list as it is now -> { edit, change, existingId }:
 *   same       nothing that matters changed (edit refreshed: mode, ownership)
 *   nowShared  their own scenario was shared since (a sent campaign used it):
 *              the edit is now saved as a pending revision
 *   mode       the save mode changed otherwise
 *   replaced   they now have their own version of it (existingId): saving
 *              would make a second one, so it is refused
 *   gone       the scenario is no longer in their list (deleted, or an edit
 *              that went live)
 * Everything else the edit records (name, baseline) is kept.
 */
export function refreshEdit(edit, rows, viewer) {
  const sid = String(edit?.scenarioId || '');
  const list = scenariosForViewer(rows, viewer);
  const row = list.find((r) => String(r?.scenarioId) === sid);
  if (!row) {
    // Hidden from them because their own version now stands in for it?
    const standIn = list.find((r) => replacedId(r, viewer) === sid);
    if (standIn) return { edit, change: 'replaced', existingId: String(standIn.scenarioId) };
    return { edit, change: 'gone', existingId: '' };
  }
  const { mode, ownership } = editContext(row, viewer);
  const next = { ...edit, mode, ownership };
  if (mode === edit.mode) return { edit: next, change: 'same', existingId: '' };
  return { edit: next, change: mode === 'revision' ? 'nowShared' : 'mode', existingId: '' };
}

/** What the editor tells the person about refreshEdit's finding ('' when nothing to say). */
export function refreshNotice({ change, existingId } = {}) {
  if (change === 'nowShared') {
    return (
      'This scenario has been shared since you started (a sent campaign used it), so saving now keeps ' +
      'your change with you until a campaign using it is sent.'
    );
  }
  if (change === 'replaced') return conflictMessage(existingId);
  if (change === 'gone') {
    return "This scenario isn't in your list any more (deleted, or its edit went live), so these changes can't be saved onto it.";
  }
  return '';
}

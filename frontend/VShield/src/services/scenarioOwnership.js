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
 * An older API sends no annotations; its rows are read by `createdBy`: none ->
 * template, the viewer's -> mine (or myCopy / myRevision when the row says
 * what it stands in for), anyone else's -> shared.
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
 * A copy or revision the person already has (POST answered 409 with
 * `existingId`): the same save as a PUT onto that one. Null for anything else.
 */
export function retryOnExisting(plan, error, viewer) {
  const existingId = error?.status === 409 ? error?.payload?.error?.existingId : '';
  if (plan?.method !== 'POST' || !existingId) return null;
  const body = Object.fromEntries(
    Object.entries(plan.body || {}).filter(([field]) => !['createdBy', 'copyOf', 'revisionOf'].includes(field))
  );
  return { method: 'PUT', id: String(existingId), body: { ...body, actor: identity(viewer) } };
}

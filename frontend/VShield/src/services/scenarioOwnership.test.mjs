import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DELETE_KINDS,
  canOpenForEdit,
  cardActions,
  conflictMessage,
  editContext,
  editNote,
  existingVersionId,
  idLockHint,
  isAnnotated,
  nextScenarioId,
  ownershipOf,
  refreshEdit,
  refreshNotice,
  replacedId,
  rowToEdit,
  savedAudience,
  scenariosForViewer,
  toSavePayload,
  visibleForViewer,
} from './scenarioOwnership.js';
import { toWizardFormData } from './scenarioMapper.js';

const ALICE = 'alice@x.test';
const BOB = 'bob@x.test';

const row = (fields = {}) => ({
  scenarioId: 'SC-1',
  scenarioName: 'Parcel lure',
  description: 'A parcel is waiting',
  campaignType: 'Data Entry',
  targetAudience: 'All Employees',
  motivator: 'Urgency',
  difficulty: 'High',
  senderEmailId: 'it@x.test',
  senderName: 'IT',
  emailSubject: 'Your parcel',
  emailBody: '<p>Parcel</p>',
  CoverImageID: 'CovImg-001.png',
  CreatedOn: '1-Jan-26',
  landingPageId: 'LP-001',
  trainingId: 'TP-00001',
  ...fields,
});

// --- ownershipOf ---------------------------------------------------------------

test('the API annotation wins', () => {
  for (const ownership of ['template', 'shared', 'mine', 'myCopy', 'myRevision']) {
    assert.equal(ownershipOf(row({ ownership, createdBy: BOB }), ALICE), ownership);
  }
});

test('an older API (no annotations) is read by createdBy', () => {
  assert.equal(ownershipOf(row(), ALICE), 'template');
  assert.equal(ownershipOf(row({ createdBy: '  ' }), ALICE), 'template');
  assert.equal(ownershipOf(row({ createdBy: ALICE }), ALICE), 'mine');
  assert.equal(ownershipOf(row({ createdBy: 'Alice@X.test' }), ' ALICE@x.test '), 'mine');
  assert.equal(ownershipOf(row({ createdBy: BOB }), ALICE), 'shared');
  assert.equal(ownershipOf(row({ createdBy: BOB }), ''), 'shared');
  assert.equal(ownershipOf(row({ ownership: 'bogus' }), ALICE), 'template');
});

test('without annotations, the viewer\'s own copy or revision is still told apart', () => {
  assert.equal(ownershipOf(row({ createdBy: ALICE, copyOf: 'SC-9' }), ALICE), 'myCopy');
  assert.equal(ownershipOf(row({ createdBy: ALICE, revisionOf: 'SC-9' }), ALICE), 'myRevision');
  assert.equal(ownershipOf(row({ createdBy: BOB, copyOf: 'SC-9' }), ALICE), 'shared');
});

// --- cardActions -----------------------------------------------------------------

const actions = (fields, viewer = ALICE) => {
  const a = cardActions(row(fields), viewer);
  return [a.editMode, a.canDelete, a.deleteKind, a.badge];
};

test('the matrix: edit mode, delete and badge per ownership', () => {
  assert.deepEqual(actions({ ownership: 'template' }), ['copy', false, null, '']);
  assert.deepEqual(actions({ ownership: 'shared', isShared: true, createdBy: BOB }), ['copy', false, null, 'Shared']);
  assert.deepEqual(actions({ ownership: 'mine', isShared: false, createdBy: ALICE }), ['update', true, 'delete', 'Only you']);
  assert.deepEqual(actions({ ownership: 'mine', isShared: true, createdBy: ALICE }), ['revision', true, 'deleteShared', 'Shared']);
  assert.deepEqual(actions({ ownership: 'myCopy', copyOf: 'SC-9' }), ['update', true, 'delete', 'Edited from SC-9']);
  assert.deepEqual(actions({ ownership: 'myRevision', replaces: 'SC-9' }), ['update', true, 'discard', 'Your edit — not live yet']);
});

test('everyone can edit; the owner of a shared scenario may delete it, warned first', () => {
  for (const ownership of ['template', 'shared', 'mine', 'myCopy', 'myRevision']) {
    const a = cardActions(row({ ownership, isShared: ownership === 'shared' }), ALICE);
    assert.equal(a.canEdit, true, ownership);
    assert.equal(a.ownership, ownership);
  }
  const shared = cardActions(row({ ownership: 'mine', isShared: true }), ALICE);
  assert.equal(shared.canDelete, true);
  assert.match(DELETE_KINDS[shared.deleteKind].warning, /Others won't be able to use this scenario/);
  assert.match(DELETE_KINDS[shared.deleteKind].warning, /Campaigns already sent keep their own copy/);
  // Someone else's shared scenario and the templates still can't be deleted.
  assert.equal(cardActions(row({ ownership: 'shared', isShared: true }), ALICE).canDelete, false);
  assert.equal(cardActions(row({ ownership: 'template' }), ALICE).canDelete, false);
});

test('every delete kind has its own label and confirmation', () => {
  for (const [ownership, isShared] of [['mine', false], ['mine', true], ['myCopy', false], ['myRevision', false]]) {
    const { deleteKind } = cardActions(row({ ownership, isShared }), ALICE);
    assert.ok(DELETE_KINDS[deleteKind], ownership);
  }
  assert.equal(DELETE_KINDS.delete.confirm, 'Delete this scenario?');
  // An edited version is a scenario of its own: deleting it is a plain delete,
  // and the original it was made from stays as it is.
  assert.equal(cardActions(row({ ownership: 'myCopy', copyOf: 'SC-9' }), ALICE).deleteKind, 'delete');
  assert.equal(DELETE_KINDS.reset, undefined);
  assert.equal(DELETE_KINDS.discard.label, 'Discard changes');
});

test('older API: own rows are editable in place and deletable, others become copies', () => {
  assert.deepEqual(actions({ createdBy: ALICE }), ['update', true, 'delete', 'Only you']);
  assert.deepEqual(actions({ createdBy: BOB }), ['copy', false, null, 'Shared']);
  assert.deepEqual(actions({}), ['copy', false, null, '']);
});

test('every badge explains itself on hover, naming what a version was made from', () => {
  for (const ownership of ['shared', 'mine', 'myCopy', 'myRevision']) {
    assert.ok(cardActions(row({ ownership }), ALICE).badgeHint, ownership);
  }
  const copy = cardActions(row({ ownership: 'myCopy', copyOf: 'SC-101' }), ALICE);
  assert.equal(copy.badge, 'Edited from SC-101');
  assert.match(copy.badgeHint, /^Your edited version of SC-101, with its own ID\. The original stays as it is\./);
  assert.match(cardActions(row({ ownership: 'myRevision', replaces: 'SC-600' }), ALICE).badgeHint, /^Your edit of SC-600\./);
  const unnamed = cardActions(row({ ownership: 'myCopy' }), ALICE);
  assert.equal(unnamed.badge, 'Edited version');
  assert.match(unnamed.badgeHint, /^Your edited version, with its own ID/);
});

test('editing a template: a new scenario, whose ID is chosen like a new one\'s', () => {
  const copyEdit = { mode: 'copy', scenarioId: 'SC-001' };
  assert.equal(idLockHint(copyEdit), '');
  assert.match(editNote(copyEdit), /new scenario with its own ID\. The original stays as it is/);
  assert.ok(idLockHint({ mode: 'update' }), 'an own scenario keeps its ID');
  assert.ok(idLockHint({ mode: 'revision' }));
});

// --- nextScenarioId ----------------------------------------------------------------------

test('a new version\'s ID: one past the highest SC number taken, three digits at least', () => {
  assert.equal(nextScenarioId([]), 'SC-001');
  assert.equal(nextScenarioId(['SC-001', 'SC-013', 'SC-004']), 'SC-014');
  assert.equal(nextScenarioId(['SC-099']), 'SC-100');
  assert.equal(nextScenarioId(['SC-1234']), 'SC-1235');
  // Typed ids outside the sequence are not in the way.
  assert.equal(nextScenarioId(['SC-PHISH-1', 'TEST-9', 'sc-050', ' SC-007 ', null, undefined, 42]), 'SC-008');
});

// --- editContext / savedAudience -------------------------------------------------------

test('editContext records what an edit draft needs', () => {
  assert.deepEqual(editContext(row({ ownership: 'template', scenarioName: ' Parcel lure ' }), ALICE), {
    scenarioId: 'SC-1',
    mode: 'copy',
    name: 'Parcel lure',
    ownership: 'template',
  });
  assert.equal(editContext(row({ ownership: 'mine', isShared: true }), ALICE).mode, 'revision');
  assert.equal(editContext(row({ ownership: 'myRevision' }), ALICE).mode, 'update');
});

test('the Saved message says who sees the result', () => {
  assert.equal(savedAudience({ mode: 'copy', ownership: 'template' }), 'Only you see this version.');
  assert.equal(savedAudience({ mode: 'update', ownership: 'myCopy' }), 'Only you see this version.');
  assert.match(savedAudience({ mode: 'revision', ownership: 'mine' }), /goes live for everyone when a campaign using it is sent/);
  assert.match(savedAudience({ mode: 'update', ownership: 'myRevision' }), /goes live for everyone/);
  assert.match(savedAudience({ mode: 'update', ownership: 'mine' }), /^Only you see it until/);
});

// --- toSavePayload ------------------------------------------------------------------

const form = (extra = {}) => ({ ...toWizardFormData(row()), ...extra });

test('a copy is a POST naming its original and the author; no id when its form has none of its own', () => {
  const plan = toSavePayload(form(), { mode: 'copy', row: row({ ownership: 'template' }), viewer: ' Alice@X.test ' });
  assert.equal(plan.method, 'POST');
  assert.equal(plan.id, '');
  assert.equal(plan.body.copyOf, 'SC-1');
  assert.equal(plan.body.createdBy, ALICE);
  assert.equal('scenarioId' in plan.body, false);
  assert.equal('CreatedOn' in plan.body, false);
  assert.equal('revisionOf' in plan.body, false);
  assert.equal('actor' in plan.body, false);
  assert.equal(plan.body.emailSubject, 'Your parcel');
  assert.equal(plan.body.campaignType, 'Data Entry');
});

test('a copy sends its own ID: the one its editor showed, never the original\'s', () => {
  const own = toSavePayload(form({ scenarioId: ' SC-014 ' }), { mode: 'copy', row: { scenarioId: 'SC-1' }, viewer: ALICE });
  assert.equal(own.body.scenarioId, 'SC-014');
  assert.equal(own.body.copyOf, 'SC-1');
  const blank = toSavePayload(form({ scenarioId: '' }), { mode: 'copy', row: { scenarioId: 'SC-1' }, viewer: ALICE });
  assert.equal('scenarioId' in blank.body, false);
  // A revision and an update never send an id in the body.
  for (const mode of ['revision', 'update']) {
    const plan = toSavePayload(form({ scenarioId: 'SC-014' }), { mode, row: { scenarioId: 'SC-1' }, viewer: ALICE });
    assert.equal('scenarioId' in plan.body, false, mode);
  }
});

test('a revision is a POST naming the shared original', () => {
  const plan = toSavePayload(form(), { mode: 'revision', row: { scenarioId: 'SC-7' }, viewer: ALICE });
  assert.deepEqual([plan.method, plan.body.revisionOf, plan.body.createdBy, 'copyOf' in plan.body], ['POST', 'SC-7', ALICE, false]);
});

test('an update is a PUT on the row, with the actor', () => {
  const plan = toSavePayload(form(), { mode: 'update', row: { scenarioId: 'SC-1' }, viewer: 'ALICE@x.test' });
  assert.deepEqual([plan.method, plan.id, plan.body.actor], ['PUT', 'SC-1', ALICE]);
  assert.equal('createdBy' in plan.body, false);
  assert.equal('scenarioId' in plan.body, false);
});

test('the API\'s annotations are never sent back', () => {
  const annotated = { ...form(), ownership: 'myCopy', isShared: false, replaces: 'SC-9', coverImageKey: 'uploads/x.png' };
  for (const mode of ['copy', 'revision', 'update']) {
    const { body } = toSavePayload(annotated, { mode, row: { scenarioId: 'SC-1' }, viewer: ALICE });
    for (const field of ['ownership', 'isShared', 'replaces', 'coverImageKey', 'publishedAt']) {
      assert.equal(field in body, false, `${mode}: ${field}`);
    }
  }
});

test('an unchanged cover keeps the stored key; a new one replaces it', () => {
  const stored = form({ CoverImageID: 'uploads/scenario-covers/SC-1/a-cover.png' });
  const keep = toSavePayload(stored, { mode: 'update', row: { scenarioId: 'SC-1' }, viewer: ALICE });
  assert.equal(keep.body.CoverImageID, 'uploads/scenario-covers/SC-1/a-cover.png');
  const swap = toSavePayload(stored, { mode: 'update', row: { scenarioId: 'SC-1' }, viewer: ALICE, coverImageId: 'CovImg-004.png' });
  assert.equal(swap.body.CoverImageID, 'CovImg-004.png');
  const lp = toSavePayload(stored, { mode: 'copy', row: { scenarioId: 'SC-1' }, viewer: ALICE, landingPageId: 'LP-200' });
  assert.equal(lp.body.landingPageId, 'LP-200');
  assert.equal(keep.body.landingPageId, 'LP-001');
  assert.equal(keep.body.trainingId, 'TP-00001');
});

test('a bad mode or a missing target is refused', () => {
  assert.throws(() => toSavePayload(form(), { mode: 'publish', row: { scenarioId: 'SC-1' } }), /Unknown edit mode/);
  assert.throws(() => toSavePayload(form(), { mode: 'update', row: {} }), /No scenario/);
});

// --- a 409 with existingId: refused, never written over -------------------------------

const conflict = (existingId) => Object.assign(new Error('You already have a copy of SC-1'), {
  status: 409,
  payload: { error: { message: 'You already have a copy of SC-1', existingId } },
});

test('409 with existingId names the person\'s own version; nothing is retried onto it', () => {
  const post = toSavePayload(form(), { mode: 'copy', row: { scenarioId: 'SC-1' }, viewer: ALICE });
  assert.equal(existingVersionId(post, conflict('SC-905')), 'SC-905');
  assert.match(conflictMessage('SC-905'), /You already have your own version of this scenario \(SC-905\), so nothing was saved over it/);
});

test('anything else is not a conflict with an existing version', () => {
  const post = toSavePayload(form(), { mode: 'copy', row: { scenarioId: 'SC-1' }, viewer: ALICE });
  const put = toSavePayload(form(), { mode: 'update', row: { scenarioId: 'SC-1' }, viewer: ALICE });
  assert.equal(existingVersionId(post, conflict('')), '');
  assert.equal(existingVersionId(post, Object.assign(new Error('x'), { status: 400 })), '');
  assert.equal(existingVersionId(post, new Error('offline')), '');
  assert.equal(existingVersionId(put, conflict('SC-905')), '');
});

// --- an older API (no annotations): what the viewer may see -------------------------------

const sc = (scenarioId, createdBy, fields = {}) => ({ scenarioId, ...(createdBy ? { createdBy } : {}), ...fields });
// T1, T2 templates; A1 Alice private; A2 Alice's (shared) + her pending revision A2R;
// A3R a published revision; B1 Bob's; BC1 Bob's copy of T1; AC1 Alice's copy of B1;
// BR1 Bob's revision of B1; AX Alice's copy of her own A1 (bad data: hides nothing).
const OLD = [
  sc('T1'), sc('T2'), sc('A1', ALICE), sc('A2', 'Alice@X.test'), sc('A2R', ALICE, { revisionOf: 'A2' }),
  sc('A3R', ALICE, { revisionOf: 'A3', publishedAt: '2026-10-01T00:00:00Z' }), sc('B1', BOB),
  sc('BC1', BOB, { copyOf: 'T1' }), sc('AC1', ALICE, { copyOf: 'B1' }), sc('BR1', BOB, { revisionOf: 'B1' }),
  sc('AX', ALICE, { copyOf: 'A1' }),
];
const ids = (rows) => rows.map((r) => r.scenarioId).sort();

test('older API: other people\'s copies and revisions, and published revisions, are hidden', () => {
  assert.deepEqual(ids(visibleForViewer(OLD, ALICE)), ['A1', 'A2R', 'AC1', 'AX', 'B1', 'T1', 'T2']);
  assert.deepEqual(ids(visibleForViewer(OLD, BOB)), ['A1', 'A2', 'BC1', 'BR1', 'T1', 'T2']);
  assert.deepEqual(ids(visibleForViewer(OLD, 'carol@x.test')), ['A1', 'A2', 'B1', 'T1', 'T2']);
});

test('older API: a pending edit stands in for what it revises; a copy is listed beside what it copies', () => {
  const alice = ids(visibleForViewer(OLD, ' ALICE@x.test '));
  assert.ok(!alice.includes('A2') && alice.includes('A2R'), 'her revision replaces her A2');
  assert.ok(alice.includes('B1') && alice.includes('AC1'), 'her copy of Bob\'s B1 hides nothing');
  assert.ok(alice.includes('A1') && alice.includes('AX'), 'a copy of her own scenario hides nothing');
  const bob = ids(visibleForViewer(OLD, BOB));
  assert.ok(bob.includes('T1') && bob.includes('BC1'), 'the template stays beside his version');
  assert.ok(!bob.includes('B1') && bob.includes('BR1'));
  assert.deepEqual(ids(visibleForViewer(OLD, '')), ['A1', 'A2', 'B1', 'T1', 'T2']);
  assert.deepEqual(visibleForViewer(null, ALICE), []);
});

test('the API\'s annotated rows are taken as they are; an older API\'s are filtered', () => {
  const annotated = [{ ...sc('BC1', BOB, { copyOf: 'T1' }), ownership: 'myCopy', replaces: 'T1' }];
  assert.equal(isAnnotated(annotated), true);
  assert.equal(isAnnotated(OLD), false);
  assert.equal(scenariosForViewer(annotated, ALICE), annotated);
  assert.deepEqual(ids(scenariosForViewer(OLD, ALICE)), ids(visibleForViewer(OLD, ALICE)));
  assert.deepEqual(scenariosForViewer(undefined, ALICE), []);
});

test('what a row stands in for, annotated or not: only a pending edit does', () => {
  assert.equal(replacedId({ scenarioId: 'X', ownership: 'myRevision', replaces: 'A2' }, ALICE), 'A2');
  // A copy stands in for nothing, even from an API that still says so.
  assert.equal(replacedId({ scenarioId: 'X', ownership: 'myCopy', replaces: 'T1', copyOf: 'T1' }, ALICE), '');
  assert.equal(replacedId({ scenarioId: 'X', ownership: 'template', replaces: null, copyOf: 'T9' }, ALICE), '');
  assert.equal(replacedId(sc('AC1', ALICE, { copyOf: 'B1' }), ALICE), '');
  assert.equal(replacedId(sc('A2R', ALICE, { revisionOf: 'A2' }), ALICE), 'A2');
  assert.equal(replacedId(sc('BC1', BOB, { copyOf: 'T1' }), ALICE), '');
  assert.equal(replacedId(sc('A3R', ALICE, { revisionOf: 'A3', publishedAt: 'x' }), ALICE), '');
});

// --- which row Edit opens ---------------------------------------------------------------

const LIST = [
  { ...sc('T1'), ownership: 'template', isShared: false, replaces: null },
  { ...sc('T2'), ownership: 'template', isShared: false, replaces: null },
  { ...sc('C9', ALICE, { copyOf: 'T2' }), ownership: 'myCopy', isShared: false, replaces: null },
  { ...sc('R7', ALICE, { revisionOf: 'A2' }), ownership: 'myRevision', isShared: false, replaces: 'A2' },
  { ...sc('A5', ALICE), ownership: 'mine', isShared: true, replaces: null },
];

test('Edit by id: a template opens itself (a new version each time); a pending edit stands in', () => {
  assert.equal(rowToEdit(LIST, 'T2', ALICE).scenarioId, 'T2');
  assert.equal(rowToEdit(LIST, 'A2', ALICE).scenarioId, 'R7');
  assert.equal(rowToEdit(LIST, 'C9', ALICE).scenarioId, 'C9');
  assert.equal(rowToEdit(LIST, ' T1 ', ALICE).scenarioId, 'T1');
  assert.equal(rowToEdit(LIST, 'SC-999', ALICE), null);
  assert.equal(rowToEdit(null, 'T1', ALICE), null);
  assert.equal(rowToEdit(LIST, '', ALICE), null);
  // Older API: the same, from createdBy / copyOf / revisionOf.
  assert.equal(rowToEdit(OLD, 'B1', ALICE).scenarioId, 'B1');
  assert.equal(rowToEdit(OLD, 'A2', ALICE).scenarioId, 'A2R');
  assert.equal(rowToEdit(OLD, 'BR1', ALICE), null);
});

test('a row read on its own opens only if the person could see it', () => {
  assert.equal(canOpenForEdit(sc('T1'), ALICE), true);
  assert.equal(canOpenForEdit(sc('A1', ALICE), ALICE), true);
  assert.equal(canOpenForEdit(sc('BC1', BOB, { copyOf: 'T1' }), ALICE), false);
  assert.equal(canOpenForEdit(sc('A3R', ALICE, { revisionOf: 'A3', publishedAt: 'x' }), ALICE), false);
  assert.equal(canOpenForEdit(null, ALICE), false);
});

// --- an edit checked against the list as it is now -------------------------------------------

const edit = (scenarioId, mode, ownership) => ({ scenarioId, mode, name: 'N', ownership, baseline: 'b' });

test('nothing changed: same, with name and baseline kept', () => {
  const r = refreshEdit(edit('C9', 'update', 'myCopy'), LIST, ALICE);
  assert.deepEqual([r.change, r.edit.mode, r.edit.name, r.edit.baseline], ['same', 'update', 'N', 'b']);
  assert.equal(refreshNotice(r), '');
});

test('own scenario shared since the edit began: saved as a pending revision, and said so', () => {
  const r = refreshEdit(edit('A5', 'update', 'mine'), LIST, ALICE);
  assert.deepEqual([r.change, r.edit.mode, r.edit.ownership, r.edit.baseline], ['nowShared', 'revision', 'mine', 'b']);
  assert.match(refreshNotice(r), /shared since you started/);
});

test('a template\'s edit is a new version: another version saved meanwhile is no conflict', () => {
  const r = refreshEdit(edit('T2', 'copy', 'template'), LIST, ALICE);
  assert.deepEqual([r.change, r.existingId, r.edit.mode], ['same', '', 'copy']);
  assert.equal(refreshNotice(r), '');
});

test('their own pending edit made meanwhile: replaced, never saved as a second one', () => {
  const r = refreshEdit(edit('A2', 'revision', 'mine'), LIST, ALICE);
  assert.deepEqual([r.change, r.existingId], ['replaced', 'R7']);
  assert.equal(refreshNotice(r), conflictMessage('R7'));
});

test('gone from the list: refused with a reason', () => {
  const r = refreshEdit(edit('SC-404', 'update', 'mine'), LIST, ALICE);
  assert.equal(r.change, 'gone');
  assert.match(refreshNotice(r), /can't be saved onto it/);
});

test('older API: the same checks from createdBy', () => {
  assert.equal(refreshEdit(edit('B1', 'copy', 'shared'), OLD, ALICE).change, 'same');
  assert.equal(refreshEdit(edit('A2', 'revision', 'mine'), OLD, ALICE).change, 'replaced');
  // A1 is still listed (AX, a copy of her own scenario, is bad data that hides nothing).
  assert.equal(refreshEdit(edit('A1', 'update', 'mine'), OLD, ALICE).change, 'same');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DELETE_KINDS,
  cardActions,
  editContext,
  ownershipOf,
  retryOnExisting,
  savedAudience,
  toSavePayload,
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
  assert.deepEqual(actions({ ownership: 'mine', isShared: true, createdBy: ALICE }), ['revision', false, null, 'Shared']);
  assert.deepEqual(actions({ ownership: 'myCopy', replaces: 'SC-9' }), ['update', true, 'reset', 'Your version']);
  assert.deepEqual(actions({ ownership: 'myRevision', replaces: 'SC-9' }), ['update', true, 'discard', 'Your edit — not live yet']);
});

test('everyone can edit; only a shared own scenario explains why there is no Delete', () => {
  for (const ownership of ['template', 'shared', 'mine', 'myCopy', 'myRevision']) {
    const a = cardActions(row({ ownership, isShared: ownership === 'shared' }), ALICE);
    assert.equal(a.canEdit, true, ownership);
    assert.equal(a.ownership, ownership);
    assert.equal(a.deleteBlocked, '', ownership);
  }
  const shared = cardActions(row({ ownership: 'mine', isShared: true }), ALICE);
  assert.match(shared.deleteBlocked, /Shared scenarios can't be deleted/);
});

test('every delete kind has its own label and confirmation', () => {
  for (const ownership of ['mine', 'myCopy', 'myRevision']) {
    const { deleteKind } = cardActions(row({ ownership, isShared: false }), ALICE);
    assert.ok(DELETE_KINDS[deleteKind], ownership);
  }
  assert.equal(DELETE_KINDS.delete.confirm, 'Delete this scenario?');
  assert.equal(DELETE_KINDS.reset.label, 'Reset to original');
  assert.equal(DELETE_KINDS.discard.label, 'Discard changes');
});

test('older API: own rows are editable in place and deletable, others become copies', () => {
  assert.deepEqual(actions({ createdBy: ALICE }), ['update', true, 'delete', 'Only you']);
  assert.deepEqual(actions({ createdBy: BOB }), ['copy', false, null, 'Shared']);
  assert.deepEqual(actions({}), ['copy', false, null, '']);
});

test('every badge explains itself on hover, naming what a copy or edit stands in for', () => {
  for (const ownership of ['shared', 'mine', 'myCopy', 'myRevision']) {
    assert.ok(cardActions(row({ ownership }), ALICE).badgeHint, ownership);
  }
  assert.match(cardActions(row({ ownership: 'myCopy', replaces: 'SC-101' }), ALICE).badgeHint, /^Your own copy of SC-101,/);
  assert.match(cardActions(row({ ownership: 'myRevision', replaces: 'SC-600' }), ALICE).badgeHint, /^Your edit of SC-600\./);
  assert.match(cardActions(row({ ownership: 'myCopy', replaces: null }), ALICE).badgeHint, /^Your own copy,/);
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

test('a copy is a POST naming its original, the author and no id of its own', () => {
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

// --- retryOnExisting ------------------------------------------------------------------

const conflict = (existingId) => Object.assign(new Error('You already have a copy of SC-1'), {
  status: 409,
  payload: { error: { message: 'You already have a copy of SC-1', existingId } },
});

test('409 with existingId: the same save as a PUT onto the existing copy', () => {
  const plan = toSavePayload(form(), { mode: 'copy', row: { scenarioId: 'SC-1' }, viewer: ALICE });
  const retry = retryOnExisting(plan, conflict('SC-905'), ALICE);
  assert.equal(retry.method, 'PUT');
  assert.equal(retry.id, 'SC-905');
  assert.equal(retry.body.actor, ALICE);
  for (const field of ['createdBy', 'copyOf', 'revisionOf']) assert.equal(field in retry.body, false, field);
  assert.equal(retry.body.emailSubject, plan.body.emailSubject);
});

test('anything else is not retried', () => {
  const post = toSavePayload(form(), { mode: 'copy', row: { scenarioId: 'SC-1' }, viewer: ALICE });
  const put = toSavePayload(form(), { mode: 'update', row: { scenarioId: 'SC-1' }, viewer: ALICE });
  assert.equal(retryOnExisting(post, conflict(''), ALICE), null);
  assert.equal(retryOnExisting(post, Object.assign(new Error('x'), { status: 400 }), ALICE), null);
  assert.equal(retryOnExisting(post, new Error('offline'), ALICE), null);
  assert.equal(retryOnExisting(put, conflict('SC-905'), ALICE), null);
});

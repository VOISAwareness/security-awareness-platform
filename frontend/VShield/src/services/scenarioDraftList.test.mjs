import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { buildDraft } from './scenarioDraft.js';
import { markAsked, scenarioContentVersion } from './resumePrompt.js';
import {
  getActiveScenarioDraftId,
  getScenarioDraft,
  inProgressScenarioDraft,
  listScenarioDrafts,
  newDraftId,
  removeScenarioDraft,
  saveScenarioDraft,
  scenarioDraftToOffer,
  scenarioEditorOpening,
  setActiveScenarioDraftId,
} from './scenarioDraftList.js';

const A = 'a@example.test';
const B = 'b@example.test';
const DEFAULTS = { emailBody: '<p>Default</p>' };
const draft = (name, savedAt, tab = 0) =>
  buildDraft({ scenarioName: name, emailBody: DEFAULTS.emailBody }, tab, new Date(savedAt));

let store;
beforeEach(() => {
  store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

test('ids are distinct', () => {
  const ids = new Set(Array.from({ length: 50 }, () => newDraftId()));
  assert.equal(ids.size, 50);
  assert.match(newDraftId(), /^SD-[0-9a-z]+$/);
});

test('several drafts per person, newest first, kept apart per person', () => {
  saveScenarioDraft('SD-1', draft('Older', '2026-10-01T10:00:00Z'), A);
  saveScenarioDraft('SD-2', draft('Newer', '2026-10-02T10:00:00Z', 2), A);
  saveScenarioDraft('SD-9', draft("B's", '2026-10-03T10:00:00Z'), B);
  const list = listScenarioDrafts(A);
  assert.deepEqual(list.map((d) => [d.id, d.formData.scenarioName, d.activeTab]), [['SD-2', 'Newer', 2], ['SD-1', 'Older', 0]]);
  assert.equal(listScenarioDrafts(B).length, 1);
  assert.equal(getScenarioDraft('SD-9', A), null);
});

test('saving the same id replaces that draft only', () => {
  saveScenarioDraft('SD-1', draft('First', '2026-10-01T10:00:00Z'), A);
  saveScenarioDraft('SD-2', draft('Second', '2026-10-01T11:00:00Z'), A);
  saveScenarioDraft('SD-1', draft('First, edited', '2026-10-01T12:00:00Z', 1), A);
  assert.equal(getScenarioDraft('SD-1', A).formData.scenarioName, 'First, edited');
  assert.equal(getScenarioDraft('SD-2', A).formData.scenarioName, 'Second');
  assert.equal(listScenarioDrafts(A)[0].id, 'SD-1');
});

test('removing the draft in progress clears the pointer; removing the last clears the key', () => {
  saveScenarioDraft('SD-1', draft('One', '2026-10-01T10:00:00Z'), A);
  saveScenarioDraft('SD-2', draft('Two', '2026-10-01T11:00:00Z'), A);
  setActiveScenarioDraftId('SD-2', A);
  removeScenarioDraft('SD-1', A);
  assert.equal(getActiveScenarioDraftId(A), 'SD-2');
  removeScenarioDraft('SD-2', A);
  assert.equal(getActiveScenarioDraftId(A), '');
  assert.equal(store.has(`voisshield_scenario_drafts:${A}`), false);
});

test('in progress = the active draft, only while it holds real work', () => {
  assert.equal(inProgressScenarioDraft(DEFAULTS, A), null);
  saveScenarioDraft('SD-1', draft('Real work', '2026-10-01T10:00:00Z'), A);
  setActiveScenarioDraftId('SD-1', A);
  assert.equal(inProgressScenarioDraft(DEFAULTS, A).id, 'SD-1');
  // Only the pre-filled body: nothing to offer.
  saveScenarioDraft('SD-2', buildDraft({ emailBody: DEFAULTS.emailBody }, 0), A);
  setActiveScenarioDraftId('SD-2', A);
  assert.equal(inProgressScenarioDraft(DEFAULTS, A), null);
  // A pointer to a draft that is gone.
  setActiveScenarioDraftId('SD-404', A);
  assert.equal(inProgressScenarioDraft(DEFAULTS, A), null);
});

test('the single draft saved before is moved in and stays in progress', () => {
  const legacy = draft('Saved before this change', '2026-09-30T10:00:00Z', 1);
  store.set(`voisshield_scenario_draft:${A}`, JSON.stringify(legacy));
  const list = listScenarioDrafts(A);
  assert.equal(list.length, 1);
  assert.equal(list[0].formData.scenarioName, 'Saved before this change');
  assert.equal(store.has(`voisshield_scenario_draft:${A}`), false);
  assert.equal(getActiveScenarioDraftId(A), list[0].id);
  // Read again: not duplicated.
  assert.equal(listScenarioDrafts(A).length, 1);
});

test('the old key is kept when storage refuses the move', () => {
  const legacy = JSON.stringify(draft('Keep me', '2026-09-30T10:00:00Z'));
  store.set(`voisshield_scenario_draft:${A}`, legacy);
  const setItem = globalThis.localStorage.setItem;
  globalThis.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.equal(listScenarioDrafts(A).length, 1); // still readable this time
  assert.equal(store.get(`voisshield_scenario_draft:${A}`), legacy);
  assert.equal(saveScenarioDraft('SD-1', draft('x', '2026-10-01T10:00:00Z'), A), false);
  globalThis.localStorage.setItem = setItem;
});

test('foreign or corrupt entries are ignored', () => {
  store.set(`voisshield_scenario_drafts:${A}`, JSON.stringify({ version: 2, drafts: { good: draft('Good', '2026-10-01T10:00:00Z'), bad: { nope: 1 } } }));
  assert.deepEqual(listScenarioDrafts(A).map((d) => d.id), ['good']);
  store.set(`voisshield_scenario_drafts:${A}`, '{not json');
  assert.deepEqual(listScenarioDrafts(A), []);
});

test('editor opening: ?draft=<id> opens that draft directly, no question asked', () => {
  saveScenarioDraft('SD-1', draft('Picked from Drafts', '2026-10-01T10:00:00Z', 2), A);
  saveScenarioDraft('SD-2', draft('In progress', '2026-10-02T10:00:00Z'), A);
  setActiveScenarioDraftId('SD-2', A);
  const o = scenarioEditorOpening({ requestedId: 'SD-1', defaults: DEFAULTS }, A);
  assert.equal(o.id, 'SD-1');
  assert.equal(o.resume.formData.scenarioName, 'Picked from Drafts');
  assert.equal(o.offer, null);
});

test('editor opening: no id -> a new draft, with the one in progress offered', () => {
  saveScenarioDraft('SD-2', draft('In progress', '2026-10-02T10:00:00Z'), A);
  setActiveScenarioDraftId('SD-2', A);
  const o = scenarioEditorOpening({ defaults: DEFAULTS }, A);
  assert.match(o.id, /^SD-/);
  assert.notEqual(o.id, 'SD-2');
  assert.equal(o.resume, null);
  assert.equal(o.offer.id, 'SD-2');
});

test('editor opening: just chose "Start new" -> nothing offered', () => {
  saveScenarioDraft('SD-2', draft('In progress', '2026-10-02T10:00:00Z'), A);
  setActiveScenarioDraftId('SD-2', A);
  const o = scenarioEditorOpening({ startFresh: true, defaults: DEFAULTS }, A);
  assert.equal(o.offer, null);
  assert.equal(o.resume, null);
});

test('editor opening: an unknown ?draft id is kept as the new draft id (reload-safe)', () => {
  const o = scenarioEditorOpening({ requestedId: 'SD-new1', defaults: DEFAULTS }, A);
  assert.equal(o.id, 'SD-new1');
  assert.equal(o.resume, null);
  assert.equal(o.offer, null);
});

test('removing the moved-in old draft also drops the old key', () => {
  store.set(`voisshield_scenario_draft:${A}`, JSON.stringify(draft('Old', '2026-09-30T10:00:00Z')));
  const [{ id }] = listScenarioDrafts(A);
  removeScenarioDraft(id, A);
  assert.deepEqual(listScenarioDrafts(A), []);
});

test('asked once: an answered draft is not offered again until it changes', () => {
  const first = draft('In progress', '2026-10-02T10:00:00Z');
  saveScenarioDraft('SD-2', first, A);
  setActiveScenarioDraftId('SD-2', A);
  assert.equal(scenarioDraftToOffer(DEFAULTS, A).id, 'SD-2');
  markAsked('scenario', 'SD-2', scenarioContentVersion(first), A);
  assert.equal(scenarioDraftToOffer(DEFAULTS, A), null);
  assert.equal(scenarioEditorOpening({ defaults: DEFAULTS }, A).offer, null);
  // Still the one in progress (Drafts marks it so), just not asked about.
  assert.equal(inProgressScenarioDraft(DEFAULTS, A).id, 'SD-2');
  // Saved again on another tab, same form: still answered.
  saveScenarioDraft('SD-2', draft('In progress', '2026-10-02T11:00:00Z', 2), A);
  assert.equal(scenarioDraftToOffer(DEFAULTS, A), null);
  // New work on it: asked once more.
  saveScenarioDraft('SD-2', draft('In progress, edited', '2026-10-03T10:00:00Z'), A);
  assert.equal(scenarioEditorOpening({ defaults: DEFAULTS }, A).offer.id, 'SD-2');
  // Another person's answers do not count.
  saveScenarioDraft('SD-7', first, B);
  setActiveScenarioDraftId('SD-7', B);
  markAsked('scenario', 'SD-7', scenarioContentVersion(first), A);
  assert.equal(scenarioDraftToOffer(DEFAULTS, B).id, 'SD-7');
});

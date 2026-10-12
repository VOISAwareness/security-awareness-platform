import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_ENTRIES,
  RESUME_ASKED_KEY,
  campaignDraftVersion,
  markAsked,
  scenarioDraftVersion,
  wasAsked,
} from './resumePrompt.js';

const A = 'a@example.test';
const B = 'b@example.test';

let store;
beforeEach(() => {
  store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

test('nothing is asked until it is marked', () => {
  assert.equal(wasAsked('campaign', 'CMP-1', '2026-10-01T10:00:00Z', A), false);
  assert.equal(markAsked('campaign', 'CMP-1', '2026-10-01T10:00:00Z', A), true);
  assert.equal(wasAsked('campaign', 'CMP-1', '2026-10-01T10:00:00Z', A), true);
});

test('a newer version is asked about again, once', () => {
  markAsked('scenario', 'SD-1', 'v1', A);
  assert.equal(wasAsked('scenario', 'SD-1', 'v2', A), false);
  markAsked('scenario', 'SD-1', 'v2', A);
  assert.equal(wasAsked('scenario', 'SD-1', 'v2', A), true);
  // Only the latest answer per item is kept.
  assert.equal(wasAsked('scenario', 'SD-1', 'v1', A), false);
  assert.equal(JSON.parse(store.get(`${RESUME_ASKED_KEY}:${A}`)).length, 1);
});

test('kinds, ids and people are kept apart', () => {
  markAsked('campaign', 'X-1', 'v1', A);
  assert.equal(wasAsked('scenario', 'X-1', 'v1', A), false);
  assert.equal(wasAsked('campaign', 'X-2', 'v1', A), false);
  assert.equal(wasAsked('campaign', 'X-1', 'v1', B), false);
  assert.ok(store.has(`${RESUME_ASKED_KEY}:${A}`));
  assert.ok(!store.has(`${RESUME_ASKED_KEY}:${B}`));
});

test('unknown kinds and missing ids are never remembered', () => {
  assert.equal(markAsked('template', 'SC-1', 'v1', A), false);
  assert.equal(markAsked('campaign', '', 'v1', A), false);
  assert.equal(wasAsked('template', 'SC-1', 'v1', A), false);
  assert.equal(store.size, 0);
});

test('a missing version is a version too', () => {
  markAsked('campaign', 'CMP-1', undefined, A);
  assert.equal(wasAsked('campaign', 'CMP-1', '', A), true);
  assert.equal(wasAsked('campaign', 'CMP-1', 'v1', A), false);
});

test('the list keeps only the newest answers', () => {
  for (let i = 0; i < MAX_ENTRIES + 10; i += 1) markAsked('campaign', `CMP-${i}`, 'v', A);
  const saved = JSON.parse(store.get(`${RESUME_ASKED_KEY}:${A}`));
  assert.equal(saved.length, MAX_ENTRIES);
  assert.equal(wasAsked('campaign', `CMP-${MAX_ENTRIES + 9}`, 'v', A), true);
  assert.equal(wasAsked('campaign', 'CMP-0', 'v', A), false);
  // Answering an old item again moves it to the front instead of adding one.
  markAsked('campaign', 'CMP-20', 'v2', A);
  const again = JSON.parse(store.get(`${RESUME_ASKED_KEY}:${A}`));
  assert.equal(again.length, MAX_ENTRIES);
  assert.deepEqual(again[0], { kind: 'campaign', id: 'CMP-20', version: 'v2' });
});

test('corrupt or foreign data is ignored', () => {
  store.set(`${RESUME_ASKED_KEY}:${A}`, '{not json');
  assert.equal(wasAsked('campaign', 'CMP-1', 'v', A), false);
  assert.equal(markAsked('campaign', 'CMP-1', 'v', A), true);
  store.set(`${RESUME_ASKED_KEY}:${A}`, JSON.stringify([null, 7, { kind: 'campaign', id: 'CMP-2' }, { kind: 'campaign', id: 'CMP-3', version: 'v' }]));
  assert.equal(wasAsked('campaign', 'CMP-2', '', A), false);
  assert.equal(wasAsked('campaign', 'CMP-3', 'v', A), true);
});

test('unavailable storage never throws', () => {
  globalThis.localStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => { throw new Error('blocked'); },
  };
  assert.equal(wasAsked('campaign', 'CMP-1', 'v', A), false);
  assert.equal(markAsked('campaign', 'CMP-1', 'v', A), false);
});

test('versions: campaign updatedAt (else createdAt), scenario savedAt', () => {
  assert.equal(campaignDraftVersion({ updatedAt: 'u', createdAt: 'c' }), 'u');
  assert.equal(campaignDraftVersion({ createdAt: 'c' }), 'c');
  assert.equal(campaignDraftVersion(null), '');
  assert.equal(scenarioDraftVersion({ savedAt: 's' }), 's');
  assert.equal(scenarioDraftVersion({}), '');
});

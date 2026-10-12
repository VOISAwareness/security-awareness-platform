import { test } from 'node:test';
import assert from 'node:assert/strict';

import { scopedKey, readJSON, writeJSON, readString, writeString, removeKey } from './draftStore.js';

// A minimal in-memory localStorage, installed per test.
function installStorage() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
  return map;
}

test('scopedKey scopes a base key to the actor, case-insensitively', () => {
  assert.equal(scopedKey('voisshield_scenario_draft', 'Jack@Example.com'), 'voisshield_scenario_draft:jack@example.com');
  assert.notEqual(scopedKey('k', 'a@x.com'), scopedKey('k', 'b@x.com'));
});

test('scopedKey falls back to anonymous for a blank actor', () => {
  assert.equal(scopedKey('k', '   '), 'k:anonymous');
});

test('JSON round-trips and removal', () => {
  installStorage();
  assert.equal(readJSON('d'), null);
  assert.equal(writeJSON('d', { a: 1, step: 2 }), true);
  assert.deepEqual(readJSON('d'), { a: 1, step: 2 });
  removeKey('d');
  assert.equal(readJSON('d'), null);
});

test('strings: empty value removes the key', () => {
  const map = installStorage();
  writeString('p', 'CMP-1');
  assert.equal(readString('p'), 'CMP-1');
  writeString('p', '');
  assert.equal(map.has('p'), false);
  assert.equal(readString('p'), '');
});

test('corrupt JSON and unavailable storage never throw', () => {
  const map = installStorage();
  map.set('bad', '{not json');
  assert.equal(readJSON('bad'), null);
  globalThis.localStorage = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => { throw new Error('blocked'); },
  };
  assert.equal(readJSON('x'), null);
  assert.equal(writeJSON('x', {}), false);
  assert.equal(readString('x'), '');
  assert.equal(writeString('x', 'v'), false);
  assert.doesNotThrow(() => removeKey('x'));
});

/**
 * Tests for scenario drafts on the server: scenarioDraftSync.js (sending,
 * conflicts, the Drafts tab, deletes, where the editor opens) and
 * scenarioDraftSender.js (when the editor sends). Run against an in-memory
 * fake of the /scenario-drafts contract and a fake clock; nothing here
 * touches a network.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { buildDraft, draftFingerprint } from './scenarioDraft.js';
import { markAsked, scenarioContentVersion } from './resumePrompt.js';
import {
  addPendingDelete,
  draftSyncState,
  getActiveScenarioDraftId,
  getScenarioDraft,
  isDeletePending,
  listScenarioDrafts,
  pendingDraftDeletes,
  saveScenarioDraft,
  setActiveScenarioDraftId,
  setDraftBaseRev,
} from './scenarioDraftList.js';
import {
  CONFLICT_NOTICE,
  deleteScenarioDraftEverywhere,
  draftPutBody,
  editedScenarioIds,
  fitsKeepalive,
  inProgressAmong,
  listServerDrafts,
  loadScenarioDraftsTab,
  loadScenarioEditorOpening,
  mergeScenarioDrafts,
  openingNeedsServer,
  queueDraftOp,
  readScenarioDraftItems,
  removeEditDraftsEverywhere,
  resetScenarioDraftSync,
  resolveInProgress,
  saveScenarioDraftToServer,
  scenarioDraftsUnavailable,
  sendPendingScenarioDrafts,
  serverSummary,
} from './scenarioDraftSync.js';
import { MAX_SEND_WAIT_MS, RETRY_MS, SEND_DEBOUNCE_MS, createScenarioDraftSender } from './scenarioDraftSender.js';

const A = 'a@example.test';
const B = 'b@example.test';
const DEFAULTS = { emailBody: '<p>Default</p>' };
const draft = (name, savedAt = '2026-10-01T10:00:00.000Z', tab = 0, extra = {}) =>
  buildDraft({ scenarioName: name, emailBody: DEFAULTS.emailBody, ...extra }, tab, new Date(savedAt));
const editDraft = (scenarioId, name, savedAt) =>
  buildDraft({ scenarioId, scenarioName: name, emailSubject: 'changed' }, 1, new Date(savedAt), {
    scenarioId,
    mode: 'copy',
    name,
    baseline: 'x',
  });

const tick = () => new Promise((resolve) => setImmediate(resolve));
const settle = async (n = 6) => {
  for (let i = 0; i < n; i += 1) await tick();
};

// --- An in-memory /scenario-drafts, as the contract describes it ------------------------------
function fakeServer() {
  const rows = new Map(); // `${owner}\n${id}` -> row
  const calls = [];
  const state = { mode: 'ok', tooLarge: false, loseNextResponse: false, hold: null };
  let clock = Date.parse('2026-10-12T09:00:00.000Z');
  const now = () => new Date((clock += 1000)).toISOString();
  const norm = (owner) => String(owner || '').trim().toLowerCase();
  const key = (owner, id) => `${norm(owner)}\n${id}`;
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const httpError = (status, payload) => {
    const error = new Error(payload?.error?.message || payload?.message || `Request failed (${status})`);
    error.status = status;
    error.payload = payload;
    return error;
  };
  const gate = async () => {
    if (state.hold) await state.hold;
    if (state.mode === 'offline') throw new TypeError('Failed to fetch');
    if (state.mode === 'missing') throw httpError(404, { message: 'Not Found' });
    if (state.mode === 'busy') throw httpError(503, { error: { message: 'Busy, try again', code: 'BUSY' } });
  };
  const summaryOf = (r) => ({
    draftId: r.draftId,
    rev: r.rev,
    savedAt: r.savedAt,
    updatedAt: r.updatedAt,
    version: 1,
    activeTab: r.activeTab,
    summary: clone(r.summary),
  });
  const write = (owner, id, body, saveId) => {
    const previous = rows.get(key(owner, id));
    const row = {
      owner: norm(owner),
      draftId: id,
      rev: (previous?.rev || 0) + 1,
      savedAt: body.draft.savedAt,
      updatedAt: now(),
      activeTab: body.draft.activeTab,
      summary: clone(body.summary),
      formData: clone(body.draft.formData),
      edit: clone(body.draft.edit) ?? null,
      saveId,
    };
    rows.set(key(owner, id), row);
    return row;
  };
  const api = {
    scenarioDrafts: {
      async list(owner) {
        calls.push({ method: 'GET', id: '', owner });
        await gate();
        return [...rows.values()]
          .filter((r) => r.owner === norm(owner))
          .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))
          .map(summaryOf);
      },
      async get(id, owner) {
        calls.push({ method: 'GET', id, owner });
        await gate();
        const row = rows.get(key(owner, id));
        if (!row) throw httpError(404, { error: { message: 'No such draft' } });
        return { ...summaryOf(row), formData: clone(row.formData), edit: clone(row.edit) };
      },
      async save(id, body, options = {}) {
        calls.push({ method: 'PUT', id, body: clone(body), keepalive: Boolean(options.keepalive) });
        await gate();
        if (state.tooLarge) throw httpError(413, { error: { message: 'Too large: images were probably pasted in.' } });
        const row = rows.get(key(body.owner, id));
        if ((row?.rev || 0) !== body.baseRev) {
          throw httpError(409, {
            error: {
              message: 'Draft changed',
              code: 'DRAFT_CONFLICT',
              current: row ? { rev: row.rev, savedAt: row.savedAt, updatedAt: row.updatedAt, saveId: row.saveId } : null,
            },
          });
        }
        const saved = write(body.owner, id, body, body.saveId);
        if (state.loseNextResponse) {
          state.loseNextResponse = false;
          throw new TypeError('Failed to fetch');
        }
        return { draftId: id, rev: saved.rev, savedAt: saved.savedAt, updatedAt: saved.updatedAt, saveId: body.saveId };
      },
      async remove(id, owner) {
        calls.push({ method: 'DELETE', id, owner });
        await gate();
        rows.delete(key(owner, id));
        return null;
      },
    },
  };
  // A save made somewhere else (another device).
  const seed = (owner, id, d, saveId = `elsewhere-${id}`) =>
    write(owner, id, draftPutBody({ owner, baseRev: 0, saveId, draft: d }), saveId);
  const row = (owner, id) => rows.get(key(owner, id)) || null;
  const count = (method) => calls.filter((c) => c.method === method).length;
  return { api, rows, calls, state, seed, row, count };
}

// A clock whose timers only run when the test advances it.
function fakeClock() {
  let now = 1_000_000;
  let seq = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimeout: (fn, ms) => {
      seq += 1;
      timers.set(seq, { at: now + Math.max(0, ms), fn });
      return seq;
    },
    clearTimeout: (id) => timers.delete(id),
    pending: () => timers.size,
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        timers.delete(next[0]);
        now = next[1].at;
        next[1].fn();
        await settle();
      }
      now = end;
      await settle();
    },
  };
}

let store;
beforeEach(() => {
  store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  resetScenarioDraftSync();
});

// --- What is sent ---------------------------------------------------------------------------------

test('the PUT body follows the contract; the summary carries what the Drafts card needs', () => {
  const d = buildDraft(
    { scenarioName: 'Lure', scenarioId: 'SC-1', coverImageSource: 'upload', coverImageKey: 'k', coverImageThumbnail: 'data:x' },
    2,
    new Date('2026-10-01T10:00:00Z'),
    { scenarioId: 'SC-1', mode: 'update', name: 'Lure' }
  );
  const body = draftPutBody({ owner: A, baseRev: 3, saveId: 's-1', draft: d });
  assert.deepEqual(Object.keys(body), ['owner', 'baseRev', 'saveId', 'draft', 'summary']);
  assert.deepEqual(Object.keys(body.draft), ['version', 'savedAt', 'activeTab', 'formData', 'edit']);
  assert.equal(body.draft.version, 1);
  assert.equal('savedAt' in body.summary, false);
  assert.deepEqual(
    [body.summary.name, body.summary.step, body.summary.cover, body.summary.coverSource, body.summary.editing.scenarioId],
    ['Lure', 3, 'data:x', 'upload', 'SC-1']
  );
  assert.equal(body.summary.contentVersion, scenarioContentVersion(d));
  assert.equal('edit' in draftPutBody({ owner: A, saveId: 's', draft: draft('New') }).draft, false);
});

test('only a small draft is sent as the page closes (keepalive)', () => {
  assert.equal(fitsKeepalive(draft('Small'), A), true);
  assert.equal(fitsKeepalive(draft('Big', undefined, 0, { emailBody: 'x'.repeat(70 * 1024) }), A), false);
});

test('requests for one draft go one at a time, in order; an idle one starts at once', async () => {
  const order = [];
  let release;
  const first = queueDraftOp('SD-1', () => new Promise((r) => { release = r; }).then(() => order.push('first')), A);
  let started = false;
  queueDraftOp('SD-2', () => { started = true; }, A);
  assert.equal(started, true); // another draft's queue is idle: synchronous start
  const second = queueDraftOp('SD-1', () => order.push('second'), A);
  await tick();
  assert.deepEqual(order, []);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(order, ['first', 'second']);
});

// --- Saving and conflicts -------------------------------------------------------------------------

test('a first save goes with baseRev 0, is recorded, and comes back as rev 1', async () => {
  const server = fakeServer();
  const d = draft('Mine');
  const result = await saveScenarioDraftToServer({ api: server.api, actor: A, id: 'SD-1', draft: d });
  assert.deepEqual(result, { status: 'saved', id: 'SD-1', rev: 1 });
  assert.equal(server.calls[0].body.baseRev, 0);
  assert.equal(server.calls[0].body.owner, A);
  assert.equal(draftSyncState('SD-1', A).saves[0].rev, 1);
  assert.equal(server.row(A, 'SD-1').formData.scenarioName, 'Mine');
});

test('a save whose answer was lost is recognised as our own when sent again', async () => {
  const server = fakeServer();
  const d = draft('Mine');
  server.state.loseNextResponse = true;
  const lost = await saveScenarioDraftToServer({ api: server.api, actor: A, id: 'SD-1', draft: d });
  assert.equal(lost.status, 'failed');
  assert.equal(lost.kind, 'unavailable');
  // Next try (say, the next visit), still based on rev 0: the server reports our save.
  const again = await saveScenarioDraftToServer({ api: server.api, actor: A, id: 'SD-1', draft: d });
  assert.deepEqual(again, { status: 'saved', id: 'SD-1', rev: 1 });
  assert.equal(server.rows.size, 1);
});

test('an earlier save of the same work landed unseen: the newer content goes on top of it', async () => {
  const server = fakeServer();
  const v1 = draft('Mine v1');
  const v2 = draft('Mine v2', '2026-10-01T10:05:00Z');
  server.state.loseNextResponse = true;
  await saveScenarioDraftToServer({ api: server.api, actor: A, id: 'SD-1', draft: v1 });
  // The editor wrote v1 (and v2): its own work.
  const own = new Set([draftFingerprint(v1), draftFingerprint(v2)]);
  const result = await saveScenarioDraftToServer({
    api: server.api,
    actor: A,
    id: 'SD-1',
    draft: v2,
    isOwnContent: (fp) => own.has(fp),
  });
  assert.deepEqual(result, { status: 'saved', id: 'SD-1', rev: 2 });
  assert.equal(server.row(A, 'SD-1').formData.scenarioName, 'Mine v2');
  assert.equal(server.rows.size, 1);
});

test('deleted elsewhere (current null): saved again under the same id', async () => {
  const server = fakeServer();
  const result = await saveScenarioDraftToServer({ api: server.api, actor: A, id: 'SD-1', draft: draft('Mine'), baseRev: 4 });
  assert.deepEqual(result, { status: 'saved', id: 'SD-1', rev: 1 });
  assert.deepEqual(server.calls.map((c) => c.body.baseRev), [4, 0]);
});

test("someone else's newer save: theirs stays, ours is kept as a new draft", async () => {
  const server = fakeServer();
  server.seed(A, 'SD-1', draft('Base'));
  server.seed(A, 'SD-1', draft('Theirs', '2026-10-01T11:00:00Z')); // rev 2, from another device
  const result = await saveScenarioDraftToServer({ api: server.api, actor: A, id: 'SD-1', draft: draft('Ours'), baseRev: 1 });
  assert.equal(result.status, 'saved');
  assert.equal(result.forkedFrom, 'SD-1');
  assert.match(result.id, /^SD-/);
  assert.notEqual(result.id, 'SD-1');
  assert.equal(server.row(A, 'SD-1').formData.scenarioName, 'Theirs');
  assert.equal(server.row(A, result.id).formData.scenarioName, 'Ours');
  assert.equal(server.row(A, result.id).rev, 1);
  assert.equal(server.count('GET'), 1); // theirs was read to compare
  assert.match(CONFLICT_NOTICE, /kept as a separate draft/);
});

test('a conflict over the very same content is no conflict: no second draft', async () => {
  const server = fakeServer();
  const same = draft('Same', '2026-10-01T11:00:00Z');
  server.seed(A, 'SD-1', same);
  const result = await saveScenarioDraftToServer({ api: server.api, actor: A, id: 'SD-1', draft: same, baseRev: 0 });
  assert.deepEqual(result, { status: 'saved', id: 'SD-1', rev: 1 });
  assert.equal(server.rows.size, 1);
});

test('failures are told apart: too large, not deployed, busy, offline', async () => {
  const server = fakeServer();
  const d = draft('Mine');
  server.state.tooLarge = true;
  const big = await saveScenarioDraftToServer({ api: server.api, actor: A, id: 'SD-1', draft: d });
  assert.deepEqual([big.kind, big.error.message], ['tooLarge', 'Too large: images were probably pasted in.']);
  server.state.tooLarge = false;
  server.state.mode = 'busy';
  assert.equal((await saveScenarioDraftToServer({ api: server.api, actor: A, id: 'SD-1', draft: d })).kind, 'unavailable');
  server.state.mode = 'offline';
  assert.equal((await saveScenarioDraftToServer({ api: server.api, actor: A, id: 'SD-1', draft: d })).kind, 'unavailable');
  assert.equal(scenarioDraftsUnavailable(), false);
  server.state.mode = 'missing';
  assert.equal((await saveScenarioDraftToServer({ api: server.api, actor: A, id: 'SD-1', draft: d })).kind, 'missing');
  assert.equal(scenarioDraftsUnavailable(), true);
});

// --- The Drafts tab --------------------------------------------------------------------------------

test('Drafts tab: server list + copies here, newest first; the copy wins unless the server is newer', () => {
  const rows = [
    { draftId: 'SD-1', rev: 2, savedAt: '2026-10-03T10:00:00Z', summary: serverSummary(draft('Server newer')) },
    { draftId: 'SD-2', rev: 1, savedAt: '2026-10-01T10:00:00Z', summary: serverSummary(draft('Server older')) },
    { draftId: 'SD-3', rev: 1, savedAt: '2026-10-02T10:00:00Z', summary: { name: '' } },
    { draftId: 'SD-4', rev: 1, savedAt: '2026-10-05T10:00:00Z', summary: serverSummary(draft('Deleted here')) },
    { nope: true },
  ];
  const kept = [
    { id: 'SD-1', ...draft('Copy older', '2026-10-02T09:00:00Z') },
    { id: 'SD-2', ...draft('Copy newer', '2026-10-04T10:00:00Z') },
    { id: 'SD-5', ...draft('Only here', '2026-10-01T09:00:00Z') },
    { id: 'SD-6', ...buildDraft({ emailBody: DEFAULTS.emailBody }, 0, new Date('2026-10-06T00:00:00Z')) },
  ];
  const items = mergeScenarioDrafts(rows, kept, { deleted: ['SD-4'], defaults: DEFAULTS });
  assert.deepEqual(
    items.map((d) => [d.id, d.summary.name, Boolean(d.draft), d.listed]),
    [
      ['SD-2', 'Copy newer', true, true],
      ['SD-1', 'Server newer', false, true],
      ['SD-3', 'Untitled scenario', false, true],
      ['SD-5', 'Only here', true, false],
    ]
  );
  assert.equal(items[0].summary.savedAt, '2026-10-04T10:00:00.000Z');
});

test('Drafts tab visit: one list request, then old copies here are uploaded and let go', async () => {
  const server = fakeServer();
  server.seed(A, 'SD-srv', draft('From another device', '2026-10-05T10:00:00Z'));
  // Kept in this browser before drafts were on the server: today's list, and the older single key.
  saveScenarioDraft('SD-old1', draft('Old list draft', '2026-09-01T10:00:00Z', 2), A);
  store.set(`voisshield_scenario_draft:${A}`, JSON.stringify(draft('Older single draft', '2026-08-01T10:00:00Z', 1)));
  // Still being typed in an editor (saved just now): left to that editor.
  saveScenarioDraft('SD-now', draft('Typing', new Date().toISOString()), A);

  const load = loadScenarioDraftsTab({ api: server.api, actor: A, defaults: DEFAULTS });
  assert.equal(loadScenarioDraftsTab({ api: server.api, actor: A, defaults: DEFAULTS }), load); // shared
  const listed = await load.listed;
  assert.equal(listed.ok, true);
  assert.deepEqual(listed.items.map((d) => d.id).sort(), ['SD-now', 'SD-old1', 'SD-saved-before', 'SD-srv']);
  const sent = await load.sent;
  assert.equal(server.count('GET'), 1);
  assert.deepEqual(server.calls.filter((c) => c.method === 'PUT').map((c) => [c.id, c.body.baseRev]), [
    ['SD-saved-before', 0],
    ['SD-old1', 0],
  ]);
  assert.equal(server.row(A, 'SD-old1').activeTab, 2);
  assert.equal(server.row(A, 'SD-saved-before').formData.scenarioName, 'Older single draft');
  assert.deepEqual(listScenarioDrafts(A).map((d) => d.id), ['SD-now']);
  assert.equal(store.has(`voisshield_scenario_draft:${A}`), false);
  assert.deepEqual(sent.items.map((d) => d.id).sort(), ['SD-now', 'SD-old1', 'SD-saved-before', 'SD-srv']);
  assert.equal(sent.items.find((d) => d.id === 'SD-old1').summary.name, 'Old list draft');
});

test('Drafts tab without the server: the copies here, nothing sent, nothing lost', async () => {
  const server = fakeServer();
  saveScenarioDraft('SD-1', draft('Kept', '2026-09-01T10:00:00Z'), A);
  server.state.mode = 'offline';
  const load = loadScenarioDraftsTab({ api: server.api, actor: A, defaults: DEFAULTS });
  const listed = await load.listed;
  assert.equal(listed.ok, false);
  assert.deepEqual(listed.items.map((d) => d.id), ['SD-1']);
  await load.sent;
  assert.equal(server.count('PUT'), 0);
  assert.equal(getScenarioDraft('SD-1', A).formData.scenarioName, 'Kept');
});

test('Drafts tab: an upload that keeps failing stops the rest until the next visit', async () => {
  const server = fakeServer();
  saveScenarioDraft('SD-1', draft('One', '2026-09-01T10:00:00Z'), A);
  saveScenarioDraft('SD-2', draft('Two', '2026-09-02T10:00:00Z'), A);
  const rows = await listServerDrafts(server.api, A);
  server.state.mode = 'busy';
  await sendPendingScenarioDrafts({ api: server.api, actor: A, rows, defaults: DEFAULTS });
  assert.equal(server.count('PUT'), 1);
  assert.equal(listScenarioDrafts(A).length, 2);
});

test('people without an email keep their drafts in this browser only', async () => {
  const server = fakeServer();
  saveScenarioDraft('SD-1', draft('Kept', '2026-09-01T10:00:00Z'), 'Admin');
  const load = loadScenarioDraftsTab({ api: server.api, actor: 'Admin', defaults: DEFAULTS });
  assert.deepEqual((await load.sent).items.map((d) => d.id), ['SD-1']);
  assert.equal(server.calls.length, 0);
});

test('callers at the same moment share one list request', async () => {
  const server = fakeServer();
  const [x, y] = await Promise.all([listServerDrafts(server.api, A), listServerDrafts(server.api, A)]);
  assert.deepEqual(x, y);
  assert.equal(server.count('GET'), 1);
});

// --- Deleting ----------------------------------------------------------------------------------------

test('delete: a draft never sent is only here; a listed one is deleted on the server', async () => {
  const server = fakeServer();
  saveScenarioDraft('SD-1', draft('Never sent'), A);
  setActiveScenarioDraftId('SD-1', A);
  assert.equal(await deleteScenarioDraftEverywhere(server.api, 'SD-1', A), true);
  assert.equal(server.calls.length, 0);
  assert.equal(getActiveScenarioDraftId(A), '');
  server.seed(A, 'SD-2', draft('On the server'));
  assert.equal(await deleteScenarioDraftEverywhere(server.api, 'SD-2', A, { listed: true }), true);
  assert.equal(server.row(A, 'SD-2'), null);
  assert.deepEqual(pendingDraftDeletes(A), []);
});

test('delete offline: remembered, hidden from the list, sent at the next visit', async () => {
  const server = fakeServer();
  server.seed(A, 'SD-2', draft('On the server'));
  server.state.mode = 'offline';
  assert.equal(await deleteScenarioDraftEverywhere(server.api, 'SD-2', A, { listed: true }), false);
  assert.equal(isDeletePending('SD-2', A), true);
  server.state.mode = 'ok';
  const load = loadScenarioDraftsTab({ api: server.api, actor: A, defaults: DEFAULTS });
  assert.deepEqual((await load.listed).items, []); // listed by the server, but deleted here
  await load.sent;
  assert.equal(server.row(A, 'SD-2'), null);
  assert.equal(isDeletePending('SD-2', A), false);
  // A pending delete the server no longer lists needs no request.
  addPendingDelete('SD-9', A);
  const before = server.calls.length;
  await loadScenarioDraftsTab({ api: server.api, actor: A, defaults: DEFAULTS }).sent;
  assert.equal(server.calls.length - before, 1); // the list only
  assert.deepEqual(pendingDraftDeletes(A), []);
});

test('a draft deleted during a visit does not come back with a list read before the delete', async () => {
  const server = fakeServer();
  server.seed(A, 'SD-1', draft('Deleted while the visit was loading'));
  server.seed(A, 'SD-2', draft('Kept'));
  let release;
  server.state.hold = new Promise((r) => { release = r; });
  const load = loadScenarioDraftsTab({ api: server.api, actor: A, defaults: DEFAULTS });
  await tick();
  server.state.hold = null;
  release();
  const listed = await load.listed;
  assert.deepEqual(listed.items.map((d) => d.id).sort(), ['SD-1', 'SD-2']);
  await deleteScenarioDraftEverywhere(server.api, 'SD-1', A, { listed: true });
  assert.deepEqual((await load.sent).items.map((d) => d.id), ['SD-2']);
});

test('a delete waits for a save of the same draft already on its way', async () => {
  const server = fakeServer();
  let release;
  server.state.hold = new Promise((r) => { release = r; });
  const saving = saveScenarioDraftToServer({ api: server.api, actor: A, id: 'SD-1', draft: draft('x') });
  const queuedSave = queueDraftOp('SD-1', () => saving, A);
  const deleting = deleteScenarioDraftEverywhere(server.api, 'SD-1', A);
  server.state.hold = null;
  release();
  await queuedSave;
  await deleting;
  assert.deepEqual(server.calls.map((c) => c.method), ['PUT', 'DELETE']);
  assert.equal(server.rows.size, 0);
});

test("deleting a scenario deletes this person's edits of it, here and on the server", async () => {
  const server = fakeServer();
  server.seed(A, 'SD-e1', editDraft('SC-905', 'Mine', '2026-10-02T10:00:00Z'));
  server.seed(A, 'SD-e2', editDraft('SC-906', 'Other', '2026-10-02T10:00:00Z'));
  // Kept here only (saved just now, so the visit leaves it to its editor).
  saveScenarioDraft('SD-e3', editDraft('SC-905', 'Mine', new Date().toISOString()), A);
  const items = (await loadScenarioDraftsTab({ api: server.api, actor: A, defaults: DEFAULTS }).sent).items;
  assert.deepEqual(items.map((d) => d.id).sort(), ['SD-e1', 'SD-e2', 'SD-e3']);
  await removeEditDraftsEverywhere(server.api, 'SC-905', items, A);
  assert.equal(server.row(A, 'SD-e1'), null);
  assert.ok(server.row(A, 'SD-e2'));
  assert.equal(getScenarioDraft('SD-e3', A), null);
  assert.deepEqual(server.calls.filter((c) => c.method === 'DELETE').map((c) => c.id), ['SD-e1']);
  // An edit started elsewhere after this page read its list is found too.
  server.seed(A, 'SD-e4', editDraft('SC-906', 'Other', '2026-10-04T10:00:00Z'));
  await removeEditDraftsEverywhere(server.api, 'SC-906', items, A);
  assert.equal(server.row(A, 'SD-e2'), null);
  assert.equal(server.row(A, 'SD-e4'), null);
});

test('an unfinished edit holds its scenario back; a template\'s edit (a new version) does not', async () => {
  const server = fakeServer();
  const ownEdit = (scenarioId, name, savedAt, mode = 'update') =>
    buildDraft({ scenarioId, scenarioName: name, emailSubject: 'changed' }, 1, new Date(savedAt), {
      scenarioId,
      mode,
      name,
      baseline: 'x',
    });
  server.seed(A, 'SD-u1', ownEdit('SC-905', 'Mine', '2026-10-02T10:00:00Z'));
  server.seed(A, 'SD-r1', ownEdit('SC-906', 'My shared one', '2026-10-02T10:00:00Z', 'revision'));
  server.seed(A, 'SD-c1', editDraft('SC-001', 'A template', '2026-10-02T10:00:00Z'));
  server.seed(B, 'SD-b1', ownEdit('SC-908', 'Someone else\'s', '2026-10-02T10:00:00Z'));
  saveScenarioDraft('SD-u2', ownEdit('SC-907', 'Kept here only', '2026-10-03T10:00:00Z'), A);
  addPendingDelete('SD-gone', A);
  server.seed(A, 'SD-gone', ownEdit('SC-909', 'Deleted here', '2026-10-02T10:00:00Z'));

  const items = await readScenarioDraftItems(server.api, A, DEFAULTS);
  assert.deepEqual([...editedScenarioIds(items)].sort(), ['SC-905', 'SC-906', 'SC-907']);
  // Only read: one list request, nothing sent, nothing deleted.
  assert.deepEqual(server.calls.map((c) => [c.method, c.id]), [['GET', '']]);

  // Without the server, what is kept here.
  resetScenarioDraftSync();
  server.state.mode = 'offline';
  assert.deepEqual([...editedScenarioIds(await readScenarioDraftItems(server.api, A, DEFAULTS))], ['SC-907']);
  assert.deepEqual([...editedScenarioIds([])], []);
  assert.deepEqual([...editedScenarioIds(null)], []);
});

// --- The draft in progress ("Continue your scenario?") -----------------------------------------------

test('the draft in progress is found among the items; its version from the summary, or read', async () => {
  const server = fakeServer();
  const d = draft('In progress', '2026-10-02T10:00:00Z');
  server.seed(A, 'SD-1', d);
  setActiveScenarioDraftId('SD-1', A);
  const items = (await loadScenarioDraftsTab({ api: server.api, actor: A, defaults: DEFAULTS }).listed).items;
  const found = inProgressAmong(items, A, DEFAULTS);
  assert.deepEqual([found.id, found.summary.name, found.version], ['SD-1', 'In progress', scenarioContentVersion(d)]);
  // A summary without the version (an older client wrote it): read the draft.
  delete items[0].summary.contentVersion;
  assert.equal(inProgressAmong(items, A, DEFAULTS).version, '');
  assert.equal((await resolveInProgress(items, A, server.api, DEFAULTS)).version, scenarioContentVersion(d));
  setActiveScenarioDraftId('', A);
  assert.equal(inProgressAmong(items, A, DEFAULTS), null);
});

// --- Where the editor opens ----------------------------------------------------------------------------

test('editor opening: ?draft=<id> opens the copy kept here, without asking the server', async () => {
  const server = fakeServer();
  saveScenarioDraft('SD-1', draft('Unsent work'), A);
  setDraftBaseRev('SD-1', 3, A);
  assert.equal(openingNeedsServer({ requestedId: 'SD-1' }, A), false);
  const o = await loadScenarioEditorOpening({ requestedId: 'SD-1', defaults: DEFAULTS }, A, server.api);
  assert.deepEqual([o.id, o.resume.formData.scenarioName, o.rev, o.synced], ['SD-1', 'Unsent work', 3, false]);
  assert.equal(server.calls.length, 0);
});

test('editor opening: ?draft=<id> only on the server is read once, in sync', async () => {
  const server = fakeServer();
  server.seed(A, 'SD-1', draft('From another device', '2026-10-02T10:00:00Z', 2));
  server.seed(A, 'SD-1', draft('From another device, v2', '2026-10-02T11:00:00Z', 2));
  assert.equal(openingNeedsServer({ requestedId: 'SD-1' }, A), true);
  const [o, same] = await Promise.all([
    loadScenarioEditorOpening({ requestedId: 'SD-1', defaults: DEFAULTS }, A, server.api),
    loadScenarioEditorOpening({ requestedId: 'SD-1', defaults: DEFAULTS }, A, server.api),
  ]);
  assert.equal(o, same);
  assert.deepEqual([o.id, o.resume.formData.scenarioName, o.resume.activeTab, o.rev, o.synced], [
    'SD-1',
    'From another device, v2',
    2,
    2,
    true,
  ]);
  assert.equal(server.count('GET'), 1);
});

test('editor opening: an unknown ?draft id stays the new draft id; a server that is down opens blank', async () => {
  const server = fakeServer();
  const o = await loadScenarioEditorOpening({ requestedId: 'SD-new', defaults: DEFAULTS }, A, server.api);
  assert.deepEqual([o.id, o.resume, o.offer], ['SD-new', null, null]);
  server.state.mode = 'offline';
  const down = await loadScenarioEditorOpening({ requestedId: 'SD-x', defaults: DEFAULTS }, A, server.api);
  assert.deepEqual([down.id, down.resume], ['SD-x', null]);
});

test('editor opening: ?edit=<id> finds the unfinished edit in the server list (the newer one)', async () => {
  const server = fakeServer();
  server.seed(A, 'SD-e1', editDraft('SC-101', 'Password expiry', '2026-10-03T10:00:00Z'));
  saveScenarioDraft('SD-e0', editDraft('SC-101', 'Password expiry', '2026-10-01T10:00:00Z'), A);
  assert.equal(openingNeedsServer({ editId: 'SC-101' }, A), true);
  const o = await loadScenarioEditorOpening({ editId: 'SC-101', defaults: DEFAULTS }, A, server.api);
  assert.deepEqual([o.id, o.resume.edit.scenarioId, o.synced, o.offer], ['SD-e1', 'SC-101', true, null]);
  assert.deepEqual(server.calls.map((c) => [c.method, c.id]), [['GET', ''], ['GET', 'SD-e1']]);
  // The copy here is newer: opened from here, no draft read.
  saveScenarioDraft('SD-e0', editDraft('SC-101', 'Password expiry', '2026-10-09T10:00:00Z'), A);
  const here = await loadScenarioEditorOpening({ editId: 'SC-101', defaults: DEFAULTS }, A, server.api);
  assert.deepEqual([here.id, here.synced], ['SD-e0', false]);
});

test('editor opening: Edit from a Scenarios page that read the list needs no second list', async () => {
  const server = fakeServer();
  assert.equal(openingNeedsServer({ editId: 'SC-101', editChecked: true }, A), false);
  const o = await loadScenarioEditorOpening({ editId: 'SC-101', editChecked: true, defaults: DEFAULTS }, A, server.api);
  assert.deepEqual([o.resume, o.offer], [null, null]);
  assert.equal(server.calls.length, 0);
  // An edit kept here is still found (and opened from here).
  saveScenarioDraft('SD-e0', editDraft('SC-101', 'Password expiry', '2026-10-01T10:00:00Z'), A);
  assert.equal(openingNeedsServer({ editId: 'SC-101', editChecked: true }, A), false);
  const here = await loadScenarioEditorOpening({ editId: 'SC-101', editChecked: true, defaults: DEFAULTS }, A, server.api);
  assert.equal(here.id, 'SD-e0');
  assert.equal(server.calls.length, 0);
});

test('editor opening: the draft in progress on the server is offered back, once', async () => {
  const server = fakeServer();
  const d = draft('In progress elsewhere', '2026-10-02T10:00:00Z', 1);
  server.seed(A, 'SD-5', d);
  setActiveScenarioDraftId('SD-5', A);
  assert.equal(openingNeedsServer({}, A), true);
  assert.equal(openingNeedsServer({ startFresh: true }, A), false);
  const o = await loadScenarioEditorOpening({ defaults: DEFAULTS }, A, server.api);
  assert.deepEqual([o.offer.id, o.offer.rev, o.offer.synced, o.resume], ['SD-5', 1, true, null]);
  assert.notEqual(o.id, 'SD-5');
  markAsked('scenario', 'SD-5', scenarioContentVersion(d), A);
  assert.equal((await loadScenarioEditorOpening({ defaults: DEFAULTS }, A, server.api)).offer, null);
});

// --- When the editor sends (scenarioDraftSender.js) ------------------------------------------------------

function sender(server, clock, extra = {}) {
  const events = [];
  const s = createScenarioDraftSender({
    api: server.api,
    actor: A,
    id: 'SD-1',
    clock,
    onSaved: (e) => events.push(['saved', e]),
    onFailed: (e) => events.push(['failed', e.kind]),
    ...extra,
  });
  return { s, events };
}

test('sender: typing is sent once, SEND_DEBOUNCE_MS after the last change', async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const { s, events } = sender(server, clock);
  for (let i = 0; i < 20; i += 1) {
    assert.equal(s.changed(draft(`Typing ${i}`)), 'unsent');
    await clock.advance(1000);
  }
  assert.equal(server.count('PUT'), 0);
  await clock.advance(SEND_DEBOUNCE_MS);
  assert.equal(server.count('PUT'), 1);
  assert.equal(server.row(A, 'SD-1').formData.scenarioName, 'Typing 19');
  assert.deepEqual(events, [['saved', { id: 'SD-1', rev: 1, forkedFrom: '', upToDate: true }]]);
  assert.equal(s.baseRev, 1);
});

test('sender: someone typing without a pause is still sent every MAX_SEND_WAIT_MS', async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const { s } = sender(server, clock);
  for (let i = 0; i < 130; i += 1) {
    s.changed(draft(`Typing ${i}`));
    await clock.advance(1000);
  }
  assert.equal(server.count('PUT'), 2);
  assert.ok(MAX_SEND_WAIT_MS <= 65000);
});

test("sender: what the server already has is never sent; a change undone isn't either", async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const opened = draft('Opened', '2026-10-01T10:00:00Z', 1);
  server.seed(A, 'SD-1', opened);
  const { s } = sender(server, clock, { rev: 1, server: opened });
  assert.equal(s.changed(buildDraft(opened.formData, 1, new Date())), 'synced');
  assert.equal(s.holds(opened), true);
  s.changed(draft('Opened, edited', undefined, 1));
  await clock.advance(1000);
  assert.equal(s.changed(buildDraft(opened.formData, 1, new Date())), 'synced');
  await clock.advance(60000);
  assert.equal(server.count('PUT'), 0);
});

test('sender: one request at a time; changes made meanwhile go after it', async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const { s } = sender(server, clock);
  let release;
  server.state.hold = new Promise((r) => { release = r; });
  s.changed(draft('First'));
  await clock.advance(SEND_DEBOUNCE_MS);
  assert.equal(server.count('PUT'), 1);
  s.changed(draft('Second'));
  s.sendSoon(); // a step change while the first is out
  await clock.advance(SEND_DEBOUNCE_MS * 2);
  assert.equal(server.count('PUT'), 1);
  server.state.hold = null;
  release();
  await settle();
  await clock.advance(SEND_DEBOUNCE_MS);
  assert.equal(server.count('PUT'), 2);
  assert.deepEqual(server.calls.filter((c) => c.method === 'PUT').map((c) => c.body.baseRev), [0, 1]);
  assert.equal(server.row(A, 'SD-1').formData.scenarioName, 'Second');
});

test('sender: after a failure, retried no sooner than RETRY_MS, doubling; given up after a few', async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const { s, events } = sender(server, clock);
  server.state.mode = 'offline';
  s.changed(draft('Offline work'));
  await clock.advance(SEND_DEBOUNCE_MS);
  assert.equal(server.count('PUT'), 1);
  s.changed(draft('More offline work'));
  s.sendSoon();
  await clock.advance(RETRY_MS - 1000);
  assert.equal(server.count('PUT'), 1); // nothing before the wait is over
  await clock.advance(1000);
  assert.equal(server.count('PUT'), 2);
  await clock.advance(RETRY_MS * 2);
  assert.equal(server.count('PUT'), 3);
  await clock.advance(RETRY_MS * 20);
  s.changed(draft('Even more'));
  await clock.advance(RETRY_MS * 20);
  assert.equal(server.count('PUT'), 3); // given up until the editor is opened again
  assert.deepEqual(events.map((e) => e[1]), ['unavailable', 'unavailable', 'unavailable']);
});

test('sender: the API not deployed (404) stops all sending after one try', async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const { s } = sender(server, clock);
  server.state.mode = 'missing';
  s.changed(draft('Work'));
  await clock.advance(SEND_DEBOUNCE_MS);
  s.changed(draft('More work'));
  await s.leave();
  await clock.advance(RETRY_MS * 10);
  assert.equal(server.count('PUT'), 1);
});

test('sender: too large is reported, and the content is kept for a later try', async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const { s, events } = sender(server, clock);
  server.state.tooLarge = true;
  s.changed(draft('Huge'));
  await clock.advance(SEND_DEBOUNCE_MS);
  assert.deepEqual(events, [['failed', 'tooLarge']]);
  server.state.tooLarge = false;
  await clock.advance(RETRY_MS);
  assert.equal(server.row(A, 'SD-1').formData.scenarioName, 'Huge');
});

test("sender: someone else's newer save keeps both; the editor carries on with the new draft", async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const opened = draft('Opened', '2026-10-01T10:00:00Z');
  server.seed(A, 'SD-1', opened);
  const { s, events } = sender(server, clock, { rev: 1, server: opened });
  setActiveScenarioDraftId('SD-1', A);
  server.seed(A, 'SD-1', draft('Changed in another window', '2026-10-01T10:01:00Z'));
  const mine = draft('Mine', '2026-10-01T10:02:00Z');
  saveScenarioDraft('SD-1', mine, A); // the copy the editor wrote here
  s.changed(mine);
  await clock.advance(SEND_DEBOUNCE_MS);
  const [kind, saved] = events[0];
  assert.equal(kind, 'saved');
  assert.equal(saved.forkedFrom, 'SD-1');
  assert.equal(s.id, saved.id);
  assert.equal(server.row(A, 'SD-1').formData.scenarioName, 'Changed in another window');
  assert.equal(server.row(A, saved.id).formData.scenarioName, 'Mine');
  // The copy here was let go (the server has it), and the pointer follows.
  assert.equal(getScenarioDraft('SD-1', A), null);
  assert.equal(getActiveScenarioDraftId(A), saved.id);
  // Later changes go to the new draft.
  s.changed(draft('Mine, more'));
  await clock.advance(SEND_DEBOUNCE_MS);
  assert.equal(server.row(A, saved.id).formData.scenarioName, 'Mine, more');
  assert.equal(server.row(A, saved.id).rev, 2);
});

test('sender: work typed while a conflicting save was out moves to the new draft too', async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const opened = draft('Opened');
  server.seed(A, 'SD-1', opened);
  server.seed(A, 'SD-1', draft('Theirs', '2026-10-01T10:01:00Z'));
  const { s } = sender(server, clock, { rev: 1, server: opened });
  let release;
  server.state.hold = new Promise((r) => { release = r; });
  s.changed(draft('Mine'));
  await clock.advance(SEND_DEBOUNCE_MS);
  const newer = draft('Mine, typed meanwhile', '2026-10-01T10:03:00Z');
  saveScenarioDraft('SD-1', newer, A);
  s.changed(newer);
  server.state.hold = null;
  release();
  await settle(12);
  assert.notEqual(s.id, 'SD-1');
  assert.equal(getScenarioDraft(s.id, A).formData.scenarioName, 'Mine, typed meanwhile');
  assert.equal(getScenarioDraft('SD-1', A), null);
  await clock.advance(SEND_DEBOUNCE_MS);
  assert.equal(server.row(A, s.id).formData.scenarioName, 'Mine, typed meanwhile');
  assert.equal(getScenarioDraft(s.id, A), null);
});

test('sender: "Save as draft" sends at once and takes nothing more', async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const { s } = sender(server, clock);
  s.changed(draft('Parked'));
  await s.park();
  assert.equal(server.count('PUT'), 1);
  s.changed(draft('After parking'));
  await clock.advance(RETRY_MS);
  assert.equal(server.count('PUT'), 1);
});

test('sender: published while a save is out: deleted after it, nothing more sent', async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const { s } = sender(server, clock);
  let release;
  server.state.hold = new Promise((r) => { release = r; });
  s.changed(draft('Publishing'));
  await clock.advance(SEND_DEBOUNCE_MS);
  const gone = s.discard();
  server.state.hold = null;
  release();
  await gone;
  await clock.advance(RETRY_MS);
  assert.deepEqual(server.calls.map((c) => c.method), ['PUT', 'DELETE']);
  assert.equal(server.rows.size, 0);
});

test('sender: as the page closes, a small draft goes as keepalive; a big one waits here', async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const { s } = sender(server, clock);
  s.changed(draft('Small'));
  await s.pageHidden();
  assert.deepEqual(server.calls.map((c) => [c.method, c.keepalive]), [['PUT', true]]);
  s.changed(draft('Big', undefined, 0, { emailBody: 'x'.repeat(70 * 1024) }));
  await s.pageHidden();
  assert.equal(server.count('PUT'), 1);
  // Within a failure's wait, closing the page sends nothing either.
  server.state.mode = 'offline';
  s.changed(draft('Small again'));
  await clock.advance(SEND_DEBOUNCE_MS);
  assert.equal(server.count('PUT'), 2);
  s.changed(draft('Small, once more'));
  await s.pageHidden();
  assert.equal(server.count('PUT'), 2);
});

test('sender: an emptied form, left, deletes the draft the server had', async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const opened = draft('Opened');
  server.seed(A, 'SD-1', opened);
  const { s } = sender(server, clock, { rev: 1, server: opened });
  s.emptied();
  await s.leave();
  assert.deepEqual(server.calls.map((c) => c.method), ['DELETE']);
  // A new draft emptied and left: nothing to tell the server.
  const fresh = sender(server, clock, { id: 'SD-2' }).s;
  fresh.emptied();
  await fresh.leave();
  assert.equal(server.calls.length, 1);
});

test('sender: switching to the draft offered back sends to it, on its rev', async () => {
  const server = fakeServer();
  const clock = fakeClock();
  const offered = draft('Offered');
  server.seed(A, 'SD-9', offered);
  const { s } = sender(server, clock, { id: 'SD-new' });
  s.switchTo({ id: 'SD-9', rev: 1, server: offered });
  assert.equal(s.changed(buildDraft(offered.formData, 0, new Date())), 'synced');
  s.changed(draft('Offered, continued'));
  await clock.advance(SEND_DEBOUNCE_MS);
  assert.equal(server.row(A, 'SD-9').rev, 2);
  assert.equal(server.rows.size, 1);
});

test('two people never see each other\'s drafts', async () => {
  const server = fakeServer();
  server.seed(B, 'SD-b', draft("B's"));
  const items = (await loadScenarioDraftsTab({ api: server.api, actor: A, defaults: DEFAULTS }).listed).items;
  assert.deepEqual(items, []);
});

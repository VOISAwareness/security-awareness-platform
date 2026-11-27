import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { preparePage, queuePage, resetPagePrefetch } from './pagePrefetch.js';

// An idle callback the test runs by hand, one at a time.
function idleWindow() {
  const waiting = [];
  return {
    win: { requestIdleCallback: (fn) => waiting.push(fn) },
    async runAll() {
      while (waiting.length) {
        waiting.shift()();
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    },
  };
}

beforeEach(() => resetPagePrefetch());

test('queued pages load one at a time, in order, each once', async () => {
  const order = [];
  const code = { '/a': async () => order.push('a'), '/b': async () => order.push('b') };
  const idle = idleWindow();
  queuePage('/a', { code, win: idle.win, nav: {} });
  queuePage('/b', { code, win: idle.win, nav: {} });
  queuePage('/a', { code, win: idle.win, nav: {} }); // already queued
  queuePage('/unknown', { code, win: idle.win, nav: {} }); // not a menu page
  assert.deepEqual(order, []); // nothing until the browser is idle
  await idle.runAll();
  assert.deepEqual(order, ['a', 'b']);
  queuePage('/a', { code, win: idle.win, nav: {} }); // loaded: not again
  await idle.runAll();
  assert.deepEqual(order, ['a', 'b']);
});

test('nothing is queued on a data-saver or 2G connection', async () => {
  const order = [];
  const code = { '/a': async () => order.push('a') };
  const idle = idleWindow();
  queuePage('/a', { code, win: idle.win, nav: { connection: { saveData: true } } });
  queuePage('/a', { code, win: idle.win, nav: { connection: { effectiveType: 'slow-2g' } } });
  await idle.runAll();
  assert.deepEqual(order, []);
  queuePage('/a', { code, win: idle.win, nav: { connection: { effectiveType: '4g' } } });
  await idle.runAll();
  assert.deepEqual(order, ['a']);
});

test('a hover loads the code now and starts the first reads as that person', async () => {
  const seen = [];
  let loads = 0;
  const code = { '/a': async () => { loads += 1; } };
  const reads = { '/a': ({ viewer, role }) => [Promise.resolve(seen.push([viewer, role])), Promise.reject(new Error('down'))] };
  preparePage('/a', { code, reads, viewer: 'ana@x.example', role: 'Admin' });
  preparePage('/a', { code, reads, viewer: 'ana@x.example', role: 'Admin' }); // code once; reads go to the cache
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(loads, 1);
  assert.deepEqual(seen, [['ana@x.example', 'Admin'], ['ana@x.example', 'Admin']]);
  preparePage('/no-reads', { code, reads }); // a page with no reads listed: nothing breaks
});

test('code that fails to load is tried again next time', async () => {
  let tries = 0;
  const code = { '/a': async () => { tries += 1; if (tries === 1) throw new Error('offline'); } };
  preparePage('/a', { code, reads: {} });
  await new Promise((resolve) => setTimeout(resolve, 0));
  preparePage('/a', { code, reads: {} });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(tries, 2);
});

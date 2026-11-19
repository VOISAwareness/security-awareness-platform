import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { afterWrite, cachedGet, DEFAULT_FRESH_MS, forgetReads, freshFor, readUrl } from './queryCache.js';

const fresh = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const counter = (value) => {
  const load = async () => {
    load.calls += 1;
    return typeof value === 'function' ? value(load.calls) : value;
  };
  load.calls = 0;
  return load;
};

test('a read is answered from memory while fresh', async () => {
  const client = fresh();
  const load = counter([{ id: 1 }]);
  await cachedGet('/campaigns', load, { client });
  await cachedGet('/campaigns', load, { client });
  assert.equal(load.calls, 1);
  await cachedGet('/campaigns?x=1', load, { client }); // another path is another read
  assert.equal(load.calls, 2);
});

test('reads at the same moment share one request', async () => {
  const client = fresh();
  const load = counter(['a']);
  await Promise.all([cachedGet('/scenarios', load, { client }), cachedGet('/scenarios', load, { client })]);
  assert.equal(load.calls, 1);
});

test('each caller gets its own copy', async () => {
  const client = fresh();
  const load = counter([{ n: 2 }, { n: 1 }]);
  const first = await cachedGet('/x', load, { client });
  first.sort((a, b) => a.n - b.n);
  first[0].n = 99;
  assert.deepEqual(await cachedGet('/x', load, { client }), [{ n: 2 }, { n: 1 }]);
});

test('a write makes the next read fresh; fresh: true always reads', async () => {
  const client = fresh();
  const load = counter((n) => n);
  assert.equal(await cachedGet('/my-training?viewer=a', load, { client }), 1);
  await afterWrite({ client });
  assert.equal(await cachedGet('/my-training?viewer=a', load, { client }), 2);
  assert.equal(await cachedGet('/my-training?viewer=a', load, { client }), 2);
  assert.equal(await cachedGet('/my-training?viewer=a', load, { client, fresh: true }), 3);
  forgetReads({ client });
  assert.equal(await cachedGet('/my-training?viewer=a', load, { client }), 4);
});

test('a failed read is not kept', async () => {
  const client = fresh();
  let calls = 0;
  const flaky = async () => {
    calls += 1;
    if (calls === 1) throw new Error('busy');
    return 'ok';
  };
  await assert.rejects(cachedGet('/levels', flaky, { client }), /busy/);
  assert.equal(await cachedGet('/levels', flaky, { client }), 'ok');
});

test('slow-changing reads stay fresh longer', () => {
  assert.equal(freshFor('/insights?role=Admin'), 5 * 60 * 1000);
  assert.equal(freshFor('/insights/board?role=Admin&viewer=x'), 5 * 60 * 1000);
  assert.equal(freshFor('/insights-targets'), 5 * 60 * 1000);
  assert.equal(freshFor('/campaigns/CAMP-1/results'), 60 * 1000);
  assert.equal(freshFor('/campaigns/CAMP-1'), DEFAULT_FRESH_MS);
  assert.equal(freshFor('/users'), 5 * 60 * 1000);
  assert.equal(freshFor('/campaigns'), DEFAULT_FRESH_MS);
});

test('after a write, reads skip the shared (CloudFront) copy', async () => {
  assert.equal(readUrl('/training/paths', 0), '/training/paths');
  assert.equal(readUrl('/training/paths', 1763540000000), '/training/paths?_w=1763540000000');
  assert.equal(readUrl('/insights?role=Admin', 5), '/insights?role=Admin&_w=5');
  const client = fresh();
  const later = Date.now() + 60_000; // later than any write the tests above made
  await afterWrite({ client, now: later });
  assert.equal(readUrl('/levels'), `/levels?_w=${later}`);
  await afterWrite({ client, now: later }); // two writes in the same millisecond still differ
  assert.equal(readUrl('/levels'), `/levels?_w=${later + 1}`);
});

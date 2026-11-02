import assert from 'node:assert/strict';
import test from 'node:test';

import { fromServer, mergePackages, serverFields } from './trainingPackages.js';

test('fromServer: a row plays from its S3 link', () => {
  const p = fromServer({ PackageID: 'SP-001', PackageName: 'A', Duration: 20, PackageURL: 'https://s3/x.zip?X-Amz-Signature=1' });
  assert.equal(p.isLocalUrl, true);
  assert.equal(p.localPath, 'https://s3/x.zip?X-Amz-Signature=1');
  assert.equal(p.duration, 20);
  assert.equal(p.onServer, true);
  assert.equal(p.compiledHtmlUrl, '');
  const none = fromServer({ PackageID: 'SP-002' });
  assert.equal(none.isLocalUrl, false);
  assert.equal(none.localPath, '');
  assert.equal(none.duration, null);
});

test('serverFields: only what the API saves, trimmed; minutes within 0-600', () => {
  assert.deepEqual(
    serverFields({ PackageID: 'SP-1', PackageName: ' Fleet ', Description: '', TargetAudience: 'All Employees', Difficulty: 'Intermediate', duration: 20, fileBlob: {}, Size: '1 MB' }),
    { PackageName: 'Fleet', TargetAudience: 'All Employees', Difficulty: 'Intermediate', Duration: 20 },
  );
  assert.equal(serverFields({ PackageName: 'A', duration: 2.5 }).Duration, undefined);
  assert.equal(serverFields({ PackageName: 'A', duration: 601 }).Duration, undefined);
  assert.equal(serverFields({ PackageName: 'A', Duration: 0 }).Duration, 0);
});

test('mergePackages: one of each id, the first list winning, order kept', () => {
  const out = mergePackages([{ PackageID: 'SP-002', n: 'server' }, { PackageID: 'SP-001' }], [{ PackageID: 'SP-002', n: 'browser' }, { PackageID: 'SP-99' }], [null, {}]);
  assert.deepEqual(out.map((p) => p.PackageID), ['SP-002', 'SP-001', 'SP-99']);
  assert.equal(out[0].n, 'server');
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { anyUnpacking, fromServer, mergePackages, packageState, serverFields } from './trainingPackages.js';

test('fromServer: a row plays from its S3 link', () => {
  const p = fromServer({ PackageID: 'SP-001', PackageName: 'A', Duration: 20, PackageURL: 'https://s3/x.zip?X-Amz-Signature=1' });
  assert.equal(p.isLocalUrl, true);
  assert.equal(p.localPath, 'https://s3/x.zip?X-Amz-Signature=1');
  assert.equal(p.duration, 20);
  assert.equal(p.onServer, true);
  assert.equal('compiledHtmlUrl' in p, false);
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

test('packageState: what each package card says', () => {
  const server = (row) => fromServer({ PackageID: 'SP-1', ...row });
  assert.equal(packageState(server({ ContentStatus: 'READY', ScormVersion: '1.2' })).label, 'Ready · SCORM 1.2');
  assert.equal(packageState(server({ ContentStatus: 'READY' })).label, 'Ready · HTML5');
  assert.equal(packageState(server({ ContentStatus: 'EXTRACTING' })).busy, true);
  const failed = packageState(server({ ContentStatus: 'FAILED', ContentError: 'The zip is empty' }));
  assert.deepEqual([failed.tone, failed.detail, failed.canRetry], ['bad', 'The zip is empty', true]);
  assert.equal(packageState(server({})).canRetry, true); // saved before packages were unpacked
  assert.equal(packageState({ PackageID: 'SP-SAMPLE', isSample: true }).label, 'Built-in sample');
  assert.equal(packageState({ PackageID: 'SP-77', fileBlob: {} }).label, 'In this browser only');
  assert.equal(anyUnpacking([server({ ContentStatus: 'READY' }), server({ ContentStatus: 'PENDING' })]), true);
  assert.equal(anyUnpacking([server({ ContentStatus: 'READY' }), { ContentStatus: 'PENDING' }]), false);
});

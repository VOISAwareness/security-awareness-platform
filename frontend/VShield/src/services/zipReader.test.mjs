import assert from 'node:assert/strict';
import test from 'node:test';
import { strToU8, zipSync } from 'fflate';

import { zipReader } from './zipReader.js';

const zip = zipSync({
  'course/': new Uint8Array(),
  'course/index.html': strToU8('<html><body><img src="img/a.png"></body></html>'),
  'course/img/a.png': new Uint8Array([137, 80, 78, 71]),
});

test('reads a zip the way the training pages read JSZip', async () => {
  const z = await zipReader.loadAsync(new Blob([zip]));
  const files = Object.keys(z.files).filter((k) => !z.files[k].dir).sort();
  assert.deepEqual(files, ['course/img/a.png', 'course/index.html']);
  assert.ok(z.files['course/'].dir);
  assert.match(await z.files['course/index.html'].async('string'), /img\/a\.png/);
  const png = await z.files['course/img/a.png'].async('blob');
  assert.equal(png.size, 4);
});

test('a file that is not a zip is a clear error', async () => {
  await assert.rejects(zipReader.loadAsync(new Blob([strToU8('not a zip')])), /Could not read the zip/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';
import { checkPackageEntries, checkPackageZip, zipEntries } from './zipEntries.js';

const blob = (files, opts) => new Blob([zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])), opts)]);

test('lists a zip\'s files without unpacking it', async () => {
  const entries = await zipEntries(blob({ 'course/index.html': '<html>', 'course/js/app.js': 'x', 'Ünïcode.txt': 'y' }));
  assert.deepEqual(entries.map((e) => e.name).sort(), ['course/index.html', 'course/js/app.js', 'Ünïcode.txt'].sort());
  assert.ok(entries.every((e) => e.encrypted === false));
});

test('the real sample package is a SCORM package', async () => {
  const buf = readFileSync(new URL('../assets/Training(LMS)/samples/sample-scorm12-spot-the-phish.zip', import.meta.url));
  assert.deepEqual(await checkPackageZip(new Blob([buf])), { ok: true, kind: 'scorm', files: 4 });
});

test('a zip comment does not hide the directory', async () => {
  const withComment = new Blob([zipSync({ 'a.html': strToU8('x') }, { comment: 'made by a tool' })]);
  assert.equal((await zipEntries(withComment)).length, 1);
});

test('what the server would refuse is caught first', async () => {
  assert.deepEqual(await checkPackageZip(new Blob(['not a zip at all, just text'])), { ok: false, why: "This file isn't a readable zip." });
  assert.equal((await checkPackageZip(blob({ 'readme.txt': 'x' }))).why, 'The zip has no imsmanifest.xml and no HTML page to open.');
  assert.equal((await checkPackageZip(blob({ '__MACOSX/._a.html': 'x' }))).why, 'The zip is empty.');
  assert.deepEqual(await checkPackageZip(blob({ 'site/index.html': 'x' })), { ok: true, kind: 'html5', files: 1 });
  assert.match(checkPackageEntries([{ name: '../evil.html', encrypted: false }]).why, /unsafe path/);
  assert.match(checkPackageEntries([{ name: 'C:/x.html', encrypted: false }]).why, /unsafe path/);
  assert.match(checkPackageEntries([{ name: 'a.html', encrypted: true }]).why, /password/);
  assert.equal(checkPackageEntries(null).ok, false);
});
